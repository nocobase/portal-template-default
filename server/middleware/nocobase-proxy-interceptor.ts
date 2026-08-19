import type { Context, MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ServerRuntimeContext } from "../runtime.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getUsersCreateValues = (body: unknown) => {
  if (!isRecord(body)) return {};
  const values = body.values;
  return isRecord(values) ? values : body;
};

const withUsersCreateDefaults = (body: unknown) => {
  const baseBody = isRecord(body) ? body : {};
  const values = getUsersCreateValues(baseBody);
  const nextValues = {
    ...values,
    nickname:
      typeof values.nickname === "string" && values.nickname.trim()
        ? values.nickname
        : "Portal User",
  };

  if (isRecord(baseBody.values)) {
    return {
      ...baseBody,
      values: nextValues,
    };
  }

  return nextValues;
};

const assertUsersCreateAllowed = (body: unknown) => {
  const values = getUsersCreateValues(body);
  const email = values.email;

  if (typeof email === "string" && email.endsWith("@blocked.example")) {
    throw new HTTPException(400, {
      message: "This email domain is blocked by Portal proxy interceptor",
    });
  }
};

const replaceJsonRequestBody = (ctx: Context, body: unknown) => {
  const headers = new Headers(ctx.req.raw.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");

  ctx.req.raw = new Request(ctx.req.url, {
    body: JSON.stringify(body),
    headers,
    method: ctx.req.method,
    signal: ctx.req.raw.signal,
  });
  ctx.req.bodyCache = {};
};

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

const getRuntime = (ctx: Context) =>
  ctx.get("runtime" as never) as ServerRuntimeContext | undefined;

export const nocobaseProxyInterceptor: MiddlewareHandler = async (
  ctx,
  next
) => {
  const pathname = stripRuntimeBasePath(
    new URL(ctx.req.url).pathname,
    getRuntime(ctx)
  );
  if (ctx.req.method !== "POST" || pathname !== "/api/users:create") {
    await next();
    return;
  }

  const body = await ctx.req.json().catch(() => undefined);
  assertUsersCreateAllowed(body);
  replaceJsonRequestBody(ctx, withUsersCreateDefaults(body));

  ctx.header("x-portal-proxy-intercepted", "users:create");
  await next();
};
