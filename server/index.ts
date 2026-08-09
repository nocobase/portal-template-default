import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { createStandaloneRuntimeContext } from "./runtime.js";

const app = createApp({
  runtime: createStandaloneRuntimeContext(),
});

serve({
  fetch: app.fetch,
  hostname: config.host,
  port: config.port,
}, () => {
  console.info(`BFF listening on http://${config.host}:${config.port}`);
});
