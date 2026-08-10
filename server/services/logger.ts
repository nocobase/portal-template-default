import fs from "node:fs";
import path from "node:path";
import pino, { type Logger } from "pino";
import type {
  PortalDisposer,
  PortalScope,
  ServerRuntimeContext,
} from "../runtime.js";

export interface PortalLoggers {
  request: Logger;
  system: Logger;
  close(): void;
}

type LoggedDisposerOptions = {
  logCompletionBeforeDispose?: boolean;
};

const getDateStamp = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const resolveLogRoot = (runtime?: ServerRuntimeContext) =>
  path.resolve(runtime?.scope?.rootDir ?? process.cwd(), "logs");

const createDestination = (
  runtime: ServerRuntimeContext | undefined,
  channel: "request" | "system"
) => {
  const mode = runtime?.mode ?? "standalone";
  const logDir = path.join(resolveLogRoot(runtime), mode);
  fs.mkdirSync(logDir, { recursive: true });

  return pino.destination({
    dest: path.join(logDir, `${channel}-${getDateStamp()}.log`),
    mkdir: true,
    sync: true,
  });
};

const createLogger = (
  runtime: ServerRuntimeContext | undefined,
  channel: "request" | "system"
) => {
  const mode = runtime?.mode ?? "standalone";
  return pino(
    {
      base: {
        appName: runtime?.appName ?? "main",
        channel,
        mode,
        portalName: runtime?.portalName ?? "main",
      },
      level: process.env.PORTAL_LOG_LEVEL || "info",
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    createDestination(runtime, channel)
  );
};

export const flushLogger = (logger: Logger) => {
  logger.flush();
};

export const createPortalLoggers = (
  runtime?: ServerRuntimeContext
): PortalLoggers => {
  const system = createLogger(runtime, "system");
  const request = createLogger(runtime, "request");

  return {
    request,
    system,
    close() {
      flushLogger(system);
      flushLogger(request);
    },
  };
};

export const registerLoggedDisposer = (
  scope: PortalScope | undefined,
  loggers: PortalLoggers | undefined,
  name: string,
  dispose: PortalDisposer,
  options: LoggedDisposerOptions = {}
) => {
  if (!scope || !loggers) return;

  loggers.system.info({ disposer: name }, "Portal disposer registered");
  scope.registerDisposer(name, async () => {
    const startedAt = Date.now();
    loggers.system.info({ disposer: name }, "Portal disposer started");

    try {
      if (options.logCompletionBeforeDispose) {
        loggers.system.info(
          { disposer: name, elapsedMs: Date.now() - startedAt },
          "Portal disposer completed"
        );
      }

      await dispose();

      if (!options.logCompletionBeforeDispose) {
        loggers.system.info(
          { disposer: name, elapsedMs: Date.now() - startedAt },
          "Portal disposer completed"
        );
      }
    } catch (error) {
      loggers.system.error(
        { disposer: name, elapsedMs: Date.now() - startedAt, err: error },
        "Portal disposer failed"
      );
      throw error;
    }
  });
};
