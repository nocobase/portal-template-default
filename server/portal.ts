import type { Hono } from "hono";
import { createApp } from "./app.js";
import {
  createEmbeddedRuntimeContext,
  type PortalScope,
} from "./runtime.js";

export async function createPortal(scope: PortalScope): Promise<Hono<any>> {
  return createApp({
    runtime: createEmbeddedRuntimeContext(scope),
  });
}

export default createPortal;
