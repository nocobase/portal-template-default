import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { createStandaloneRuntimeContext } from "./runtime.js";
import { createWebSocketUpgradeHandler } from "./websocket-proxy.js";

const runtime = createStandaloneRuntimeContext();
const app = createApp({ runtime });

const server = serve({
  fetch: app.fetch,
  hostname: config.host,
  port: config.port,
}, () => {
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
