import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import type {
  AppHealthResponse,
  BffDemoResponse,
  BffEchoRequest,
  BffEchoResponse,
} from "../../shared/api.js";

export const appApiRouter = new Hono();

appApiRouter.get("/health", (ctx) => {
  return ctx.json({
    ok: true,
    service: "bff",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  } satisfies AppHealthResponse);
});

appApiRouter.get("/demo", (ctx) => {
  return ctx.json({
    ok: true,
    message: "Hello from the Hono BFF.",
    method: ctx.req.method,
    path: new URL(ctx.req.url).pathname,
    timestamp: new Date().toISOString(),
    requestId: ctx.req.header("x-request-id") || randomUUID(),
    server: {
      node: process.version,
      uptime: process.uptime(),
    },
  } satisfies BffDemoResponse);
});

appApiRouter.post("/demo/echo", async (ctx) => {
  const body = (await ctx.req.json().catch(() => undefined)) as
    | Partial<BffEchoRequest>
    | undefined;
  const message =
    typeof body?.message === "string" && body.message.trim()
      ? body.message.trim()
      : "No message provided";

  return ctx.json({
    ok: true,
    message: "The Hono BFF received your message.",
    method: ctx.req.method,
    path: new URL(ctx.req.url).pathname,
    timestamp: new Date().toISOString(),
    requestId: ctx.req.header("x-request-id") || randomUUID(),
    server: {
      node: process.version,
      uptime: process.uptime(),
    },
    echo: {
      message,
    },
    receivedHeaders: {
      userAgent: ctx.req.header("user-agent"),
      referer: ctx.req.header("referer"),
    },
  } satisfies BffEchoResponse);
});
