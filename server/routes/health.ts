import Router from "@koa/router";
import type { AppHealthResponse } from "../../shared/api.js";

export const healthRouter = new Router();

healthRouter.get("/healthz", (ctx) => {
  ctx.body = {
    ok: true,
    service: "bff",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  } satisfies AppHealthResponse;
});
