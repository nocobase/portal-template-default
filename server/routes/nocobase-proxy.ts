import httpProxy from "http-proxy";
import type Koa from "koa";

const API_PREFIX = "/api";

const isApiRequest = (path: string) =>
  path === API_PREFIX || path.startsWith(`${API_PREFIX}/`);

const createUpstreamRequestUrl = (target: string, requestUrl = "/") => {
  const targetUrl = new URL(target);
  const targetPath = targetUrl.pathname.replace(/\/+$/, "");
  const parsedRequestUrl = new URL(requestUrl, "http://bff.local");
  const strippedPathname =
    parsedRequestUrl.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  const requestPath = strippedPathname.startsWith("/")
    ? strippedPathname
    : `/${strippedPathname}`;
  const pathname = `${targetPath}${requestPath}`.replace(/\/{2,}/g, "/");

  return `${pathname}${parsedRequestUrl.search}`;
};

const getHeaderValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const getRequestOrigin = (request: Koa.Request["req"]) => {
  const origin = getHeaderValue(request.headers.origin);
  if (origin) {
    try {
      return new URL(origin);
    } catch {
      return undefined;
    }
  }

  const referer = getHeaderValue(request.headers.referer);
  if (referer) {
    try {
      return new URL(referer);
    } catch {
      return undefined;
    }
  }

  return undefined;
};

export function createNocoBaseProxy(target?: string): Koa.Middleware {
  const proxy = httpProxy.createProxyServer({
    changeOrigin: true,
    secure: false,
    xfwd: false,
  });

  proxy.on("proxyReq", (proxyRequest, request) => {
    const requestOrigin = getRequestOrigin(request);
    if (requestOrigin) {
      proxyRequest.setHeader("x-forwarded-host", requestOrigin.host);
      proxyRequest.setHeader(
        "x-forwarded-proto",
        requestOrigin.protocol.replace(/:$/, "")
      );
    }

    if (!request.url?.includes("aiConversations:")) return;
    proxyRequest.setHeader("accept-encoding", "identity");
    proxyRequest.setHeader("cache-control", "no-cache");
  });

  proxy.on("proxyRes", (proxyResponse) => {
    const contentType = String(proxyResponse.headers["content-type"] ?? "");
    if (!contentType.includes("text/event-stream")) return;

    delete proxyResponse.headers["content-length"];
    proxyResponse.headers["cache-control"] = "no-cache, no-transform";
    proxyResponse.headers["x-accel-buffering"] = "no";
  });

  proxy.on("error", (_error, _request, response) => {
    if (!response || !("writeHead" in response) || response.headersSent) return;
    response.writeHead(502, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Bad Gateway" }));
  });

  return async (ctx, next) => {
    if (!isApiRequest(ctx.path)) {
      return next();
    }

    if (!target) {
      ctx.status = 502;
      ctx.body = {
        error: "NOCOBASE_API_PROXY_TARGET is not configured",
      };
      return;
    }

    ctx.respond = false;
    ctx.req.url = createUpstreamRequestUrl(target, ctx.req.url);
    await new Promise<void>((resolve) => {
      const done = () => {
        ctx.res.off("finish", done);
        ctx.res.off("close", done);
        resolve();
      };

      ctx.res.once("finish", done);
      ctx.res.once("close", done);

      proxy.web(ctx.req, ctx.res, {
        target: new URL(target).origin,
      });
    });
  };
}
