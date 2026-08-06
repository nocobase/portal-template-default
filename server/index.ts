import { getRequestListener } from "@hono/node-server";
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { config } from "./config.js";
import {
  createNocoBaseProxyHandler,
  isNocoBaseApiRequest,
} from "./routes/nocobase-proxy.js";

const app = createApp();
const honoHandler = getRequestListener((request, env) =>
  app.fetch(request, env)
);
const nocoBaseProxyHandler = createNocoBaseProxyHandler(config.nocobaseApiTarget);

const shouldProxyToNocoBase = (requestUrl = "/", method = "GET") => {
  const pathname = new URL(requestUrl, "http://bff.local").pathname;
  return (
    isNocoBaseApiRequest(pathname) &&
    !(method === "POST" && pathname === "/api/users:create")
  );
};

const server = createServer(async (request, response) => {
  if (shouldProxyToNocoBase(request.url, request.method)) {
    const startedAt = Date.now();
    await nocoBaseProxyHandler(request, response);
    const elapsedMs = Date.now() - startedAt;
    console.info(`${request.method} ${request.url} ${response.statusCode} ${elapsedMs}ms`);
    return;
  }

  await honoHandler(request, response);
});

server.listen(config.port, config.host, () => {
  console.info(`BFF listening on http://${config.host}:${config.port}`);
});
