import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import { randomUUID } from "node:crypto";
import type {
  AppHealthResponse,
  BffDemoResponse,
  BffEchoRequest,
  BffEchoResponse,
} from "../../shared/api.js";

const appApi = new Router({ prefix: "/_app/api" });

appApi.use(bodyParser());

appApi.get("/health", (ctx) => {
  ctx.body = {
    ok: true,
    service: "bff",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  } satisfies AppHealthResponse;
});

appApi.get("/demo", (ctx) => {
  ctx.body = {
    ok: true,
    message: "Hello from the Koa BFF.",
    method: ctx.method,
    path: ctx.path,
    timestamp: new Date().toISOString(),
    requestId: ctx.get("x-request-id") || randomUUID(),
    server: {
      node: process.version,
      uptime: process.uptime(),
    },
  } satisfies BffDemoResponse;
});

appApi.post("/demo/echo", (ctx) => {
  const body = ctx.request.body as Partial<BffEchoRequest> | undefined;
  const message =
    typeof body?.message === "string" && body.message.trim()
      ? body.message.trim()
      : "No message provided";

  ctx.body = {
    ok: true,
    message: "The Koa BFF received your message.",
    method: ctx.method,
    path: ctx.path,
    timestamp: new Date().toISOString(),
    requestId: ctx.get("x-request-id") || randomUUID(),
    server: {
      node: process.version,
      uptime: process.uptime(),
    },
    echo: {
      message,
    },
    receivedHeaders: {
      userAgent: ctx.get("user-agent") || undefined,
      referer: ctx.get("referer") || undefined,
    },
  } satisfies BffEchoResponse;
});

export const appApiRouter = new Router();

appApiRouter.use(appApi.routes(), appApi.allowedMethods());
