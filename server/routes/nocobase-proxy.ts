import httpProxy from "http-proxy";
import type { IncomingMessage, ServerResponse } from "node:http";

const API_PREFIX = "/api";

export const isNocoBaseApiRequest = (path: string) =>
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

const getRequestOrigin = (request: IncomingMessage) => {
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

export function createNocoBaseProxyHandler(target?: string) {
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

  return async (request: IncomingMessage, response: ServerResponse) => {
    if (!target) {
      response.writeHead(502, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          error: "NOCOBASE_API_PROXY_TARGET is not configured",
        })
      );
      return;
    }

    request.url = createUpstreamRequestUrl(target, request.url);
    await new Promise<void>((resolve) => {
      const done = () => {
        response.off("finish", done);
        response.off("close", done);
        resolve();
      };

      response.once("finish", done);
      response.once("close", done);

      proxy.web(request, response, {
        target: new URL(target).origin,
      });
    });
  };
}
