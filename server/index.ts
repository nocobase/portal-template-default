import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { config } from "./config.js";

const app = createApp();

serve({
  fetch: app.fetch,
  hostname: config.host,
  port: config.port,
}, () => {
  console.info(`BFF listening on http://${config.host}:${config.port}`);
});
