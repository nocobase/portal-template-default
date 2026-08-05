import type Koa from "koa";
import { config } from "../config.js";
import { NocoBaseUpstreamClient } from "../clients/nocobase-upstream-client.js";
import { PortalDataCapabilityClient } from "../clients/portal-data-capability-client.js";

export const portalDataMiddleware: Koa.Middleware = async (ctx, next) => {
  const upstream = new NocoBaseUpstreamClient({
    context: ctx,
    target: config.nocobaseApiTarget,
  });

  ctx.portalData = new PortalDataCapabilityClient(upstream);
  await next();
};
