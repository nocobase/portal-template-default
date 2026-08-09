import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { createStandaloneRuntimeContext } from "./runtime.js";
import { createPortalLoggers } from "./services/logger.js";
import { createWebSocketUpgradeHandler } from "./websocket-proxy.js";

const runtime = createStandaloneRuntimeContext();
const loggers = createPortalLoggers(runtime);
const app = createApp({ loggers, runtime });

const server = serve({
  fetch: app.fetch,
  hostname: config.host,
  port: config.port,
}, () => {
  loggers.system.info(
    {
      host: config.host,
      port: config.port,
    },
    "Standalone Portal BFF listening"
  );
  console.info(`BFF listening on http://${config.host}:${config.port}`);
});

server.on(
  "upgrade",
  createWebSocketUpgradeHandler({
    runtime,
    target: config.nocobaseWebSocketTarget,
    wsPath: config.nocobaseWebSocketPath,
  })
);

const closeLoggers = () => {
  loggers.close();
};

process.once("exit", closeLoggers);
