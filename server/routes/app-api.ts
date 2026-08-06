import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import type {
  AppHealthResponse,
  BffDemoResponse,
  BffEchoRequest,
  BffEchoResponse,
} from "../../shared/api.js";

export const appApiRouter = new Hono();

appApiRouter.get("/health", (context) => {
  return context.json({
    ok: true,
    service: "bff",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  } satisfies AppHealthResponse);
});

appApiRouter.get("/demo", (context) => {
  return context.json({
    ok: true,
    message: "Hello from the Hono BFF.",
    method: context.req.method,
    path: new URL(context.req.url).pathname,
    timestamp: new Date().toISOString(),
    requestId: context.req.header("x-request-id") || randomUUID(),
    server: {
      node: process.version,
      uptime: process.uptime(),
    },
  } satisfies BffDemoResponse);
});

appApiRouter.post("/demo/echo", async (context) => {
  const body = (await context.req.json().catch(() => undefined)) as
    | Partial<BffEchoRequest>
    | undefined;
  const message =
    typeof body?.message === "string" && body.message.trim()
      ? body.message.trim()
      : "No message provided";

  return context.json({
    ok: true,
    message: "The Hono BFF received your message.",
    method: context.req.method,
    path: new URL(context.req.url).pathname,
    timestamp: new Date().toISOString(),
    requestId: context.req.header("x-request-id") || randomUUID(),
    server: {
      node: process.version,
      uptime: process.uptime(),
    },
    echo: {
      message,
    },
    receivedHeaders: {
      userAgent: context.req.header("user-agent"),
      referer: context.req.header("referer"),
    },
  } satisfies BffEchoResponse);
});
