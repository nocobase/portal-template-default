import { Hono, type Context } from "hono";
import { proxy } from "hono/proxy";

const createUpstreamRequestUrl = (target: string, requestUrl: string) => {
  const targetUrl = new URL(target);
  const targetPath = targetUrl.pathname.replace(/\/+$/, "");
  const parsedRequestUrl = new URL(requestUrl);
  const strippedPathname =
    parsedRequestUrl.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  const requestPath = strippedPathname.startsWith("/")
    ? strippedPathname
    : `/${strippedPathname}`;
  const pathname = `${targetPath}${requestPath}`.replace(/\/{2,}/g, "/");

  targetUrl.pathname = pathname;
  targetUrl.search = parsedRequestUrl.search;
  return targetUrl;
};

const getRequestOrigin = (headers: Headers) => {
  const origin = headers.get("origin");
  if (origin) {
    try {
      return new URL(origin);
    } catch {
      return undefined;
    }
  }

  const referer = headers.get("referer");
  if (referer) {
    try {
      return new URL(referer);
    } catch {
      return undefined;
    }
  }

  return undefined;
};

const createProxyHeaders = (request: Request, upstreamUrl: URL) => {
  const headers = new Headers(request.headers);
  const requestOrigin = getRequestOrigin(headers);

  headers.set("host", upstreamUrl.host);
  if (requestOrigin) {
    headers.set("x-forwarded-host", requestOrigin.host);
    headers.set("x-forwarded-proto", requestOrigin.protocol.replace(/:$/, ""));
  }

  if (request.url.includes("aiConversations:")) {
    headers.set("accept-encoding", "identity");
    headers.set("cache-control", "no-cache");
  }

  return headers;
};

const normalizeProxyResponse = (response: Response) => {
  const headers = new Headers(response.headers);
  const contentType = headers.get("content-type") ?? "";

  if (contentType.includes("text/event-stream")) {
    headers.delete("content-length");
    headers.set("cache-control", "no-cache, no-transform");
    headers.set("x-accel-buffering", "no");
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
};

export function createNocoBaseProxyRouter(target?: string) {
  const router = new Hono();

  const handler = async (ctx: Context) => {
    if (!target) {
      return ctx.json(
        { error: "NOCOBASE_API_PROXY_TARGET is not configured" },
        502
      );
    }

    const upstreamUrl = createUpstreamRequestUrl(target, ctx.req.url);
    const response = await proxy(upstreamUrl, {
      raw: ctx.req.raw,
      headers: createProxyHeaders(ctx.req.raw, upstreamUrl),
    });

    return normalizeProxyResponse(response);
  };

  router.all("/", handler);
  router.all("/*", handler);

  return router;
}
