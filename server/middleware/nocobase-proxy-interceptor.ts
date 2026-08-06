import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { NocoBaseUpstreamClient } from "../clients/nocobase-upstream-client.js";
import { config } from "../config.js";
import { createServerRequestContext } from "./portal-data.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getProxyQuery = (searchParams: URLSearchParams) => {
  const output: Record<string, string | number | boolean | null | undefined> = {};

  for (const [key, value] of searchParams.entries()) {
    if (output[key] !== undefined) continue;
    output[key] = value;
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

const assertUsersCreateAllowed = (body: unknown) => {
  const values = getUsersCreateValues(body);
  const email = values.email;

  if (typeof email === "string" && email.endsWith("@blocked.example")) {
    throw new HTTPException(400, {
      message: "This email domain is blocked by Portal proxy interceptor",
    });
  }
};

export const nocobaseProxyInterceptorRouter = new Hono();

nocobaseProxyInterceptorRouter.post("/users:create", async (context) => {
  const body = await context.req.json().catch(() => undefined);
  assertUsersCreateAllowed(body);
  const upstream = new NocoBaseUpstreamClient({
    context: createServerRequestContext(context),
    target: config.nocobaseApiTarget,
  });

  context.header("x-portal-proxy-intercepted", "users:create");
  return context.json(await upstream.request("users:create", {
    body: withUsersCreateDefaults(body),
    method: "POST",
    query: getProxyQuery(new URL(context.req.url).searchParams),
  }));
});
