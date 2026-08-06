import type { Context } from "hono";
import { config } from "../config.js";
import { NocoBaseUpstreamClient } from "../clients/nocobase-upstream-client.js";
import { PortalDataCapabilityClient } from "../clients/portal-data-capability-client.js";

export const createServerRequestContext = (context: Context) => ({
  getHeader: (name: string) => context.req.header(name),
  setHeader: (name: string, value: string) => {
    context.header(name, value);
  },
});

export const createPortalDataClient = (context: Context) => {
  const upstream = new NocoBaseUpstreamClient({
    context: createServerRequestContext(context),
    target: config.nocobaseApiTarget,
  });

  return new PortalDataCapabilityClient(upstream);
};
