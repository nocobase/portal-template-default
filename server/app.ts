import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { nocobaseProxyInterceptorRouter } from "./middleware/nocobase-proxy-interceptor.js";
import { appApiRouter } from "./routes/app-api.js";
import { healthRouter } from "./routes/health.js";
import { usersRouter } from "./routes/users.js";

const getErrorStatus = (error: unknown) => {
  if (!error || typeof error !== "object") return 500;
  const status = Number((error as { status?: unknown }).status);
  return Number.isInteger(status) && status >= 400 && status < 600 ? status : 500;
};

const getErrorMessage = (error: unknown, status: number) => {
  if (status >= 500 || !(error instanceof Error)) return "Internal Server Error";
  return error.message || "Request failed";
};

export function createApp() {
  const app = new Hono();

  app.onError((error, context) => {
    const status = getErrorStatus(error);
    console.error(error);

    return context.json(
      { error: getErrorMessage(error, status) },
      status as ContentfulStatusCode
    );
  });

  app.use(async (context, next) => {
    const startedAt = Date.now();
    await next();
    if (!context.error) {
      const elapsedMs = Date.now() - startedAt;
      console.info(
        `${context.req.method} ${new URL(context.req.url).pathname} ${context.res.status} ${elapsedMs}ms`
      );
    }
  });

  app.route("/", healthRouter);
  app.route("/_app/api/users", usersRouter);
  app.route("/_app/api", appApiRouter);
  app.route("/api", nocobaseProxyInterceptorRouter);

  app.notFound((context) => {
    return context.json({ error: "Not Found" }, 404);
  });

  return app;
}
