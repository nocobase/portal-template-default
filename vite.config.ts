import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig, loadEnv, type ProxyOptions } from "vite";
import {
  portalRawIndexHtmlPlugin,
  portalSdkCompatibilityPlugin,
} from "@nocobase/portal-sdk/vite";

const portalTemplate = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "package.json"), "utf8")
) as { displayName: string; version: string };

const getDefaultProxyTarget = (apiUrl?: string) => {
  if (!apiUrl || apiUrl.startsWith("/")) return undefined;

  try {
    return new URL(apiUrl).origin;
  } catch {
    return undefined;
  }
};

const getNocoBaseProxyPath = (apiUrl?: string) => {
  if (!apiUrl) return "/api";
  if (apiUrl.startsWith("/")) return apiUrl;

  try {
    return new URL(apiUrl).pathname || "/api";
  } catch {
    return "/api";
  }
};

const getAppServerTarget = (url?: string, port?: string) => {
  const normalizedPort = String(port || "3000").trim() || "3000";
  const normalized = String(url || `http://localhost:${normalizedPort}`).trim();
  return normalized || "http://localhost:3000";
};

const normalizeBase = (base?: string) => {
  const normalized = String(base || "/").trim();
  if (!normalized || normalized === "/") return "/";
  return `/${normalized.replace(/^\/+|\/+$/g, "")}/`;
};

const normalizeProxyPath = (value: string) => {
  const normalized = `/${value.replace(/^\/+|\/+$/g, "")}`;
  return normalized === "/" ? "/api" : normalized;
};

const getWebSocketProxyTarget = (env: Record<string, string>) => {
  const target =
    env.NOCOBASE_WS_PROXY_TARGET ??
    env.NOCOBASE_WS_URL ??
    env.NOCOBASE_API_PROXY_TARGET ??
    getDefaultProxyTarget(env.NOCOBASE_API_URL);

  if (!target || target.startsWith("/")) return undefined;

  try {
    return new URL(target).origin;
  } catch {
    return undefined;
  }
};

const getPortalScopedWebSocketProxyPath = (apiUrl?: string) => {
  const apiPath = normalizeProxyPath(getNocoBaseProxyPath(apiUrl));
  const apiIndex = apiPath.lastIndexOf("/api");
  const basePath = apiIndex >= 0 ? apiPath.slice(0, apiIndex) : "";

  return normalizeProxyPath(`${basePath}/ws`);
};

const createRelativeNocoBaseApiProxy = (
  apiUrl: string | undefined,
  appServerTarget: string
): Record<string, ProxyOptions> => {
  if (!apiUrl?.startsWith("/")) return {};

  const proxyPath = normalizeProxyPath(getNocoBaseProxyPath(apiUrl));
  if (proxyPath === "/api") return {};

  return {
    [proxyPath]: {
      target: appServerTarget,
      changeOrigin: true,
    },
  };
};

const createPortalApiProxy = (
  apiUrl: string | undefined,
  appServerTarget: string
): Record<string, ProxyOptions> => {
  const proxyPath = `${normalizeProxyPath(getNocoBaseProxyPath(apiUrl))}/_portal`;
  return {
    [proxyPath]: {
      target: appServerTarget,
      changeOrigin: true,
    },
  };
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const appServerTarget = getAppServerTarget(
    env.APP_SERVER_URL,
    env.APP_SERVER_PORT ?? env.NOCOBASE_PORTAL_PORT
  );
  const proxyTarget = getDefaultProxyTarget(env.NOCOBASE_API_URL);
  const proxyOrigin = proxyTarget
    ? (() => {
        try {
          return new URL(proxyTarget).origin;
        } catch {
          return undefined;
        }
      })()
    : undefined;

  const portalBase = normalizeBase(env.NOCOBASE_PORTAL_BASE);
  const registrySourceRoot = path.resolve(__dirname, "./registry");
  const extensionsRoot = fs.existsSync(registrySourceRoot)
    ? registrySourceRoot
    : path.resolve(__dirname, "./client/extensions");
  const nocobaseProxyPath = getNocoBaseProxyPath(env.NOCOBASE_API_URL);
  const relativeNocoBaseApiProxy = createRelativeNocoBaseApiProxy(
    env.NOCOBASE_API_URL,
    appServerTarget
  );
  const portalApiProxy = createPortalApiProxy(
    env.NOCOBASE_API_URL,
    appServerTarget
  );
  const webSocketProxyPath = normalizeProxyPath(env.NOCOBASE_WS_PATH || "/ws");
  const portalScopedWebSocketProxyPath = getPortalScopedWebSocketProxyPath(
    env.NOCOBASE_API_URL
  );
  const webSocketProxyTarget = getWebSocketProxyTarget(env) ?? appServerTarget;
  const legacyNocoBaseProxy: Record<string, ProxyOptions> =
    proxyTarget && nocobaseProxyPath !== "/api"
      ? {
          [nocobaseProxyPath]: {
            target: proxyTarget,
            changeOrigin: true,
            secure: false,
            configure(proxy) {
              proxy.on("proxyReq", (proxyRequest, request) => {
                if (!request.url?.includes("aiConversations:")) return;
                proxyRequest.setHeader("accept-encoding", "identity");
                proxyRequest.setHeader("cache-control", "no-cache");
              });
              proxy.on("proxyRes", (proxyResponse) => {
                const contentType = String(
                  proxyResponse.headers["content-type"] ?? ""
                );
                if (!contentType.includes("text/event-stream")) return;
                delete proxyResponse.headers["content-length"];
                proxyResponse.headers["cache-control"] =
                  "no-cache, no-transform";
                proxyResponse.headers["x-accel-buffering"] = "no";
              });
            },
            headers: proxyOrigin
              ? {
                  origin: proxyOrigin,
                  referer: `${proxyOrigin}/`,
                }
              : undefined,
          },
        }
      : {};

  return {
    base: portalBase,
    define: {
      __PORTAL_TEMPLATE_NAME__: JSON.stringify(portalTemplate.displayName),
      __PORTAL_TEMPLATE_VERSION__: JSON.stringify(portalTemplate.version),
    },
    envPrefix: ["VITE_", "NOCOBASE_", "API_CLIENT_"],
    plugins: [
      portalSdkCompatibilityPlugin({ root: __dirname }),
      react(),
      tailwindcss(),
      portalRawIndexHtmlPlugin({ root: __dirname, base: portalBase }),
    ],
    resolve: {
      alias: {
        "@/extensions": extensionsRoot,
        "@shared": path.resolve(__dirname, "./shared"),
        "@": path.resolve(__dirname, "./client"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: appServerTarget,
          changeOrigin: true,
        },
        [webSocketProxyPath]: {
          target: webSocketProxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        [portalScopedWebSocketProxyPath]: {
          target: appServerTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        ...portalApiProxy,
        ...relativeNocoBaseApiProxy,
        ...legacyNocoBaseProxy,
      },
    },
  };
});
