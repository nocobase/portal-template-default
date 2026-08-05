import Koa from "koa";
import { config } from "./config.js";
import { nocobaseProxyInterceptorMiddleware } from "./middleware/nocobase-proxy-interceptor.js";
import { portalDataMiddleware } from "./middleware/portal-data.js";
import { appApiRouter } from "./routes/app-api.js";
import { healthRouter } from "./routes/health.js";
import { createNocoBaseProxy } from "./routes/nocobase-proxy.js";
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
  const app = new Koa();

  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      const status = getErrorStatus(error);
      ctx.status = status;
      ctx.body = { error: getErrorMessage(error, status) };
      ctx.app.emit("error", error, ctx);
    }
  });

  app.use(async (ctx, next) => {
    const startedAt = Date.now();
    await next();
    const elapsedMs = Date.now() - startedAt;
    console.info(`${ctx.method} ${ctx.url} ${ctx.status} ${elapsedMs}ms`);
  });

  app.use(healthRouter.routes());
  app.use(healthRouter.allowedMethods());
  app.use(portalDataMiddleware);
  app.use(usersRouter.routes());
  app.use(usersRouter.allowedMethods());
  app.use(appApiRouter.routes());
  app.use(appApiRouter.allowedMethods());
  app.use(nocobaseProxyInterceptorMiddleware);
  app.use(createNocoBaseProxy(config.nocobaseApiTarget));

  app.use((ctx) => {
    ctx.status = 404;
    ctx.body = { error: "Not Found" };
  });

  app.on("error", (error) => {
    console.error(error);
  });

  return app;
}
