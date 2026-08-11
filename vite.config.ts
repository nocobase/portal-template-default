import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import * as util from "node:util";
import { defineConfig, type ProxyOptions } from "vite";
import {
  portalRawIndexHtmlPlugin,
  portalSdkCompatibilityPlugin,
} from "@nocobase/portal-sdk/vite";

const portalTemplate = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "package.json"), "utf8")
) as { displayName: string; version: string };
let clientEnvMode = process.env.MODE || process.env.NODE_ENV || "development";

const parseEnvFile = (file: string) => {
  if (!fs.existsSync(file)) return {};
  const parseEnv = (
    util as typeof util & {
      parseEnv?: (content: string) => Record<string, string>;
    }
  ).parseEnv;

  if (typeof parseEnv === "function") {
    return parseEnv(fs.readFileSync(file, "utf8"));
  }

  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) =>
        line.match(
          /^\s*(?:export\s+)?([\w.-]+)\s*=\s*('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|[^#\r\n]*)?\s*(?:#.*)?$/
        )
      )
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => {
        const key = match[1];
        const rawValue = match[2] ?? "";
        const quote = rawValue[0];
        let value = rawValue.trim();

        if (
          (quote === '"' || quote === "'") &&
          value.endsWith(quote) &&
          value.length >= 2
        ) {
          value = value.slice(1, -1);
        }

        return [key, value.replace(/\\n/g, "\n").replace(/\\r/g, "\r")];
      })
  );
};

const expandEnvValue = (value: string, env: Record<string, string>) =>
  value.replace(/\\?\${?([A-Za-z_][A-Za-z0-9_]*)}?/g, (match, key) => {
    if (match.startsWith("\\")) return match.slice(1);
    return env[key] ?? "";
  });

const getModeAlias = (mode: string) => {
  if (mode === "local" || mode === "development") return "dev";
  if (mode === "production") return "prod";
  return mode;
};

const readEnvFiles = (scope: "client" | "server", mode: string): Record<string, string> => {
  const modeAlias = getModeAlias(mode);
  const envDirs = [path.resolve(__dirname, ".."), __dirname];
  const env = envDirs.reduce<Record<string, string>>(
    (values, dir) => ({
      ...values,
      ...parseEnvFile(path.resolve(dir, `.env.${scope}.${modeAlias}`)),
    }),
    {}
  );
  const expansionEnv = {
    ...env,
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    ),
  };

  for (const [key, value] of Object.entries(env)) {
    env[key] = expandEnvValue(value, expansionEnv);
  }

  return env;
};

const normalizeName = (value?: string) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || undefined;

const getAppNameFromApiProxyTarget = (target?: string) => {
  if (!target) return undefined;

  try {
    const pathname = new URL(target, "http://localhost").pathname;
    const match = pathname.match(/\/api\/__app\/([^/?#]+)(?:[/?#]|$)/);
    return match?.[1] ? decodeURIComponent(match[1]) : undefined;
  } catch {
    return undefined;
  }
};

const getAppPublicPathFromApiProxyTarget = (target?: string) => {
  if (!target) return "";

  try {
    const pathname = new URL(target, "http://localhost").pathname;
    const apiPathMatch = pathname.match(/\/api(?:\/|$)/);
    const publicPath = apiPathMatch
      ? pathname.slice(0, apiPathMatch.index)
      : "";

    return publicPath ? `/${publicPath.replace(/^\/+|\/+$/g, "")}` : "";
  } catch {
    return "";
  }
};

const omitGeneratedServerEnv = (env: Record<string, string>) => {
  const fileEnv = { ...env };
  delete fileEnv.NOCOBASE_APP_NAME;
  delete fileEnv.NOCOBASE_API_URL;
  delete fileEnv.NOCOBASE_PORTAL_BASE;
  delete fileEnv.NOCOBASE_WS_URL;
  delete fileEnv.NOCOBASE_AUTHENTICATOR;
  delete fileEnv.NOCOBASE_WS_PROXY_TARGET;
  delete fileEnv.PORTAL_BASE_PATH;
  return fileEnv;
};

const pickClientEnvConfig = (env: Record<string, string>) =>
  Object.fromEntries(
    [
      "API_CLIENT_STORAGE_PREFIX",
      "API_CLIENT_STORAGE_TYPE",
      "API_CLIENT_SHARE_TOKEN",
    ]
      .filter((key) => env[key])
      .map((key) => [key, env[key]])
  );

const deriveWebSocketUrlFromApiUrl = (apiUrl?: string) => {
  try {
    const url = new URL(apiUrl || "/api", "http://localhost");
    const apiPathMatch = url.pathname.match(/\/api(?:\/|$)/);
    const serverBasePath = apiPathMatch
      ? url.pathname.slice(0, apiPathMatch.index)
      : "";
    url.pathname = `${serverBasePath}/ws`.replace(/\/+/g, "/");
    url.search = "";
    url.hash = "";

    if (!apiUrl || apiUrl.startsWith("/")) {
      return `${url.pathname}${url.search}${url.hash}`;
    }

    if (url.protocol === "http:") url.protocol = "ws:";
    if (url.protocol === "https:") url.protocol = "wss:";
    return url.toString();
  } catch {
    return "/ws";
  }
};

function readServerEnv(): Record<string, string>;
function readServerEnv(name: string): string | undefined;
function readServerEnv(name?: string) {
  const env = readEnvFiles("server", clientEnvMode);
  const appName =
    normalizeName(getAppNameFromApiProxyTarget(env.NOCOBASE_API_PROXY_TARGET)) ??
    "main";
  const portalName = normalizeName(env.NOCOBASE_PORTAL_NAME) ?? "main";
  const portalPublicPath =
    appName === "main"
      ? `/portals/${portalName}`
      : `/apps/${appName}/portals/${portalName}`;
  const portalBase =
    appName === "main"
      ? `/x/${portalName}`
      : `/x/apps/${appName}/${portalName}`;
  const appPublicPath = getAppPublicPathFromApiProxyTarget(
    env.NOCOBASE_API_PROXY_TARGET
  );
  const serverEnv = {
    ...omitGeneratedServerEnv(env),
    NOCOBASE_APP_NAME: appName,
    NOCOBASE_PORTAL_NAME: portalName,
    NOCOBASE_API_URL: `${appPublicPath}${portalPublicPath}/api`,
    NOCOBASE_PORTAL_BASE: `${appPublicPath}${portalBase}`,
  };

  return name ? serverEnv[name] : serverEnv;
}

function readClientEnv(): Record<string, string>;
function readClientEnv(name: string): string | undefined;
function readClientEnv(name?: string) {
  const serverEnv = readServerEnv();
  const env = {
    ...pickClientEnvConfig(readEnvFiles("client", clientEnvMode)),
    NOCOBASE_APP_NAME: serverEnv.NOCOBASE_APP_NAME,
    NOCOBASE_PORTAL_NAME: serverEnv.NOCOBASE_PORTAL_NAME,
    NOCOBASE_API_URL: serverEnv.NOCOBASE_API_URL,
    NOCOBASE_PORTAL_BASE: serverEnv.NOCOBASE_PORTAL_BASE,
    NOCOBASE_WS_URL: deriveWebSocketUrlFromApiUrl(serverEnv.NOCOBASE_API_URL),
    NOCOBASE_AUTHENTICATOR: "basic",
  };
  const clientEnv = {
    ...env,
    API_CLIENT_STORAGE_PREFIX:
      env.API_CLIENT_STORAGE_PREFIX || "NOCOBASE_",
    API_CLIENT_STORAGE_TYPE:
      env.API_CLIENT_STORAGE_TYPE || "localStorage",
    API_CLIENT_SHARE_TOKEN:
      env.API_CLIENT_SHARE_TOKEN || "false",
  };

  return name ? clientEnv[name] : clientEnv;
};

const getDevServerTarget = (url?: string, port?: string) => {
  const normalizedPort = String(port || "3000").trim() || "3000";
  const normalized = String(url || `http://localhost:${normalizedPort}`).trim();
  return normalized || "http://localhost:3000";
};

const getDefaultProxyTarget = (apiUrl?: string) => {
  if (!apiUrl || apiUrl.startsWith("/")) return undefined;

  try {
    return new URL(apiUrl).origin;
  } catch {
    return undefined;
  }
};

const getUrlOrigin = (value?: string) => {
  const target = getDefaultProxyTarget(value);
  if (!target) return undefined;

  try {
    return new URL(target).origin;
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

const getAppName = (env: Record<string, string>) =>
  String(env.NOCOBASE_APP_NAME || "main").trim() || "main";

const getPortalName = (env: Record<string, string>) =>
  String(env.NOCOBASE_PORTAL_NAME || "main").trim() || "main";

const getPortalPublicPath = (env: Record<string, string>) => {
  const appName = getAppName(env);
  const portalName = getPortalName(env);
  return appName === "main"
    ? `/portals/${portalName}`
    : `/apps/${appName}/portals/${portalName}`;
};

const getDefaultPortalBase = (env: Record<string, string>) => {
  const appName = getAppName(env);
  const portalName = getPortalName(env);
  return appName === "main"
    ? `/x/${portalName}`
    : `/x/apps/${appName}/${portalName}`;
};

const getPortalApiUrl = (env: Record<string, string>) =>
  String(env.NOCOBASE_API_URL || "").trim() ||
  `${getPortalPublicPath(env)}/api`;

const getPortalBase = (env: Record<string, string>) =>
  String(env.NOCOBASE_PORTAL_BASE || "").trim() || getDefaultPortalBase(env);

const normalizeBase = (base?: string) => {
  const normalized = String(base || "/").trim();
  if (!normalized || normalized === "/") return "/";
  return `/${normalized.replace(/^\/+|\/+$/g, "")}/`;
};

const normalizeProxyPath = (value: string) => {
  const normalized = `/${value.replace(/^\/+|\/+$/g, "")}`;
  return normalized === "/" ? "/api" : normalized;
};

const getPortalScopedWebSocketProxyPath = (apiUrl?: string) => {
  const apiPath = normalizeProxyPath(getNocoBaseProxyPath(apiUrl));
  const apiIndex = apiPath.lastIndexOf("/api");
  const basePath = apiIndex >= 0 ? apiPath.slice(0, apiIndex) : "";

  return normalizeProxyPath(`${basePath}/ws`);
};

const createRelativeNocoBaseApiProxy = (
  apiUrl: string | undefined,
  devServerTarget: string,
  headers?: ProxyOptions["headers"]
): Record<string, ProxyOptions> => {
  if (!apiUrl?.startsWith("/")) return {};

  const proxyPath = normalizeProxyPath(getNocoBaseProxyPath(apiUrl));
  if (proxyPath === "/api") return {};

  return {
    [proxyPath]: {
      target: devServerTarget,
      changeOrigin: true,
      headers,
    },
  };
};

const createPortalApiProxy = (
  apiUrl: string | undefined,
  devServerTarget: string,
  headers?: ProxyOptions["headers"]
): Record<string, ProxyOptions> => {
  const proxyPath = `${normalizeProxyPath(getNocoBaseProxyPath(apiUrl))}/_portal`;
  return {
    [proxyPath]: {
      target: devServerTarget,
      changeOrigin: true,
      headers,
    },
  };
};

const createProxyOriginHeaders = (origin?: string): ProxyOptions["headers"] =>
  origin
    ? {
        origin,
        referer: `${origin}/`,
      }
    : undefined;

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  clientEnvMode = mode;
  const env = readClientEnv();
  const portalApiUrl = getPortalApiUrl(env);
  const portalBase = normalizeBase(getPortalBase(env));
  const devServerTarget = getDevServerTarget(
    process.env.DEV_SERVER_URL,
    process.env.DEV_SERVER_PORT
  );
  const nocoBaseApiProxyTarget = readServerEnv("NOCOBASE_API_PROXY_TARGET");
  const proxyTarget = getDefaultProxyTarget(portalApiUrl);
  const proxyOrigin =
    getUrlOrigin(nocoBaseApiProxyTarget) ?? getUrlOrigin(portalApiUrl);
  const proxyOriginHeaders = createProxyOriginHeaders(proxyOrigin);

  const registrySourceRoot = path.resolve(__dirname, "./registry");
  const extensionsRoot = fs.existsSync(registrySourceRoot)
    ? registrySourceRoot
    : path.resolve(__dirname, "./client/extensions");
  const nocobaseProxyPath = getNocoBaseProxyPath(portalApiUrl);
  const relativeNocoBaseApiProxy = createRelativeNocoBaseApiProxy(
    portalApiUrl,
    devServerTarget,
    proxyOriginHeaders
  );
  const portalApiProxy = createPortalApiProxy(
    portalApiUrl,
    devServerTarget,
    proxyOriginHeaders
  );
  const portalScopedWebSocketProxyPath = getPortalScopedWebSocketProxyPath(
    portalApiUrl
  );
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
            headers: proxyOriginHeaders,
          },
        }
      : {};

  return {
    base: portalBase,
    build: {
      outDir: "dist/client",
      emptyOutDir: true,
    },
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
          target: devServerTarget,
          changeOrigin: true,
          headers: proxyOriginHeaders,
        },
        [portalScopedWebSocketProxyPath]: {
          target: devServerTarget,
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
