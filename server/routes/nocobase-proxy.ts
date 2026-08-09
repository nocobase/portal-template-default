import { Hono, type Context } from "hono";
import { proxy } from "hono/proxy";
import type { ServerRuntimeContext } from "../runtime.js";

const stripRuntimeBasePath = (
  pathname: string,
  runtime?: ServerRuntimeContext
) => {
  const basePath = runtime?.basePath.replace(/\/+$/, "");
  if (!basePath || basePath === "/") return pathname;

  return pathname === basePath
    ? "/"
    : pathname.startsWith(`${basePath}/`)
      ? pathname.slice(basePath.length)
      : pathname;
};

const createUpstreamRequestUrl = (
  target: string,
  requestUrl: string,
  runtime?: ServerRuntimeContext
) => {
  const targetUrl = new URL(target);
  const targetPath = targetUrl.pathname.replace(/\/+$/, "");
  const parsedRequestUrl = new URL(requestUrl);
  const requestPathname = stripRuntimeBasePath(
    parsedRequestUrl.pathname,
    runtime
  );
  const strippedPathname = requestPathname.replace(/^\/api(?=\/|$)/, "") || "/";
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

const deriveEmbeddedTarget = (
  ctx: Context,
  runtime?: ServerRuntimeContext
) => {
  if (runtime?.mode !== "embedded") return undefined;

  const forwardedHost = ctx.req.header("x-forwarded-host");
  if (!forwardedHost) return undefined;

  const forwardedProto = ctx.req.header("x-forwarded-proto") || "http";
  return `${forwardedProto.replace(/:$/, "")}://${forwardedHost}/api`;
};

const resolveProxyTarget = (
  ctx: Context,
  target?: string,
  runtime?: ServerRuntimeContext
) => target ?? deriveEmbeddedTarget(ctx, runtime);

export function createNocoBaseProxyRouter(
  target?: string,
  runtime?: ServerRuntimeContext
) {
  const router = new Hono();

  const handler = async (ctx: Context) => {
    const proxyTarget = resolveProxyTarget(ctx, target, runtime);
    if (!proxyTarget) {
      return ctx.json(
        { error: "NOCOBASE_API_PROXY_TARGET is not configured" },
        502
      );
    }

    const upstreamUrl = createUpstreamRequestUrl(
      proxyTarget,
      ctx.req.url,
      runtime
    );
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
