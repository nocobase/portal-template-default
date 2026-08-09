import type { Hono } from "hono";
import { createApp } from "./app.js";
import {
  createEmbeddedRuntimeContext,
  type PortalScope,
} from "./runtime.js";
import {
  createPortalLoggers,
  registerLoggedDisposer,
} from "./services/logger.js";

export async function createPortal(scope: PortalScope): Promise<Hono<any>> {
  const runtime = createEmbeddedRuntimeContext(scope);
  const loggers = createPortalLoggers(runtime);

  loggers.system.info(
    {
      basePath: runtime.basePath,
      scopeId: scope.id,
      version: scope.version,
    },
    "Embedded Portal app created"
  );

  registerLoggedDisposer(
    scope,
    loggers,
    "portal pino loggers",
    () => {
      loggers.close();
    },
    { logCompletionBeforeDispose: true }
  );

  try {
    return createApp({
      loggers,
      runtime,
    });
  } catch (error) {
    loggers.system.error(
      {
        err: error,
        scopeId: scope.id,
        version: scope.version,
      },
      "Embedded Portal app failed to initialize"
    );
    throw error;
  }
}

export default createPortal;
