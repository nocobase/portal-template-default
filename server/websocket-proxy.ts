import net from "node:net";
import tls from "node:tls";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";

import type { ServerRuntimeContext } from "./runtime.js";

interface WebSocketProxyOptions {
  runtime?: ServerRuntimeContext;
  target?: string;
  wsPath: string;
}

const normalizePath = (path: string) => {
  const normalized = `/${path.replace(/^\/+|\/+$/g, "")}`;
  return normalized === "/" ? "/ws" : normalized;
};

const stripTrailingSlash = (path: string) => path.replace(/\/+$/, "") || "/";

const getAcceptedPaths = (runtime: ServerRuntimeContext | undefined, wsPath: string) => {
  const normalizedWsPath = normalizePath(wsPath);
  const basePath = stripTrailingSlash(runtime?.basePath ?? "/");
  const paths = new Set([normalizedWsPath]);

  if (basePath !== "/") {
    paths.add(`${basePath}${normalizedWsPath}`);
  }

  return paths;
};

const isWebSocketUpgrade = (req: IncomingMessage) =>
  req.headers.upgrade?.toLowerCase() === "websocket" &&
  req.headers.connection?.toLowerCase().includes("upgrade");

const writeUpgradeError = (socket: Duplex, status: number, message: string) => {
  socket.write(
    `HTTP/1.1 ${status} ${message}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`
  );
  socket.destroy();
};

const createProxyHeaders = (req: IncomingMessage, targetUrl: URL) => {
  const lines = [`Host: ${targetUrl.host}`];
  const skippedHeaders = new Set(["host", "x-forwarded-host", "x-forwarded-proto"]);

  for (let index = 0; index < req.rawHeaders.length; index += 2) {
    const name = req.rawHeaders[index];
    const value = req.rawHeaders[index + 1];
    if (!name || skippedHeaders.has(name.toLowerCase())) continue;
    lines.push(`${name}: ${value ?? ""}`);
  }

  const originalHost = req.headers.host;
  if (originalHost) lines.push(`X-Forwarded-Host: ${originalHost}`);
  lines.push(`X-Forwarded-Proto: ${targetUrl.protocol === "wss:" ? "https" : "http"}`);

  return lines;
};

const createTargetUrl = (target: string, requestUrl: string) => {
  const targetUrl = new URL(target);
  const parsedRequestUrl = new URL(requestUrl, "http://localhost");

  targetUrl.search = parsedRequestUrl.search;
  return targetUrl;
};

export const createWebSocketUpgradeHandler = ({
  runtime,
  target,
  wsPath,
}: WebSocketProxyOptions) => {
  const acceptedPaths = getAcceptedPaths(runtime, wsPath);

  return (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    if (!acceptedPaths.has(pathname)) {
      writeUpgradeError(socket, 404, "Not Found");
      return;
    }

    if (!isWebSocketUpgrade(req)) {
      writeUpgradeError(socket, 400, "Bad Request");
      return;
    }

    if (!target) {
      writeUpgradeError(socket, 502, "Bad Gateway");
      return;
    }

    const targetUrl = createTargetUrl(target, req.url ?? "/");
    const isSecure = targetUrl.protocol === "wss:" || targetUrl.protocol === "https:";
    const port = Number(targetUrl.port || (isSecure ? 443 : 80));
    const proxySocket = isSecure
      ? tls.connect({ host: targetUrl.hostname, port, servername: targetUrl.hostname })
      : net.connect({ host: targetUrl.hostname, port });

    proxySocket.once("connect", () => {
      const targetPath = `${targetUrl.pathname || "/"}${targetUrl.search}`;
      proxySocket.write(
        `${req.method ?? "GET"} ${targetPath} HTTP/${req.httpVersion}\r\n${createProxyHeaders(
          req,
          targetUrl
        ).join("\r\n")}\r\n\r\n`
      );
      if (head.length) proxySocket.write(head);
      socket.pipe(proxySocket).pipe(socket);
    });

    proxySocket.once("error", () => {
      if (!socket.destroyed) writeUpgradeError(socket, 502, "Bad Gateway");
    });

    socket.once("error", () => proxySocket.destroy());
    socket.once("close", () => proxySocket.destroy());
  };
};
