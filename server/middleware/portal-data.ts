import type { Context, MiddlewareHandler } from "hono";
import { config, readServerEnv } from "../config.js";
import { NocoBaseUpstreamClient } from "../clients/nocobase-upstream-client.js";
import { PortalDataCapabilityClient } from "../clients/portal-data-capability-client.js";
import type { ServerRuntimeContext } from "../runtime.js";

export type PortalDataEnv = {
  Variables: {
    portalData: PortalDataCapabilityClient;
  };
};

const getRuntime = (ctx: Context) =>
  ctx.get("runtime" as never) as ServerRuntimeContext | undefined;

export const createServerRequestContext = (ctx: Context) => ({
  getHeader: (name: string) => {
    const value = ctx.req.header(name);
    if (value || name.toLowerCase() !== "x-portal") return value;
    return ctx.req.param("portalName") || getRuntime(ctx)?.portalName;
  },
  setHeader: (name: string, value: string) => {
    ctx.header(name, value);
  },
});

const deriveEmbeddedTarget = (ctx: Context, runtime?: ServerRuntimeContext) => {
  if (runtime?.mode !== "embedded") return undefined;

  const appPort = readServerEnv("APP_PORT");
  const forwardedHost =
    ctx.req.header("x-forwarded-host") ||
    (appPort && Number.isInteger(Number(appPort))
      ? `127.0.0.1:${appPort}`
      : undefined);
  if (!forwardedHost) return undefined;

  const forwardedProto = ctx.req.header("x-forwarded-proto") || "http";
  return `${forwardedProto.replace(/:$/, "")}://${forwardedHost}/api`;
};

export const createPortalDataClient = (ctx: Context) => {
  const runtime = getRuntime(ctx);
  const upstream = new NocoBaseUpstreamClient({
    context: createServerRequestContext(ctx),
    target: config.nocobaseApiTarget ?? deriveEmbeddedTarget(ctx, runtime),
  });

  return new PortalDataCapabilityClient(upstream);
};

export const portalDataMiddleware: MiddlewareHandler<PortalDataEnv> = async (
  ctx,
  next
) => {
  ctx.set("portalData", createPortalDataClient(ctx));
  await next();
};
