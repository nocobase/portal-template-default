import fs from "node:fs";
import path from "node:path";
import * as util from "node:util";
import { fileURLToPath } from "node:url";

export type EnvValues = Record<string, string>;

const configDir = path.dirname(fileURLToPath(import.meta.url));
const isDistRuntime = path.basename(path.resolve(configDir, "..")) === "dist";

const readValue = (source: EnvValues, name: string) => {
  const value = source[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const getModeAlias = (mode: string) => {
  if (mode === "local" || mode === "development") return "dev";
  if (mode === "production") return "prod";
  return mode;
};

const getEnvMode = () => {
  const mode =
    process.env.MODE ||
    process.env.NODE_ENV ||
    (isDistRuntime ? "prod" : "dev");
  return getModeAlias(mode);
};

const getServerEnvFiles = () => {
  const mode = getEnvMode();
  const envDirs = [
    path.resolve(configDir, "../.."),
    path.resolve(configDir, ".."),
  ];
  const envFiles = [`.env.server.${mode}`];

  return envDirs.flatMap((dir) =>
    envFiles.map((file) => path.join(dir, file))
  );
};

export const parseEnvFile = (file: string): EnvValues => {
  if (!fs.existsSync(file)) return {};
  const parseEnv = (
    util as typeof util & {
      parseEnv?: (content: string) => Record<string, string>;
    }
  ).parseEnv;

  if (typeof parseEnv === "function") {
    return Object.fromEntries(
      Object.entries(parseEnv(fs.readFileSync(file, "utf8"))).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    );
  }

  const parsed: EnvValues = {};
  const linePattern =
    /^\s*(?:export\s+)?([\w.-]+)\s*=\s*('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|[^#\r\n]*)?\s*(?:#.*)?$/;

  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(linePattern);
    if (!match) continue;

    const [, key, rawValue = ""] = match;
    const quote = rawValue[0];
    let value = rawValue.trim();

    if (
      (quote === '"' || quote === "'") &&
      value.endsWith(quote) &&
      value.length >= 2
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
  }

  return parsed;
};

const readServerEnvFiles = (): EnvValues => ({
  ...getServerEnvFiles().reduce<EnvValues>(
    (env, file) => ({
      ...env,
      ...parseEnvFile(file),
    }),
    {}
  )
});

const normalizePort = (value?: string) => {
  const port = Number.parseInt(String(value || ""), 10);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : 3000;
};

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

const normalizeServerEnv = (env: EnvValues): EnvValues => {
  const appName =
    readValue(env, "NOCOBASE_APP_NAME") ??
    getAppNameFromApiProxyTarget(readValue(env, "NOCOBASE_API_PROXY_TARGET")) ??
    "main";
  const portalName = readValue(env, "NOCOBASE_PORTAL_NAME") ?? "main";
  const portalPublicPath =
    appName === "main"
      ? `/portals/${portalName}`
      : `/apps/${appName}/portals/${portalName}`;

  return {
    ...env,
    NOCOBASE_APP_NAME: appName,
    NOCOBASE_PORTAL_NAME: portalName,
    NOCOBASE_API_URL:
      readValue(env, "NOCOBASE_API_URL") ?? `${portalPublicPath}/api`,
  };
};

export function readServerEnv(): EnvValues;
export function readServerEnv(name: string): string | undefined;
export function readServerEnv(name?: string) {
  const env = normalizeServerEnv(readServerEnvFiles());
  return name ? readValue(env, name) : env;
}

const getAppName = () => readServerEnv("NOCOBASE_APP_NAME") ?? "main";

const getPortalName = () => readServerEnv("NOCOBASE_PORTAL_NAME") ?? "main";

const getPortalPublicPath = () => {
  const appName = getAppName();
  const portalName = getPortalName();
  return appName === "main"
    ? `/portals/${portalName}`
    : `/apps/${appName}/portals/${portalName}`;
};

const getPortalApiUrl = () =>
  readServerEnv("NOCOBASE_API_URL") ?? `${getPortalPublicPath()}/api`;

const normalizeApiTarget = (target?: string) => {
  if (!target) return undefined;
  return target.replace(/\/+$/, "");
};

export const deriveWebSocketPathFromApiUrl = (apiUrl?: string) => {
  try {
    const { pathname } = new URL(apiUrl || "/api", "http://localhost");
    const apiPathMatch = pathname.match(/\/api(?:\/|$)/);
    const serverBasePath = apiPathMatch
      ? pathname.slice(0, apiPathMatch.index)
      : "";
    return `${serverBasePath}/ws`.replace(/\/+/g, "/");
  } catch {
    return "/ws";
  }
};

const normalizeWebSocketTarget = (target?: string, wsPath = "/ws") => {
  if (!target) return undefined;

  try {
    const url = new URL(target);
    if (url.protocol === "http:") url.protocol = "ws:";
    if (url.protocol === "https:") url.protocol = "wss:";
    if (!url.pathname || url.pathname === "/") {
      url.pathname = wsPath;
    }
    return url.toString();
  } catch {
    return undefined;
  }
};

const deriveProxyTarget = () => {
  const explicitTarget = normalizeApiTarget(
    readServerEnv("NOCOBASE_API_PROXY_TARGET")
  );
  if (explicitTarget) return explicitTarget;

  const apiUrl = getPortalApiUrl();
  if (!apiUrl || apiUrl.startsWith("/")) return undefined;

  try {
    return normalizeApiTarget(new URL(apiUrl).toString());
  } catch {
    return undefined;
  }
};

const deriveWebSocketProxyTarget = () => {
  const wsPath = deriveWebSocketPathFromApiUrl(getPortalApiUrl());
  const explicitTarget = normalizeWebSocketTarget(
    readServerEnv("NOCOBASE_WS_PROXY_TARGET") ??
      readServerEnv("NOCOBASE_WS_URL"),
    wsPath
  );
  if (explicitTarget) return explicitTarget;

  const apiProxyTarget = readServerEnv("NOCOBASE_API_PROXY_TARGET");
  if (apiProxyTarget) {
    try {
      const target = new URL(apiProxyTarget);
      const apiPathMatch = target.pathname.match(/\/api(?:\/__app\/([^/?#]+))?(?:\/|$)/);
      const serverBasePath = apiPathMatch
        ? target.pathname.slice(0, apiPathMatch.index)
        : "";
      const appName =
        readServerEnv("NOCOBASE_APP_NAME") ??
        (apiPathMatch?.[1] ? decodeURIComponent(apiPathMatch[1]) : undefined);
      target.pathname = `${serverBasePath}/ws`.replace(/\/+/g, "/");
      target.search = "";
      if (appName && appName !== "main") {
        target.searchParams.set("__appName", appName);
      }
      target.hash = "";
      return normalizeWebSocketTarget(target.toString(), target.pathname);
    } catch {
      return undefined;
    }
  }

  const apiUrl = getPortalApiUrl();
  if (!apiUrl || apiUrl.startsWith("/")) return undefined;

  try {
    const target = new URL(apiUrl);
    target.pathname = wsPath;
    target.search = "";
    target.hash = "";
    return normalizeWebSocketTarget(target.toString(), wsPath);
  } catch {
    return undefined;
  }
};

export const config = {
  host: process.env.DEV_SERVER_HOST?.trim() || "0.0.0.0",
  port: normalizePort(process.env.DEV_SERVER_PORT),
  portalApiUrl: getPortalApiUrl(),
  nocobaseApiTarget: deriveProxyTarget(),
  nocobaseWebSocketPath: deriveWebSocketPathFromApiUrl(getPortalApiUrl()),
  nocobaseWebSocketTarget: deriveWebSocketProxyTarget(),
};
