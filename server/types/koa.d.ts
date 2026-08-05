import type { PortalDataCapabilityClient } from "../clients/portal-data-capability-client.js";

declare module "koa" {
  interface DefaultContext {
    portalData: PortalDataCapabilityClient;
  }
}
