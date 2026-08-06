import { Hono } from "hono";
import type { AppHealthResponse } from "../../shared/api.js";

export const healthRouter = new Hono();

healthRouter.get("/healthz", (context) => {
  return context.json({
    ok: true,
    service: "bff",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  } satisfies AppHealthResponse);
});
