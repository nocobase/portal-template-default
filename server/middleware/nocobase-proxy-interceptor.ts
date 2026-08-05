import bodyParser from "koa-bodyparser";
import type Koa from "koa";
import { NocoBaseUpstreamClient } from "../clients/nocobase-upstream-client.js";
import { config } from "../config.js";

const parseBody = bodyParser();
const USERS_CREATE_PATH = "/api/users:create";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isUsersCreateRequest = (ctx: Koa.Context) =>
  ctx.method === "POST" && ctx.path === USERS_CREATE_PATH;

const toSingleQueryValue = (value: unknown) => {
  if (Array.isArray(value)) return value[0];
  return value;
};

const getProxyQuery = (query: Koa.Context["query"]) => {
  const output: Record<string, string | number | boolean | null | undefined> = {};

  for (const [key, value] of Object.entries(query)) {
    const singleValue = toSingleQueryValue(value);
    if (
      typeof singleValue === "string" ||
      typeof singleValue === "number" ||
      typeof singleValue === "boolean" ||
      singleValue === null ||
      singleValue === undefined
    ) {
      output[key] = singleValue;
    }
  }

  return output;
};

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

const assertUsersCreateAllowed = (body: unknown, ctx: Koa.Context) => {
  const values = getUsersCreateValues(body);
  const email = values.email;

  if (typeof email === "string" && email.endsWith("@blocked.example")) {
    ctx.throw(400, "This email domain is blocked by Portal proxy interceptor");
  }
};

export const nocobaseProxyInterceptorMiddleware: Koa.Middleware = async (
  ctx,
  next
) => {
  if (!isUsersCreateRequest(ctx)) {
    await next();
    return;
  }

  await parseBody(ctx, async () => {});
  assertUsersCreateAllowed(ctx.request.body, ctx);

  const upstream = new NocoBaseUpstreamClient({
    context: ctx,
    target: config.nocobaseApiTarget,
  });

  ctx.set("x-portal-proxy-intercepted", "users:create");
  ctx.body = await upstream.request("users:create", {
    body: withUsersCreateDefaults(ctx.request.body),
    method: "POST",
    query: getProxyQuery(ctx.query),
  });
};
