import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { config } from "./config.js";
import { nocobaseProxyInterceptor } from "./middleware/nocobase-proxy-interceptor.js";
import { appApiRouter } from "./routes/app-api.js";
import { healthRouter } from "./routes/health.js";
import { createLocalDataRouter } from "./routes/local-data.js";
import { createNocoBaseProxyRouter } from "./routes/nocobase-proxy.js";
import { usersRouter } from "./routes/users.js";
import type { ServerRuntimeContext } from "./runtime.js";
import { LocalRuntimeStore } from "./services/local-store.js";

export interface CreateAppOptions {
  runtime?: ServerRuntimeContext;
}

type ServerAppEnv = {
  Variables: {
    runtime: ServerRuntimeContext;
  };
};

const getErrorStatus = (error: unknown) => {
  if (!error || typeof error !== "object") return 500;
  const status = Number((error as { status?: unknown }).status);
  return Number.isInteger(status) && status >= 400 && status < 600 ? status : 500;
};

const getErrorMessage = (error: unknown, status: number) => {
  if (status >= 500 || !(error instanceof Error)) return "Internal Server Error";
  return error.message || "Request failed";
};

const getIncomingBasePath = (runtime?: ServerRuntimeContext) =>
  runtime?.scope ? "/" : runtime?.basePath ?? "/";

const createRuntimeApp = (
  runtime: ServerRuntimeContext | undefined,
  localStore: LocalRuntimeStore
) => {
  const app = new Hono<ServerAppEnv>();

  if (runtime) {
    app.use(async (ctx, next) => {
      ctx.set("runtime", runtime);
      await next();
    });
  }

  app.onError((error, ctx) => {
    const status = getErrorStatus(error);
    console.error(error);

    return ctx.json(
      { error: getErrorMessage(error, status) },
      status as ContentfulStatusCode
    );
  });

  app.use(async (ctx, next) => {
    const startedAt = Date.now();
    await next();
    if (!ctx.error) {
      const elapsedMs = Date.now() - startedAt;
      console.info(
        `${ctx.req.method} ${new URL(ctx.req.url).pathname} ${ctx.res.status} ${elapsedMs}ms`
      );
    }
  });

  app.route("/", healthRouter);
  app.route("/api/_portal/users", usersRouter);
  app.route("/api/_portal", createLocalDataRouter(localStore));
  app.route("/api/_portal", appApiRouter);
  app.use("/api/*", nocobaseProxyInterceptor);
  app.route("/api", createNocoBaseProxyRouter(config.nocobaseApiTarget, runtime));

  app.notFound((ctx) => {
    return ctx.json({ error: "Not Found" }, 404);
  });

  return app;
};

export function createApp(options: CreateAppOptions = {}) {
  const runtime = options.runtime;
  const localStore = new LocalRuntimeStore({ runtime });
  const app = createRuntimeApp(runtime, localStore);
  const mounted = new Hono<ServerAppEnv>();

  mounted.route(getIncomingBasePath(runtime), app);
  mounted.notFound((ctx) => {
    return ctx.json({ error: "Not Found" }, 404);
  });

  return mounted;
}
