import type { Context, MiddlewareHandler } from "hono";
import { config } from "../config.js";
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

export const createPortalDataClient = (ctx: Context) => {
  const upstream = new NocoBaseUpstreamClient({
    context: createServerRequestContext(ctx),
    target: config.nocobaseApiTarget,
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
