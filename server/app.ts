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
import {
  createPortalLoggers,
  registerLoggedDisposer,
  type PortalLoggers,
} from "./services/logger.js";
import { LocalRuntimeStore } from "./services/local-store.js";

export interface CreateAppOptions {
  loggers?: PortalLoggers;
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

const useRequestLogging = (app: Hono<ServerAppEnv>, loggers: PortalLoggers) => {
  app.use(async (ctx, next) => {
    const startedAt = Date.now();
    let requestError: unknown;

    try {
      await next();
    } catch (error) {
      requestError = error;
      throw error;
    } finally {
      const elapsedMs = Date.now() - startedAt;
      const url = new URL(ctx.req.url);
      const status = requestError
        ? getErrorStatus(requestError)
        : ctx.res.status;
      const payload = {
        elapsedMs,
        err: requestError,
        method: ctx.req.method,
        path: url.pathname,
        requestId: ctx.req.header("x-request-id"),
        status,
      };

      if (status >= 500 || requestError) {
        loggers.request.error(payload, "Portal request failed");
      } else if (status >= 400) {
        loggers.request.warn(payload, "Portal request completed");
      } else {
        loggers.request.info(payload, "Portal request completed");
      }
    }
  });
};

const createRuntimeApp = (
  runtime: ServerRuntimeContext | undefined,
  localStore: LocalRuntimeStore,
  loggers: PortalLoggers
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
    loggers.system.error(
      {
        err: error,
        method: ctx.req.method,
        path: new URL(ctx.req.url).pathname,
        requestId: ctx.req.header("x-request-id"),
        status,
      },
      "Portal request failed"
    );

    return ctx.json(
      { error: getErrorMessage(error, status) },
      status as ContentfulStatusCode
    );
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
  const loggers = options.loggers ?? createPortalLoggers(runtime);
  const localStore = new LocalRuntimeStore({ loggers, runtime });
  const app = createRuntimeApp(runtime, localStore, loggers);
  const mounted = new Hono<ServerAppEnv>();

  useRequestLogging(mounted, loggers);

  if (!options.loggers) {
    registerLoggedDisposer(runtime?.scope, loggers, "portal pino loggers", () =>
      loggers.close()
    );
  }

  mounted.route(getIncomingBasePath(runtime), app);
  mounted.notFound((ctx) => {
    return ctx.json({ error: "Not Found" }, 404);
  });

  return mounted;
}
