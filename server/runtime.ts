import { readServerEnv } from "./config.js";

export type ServerRunMode = "standalone" | "embedded";

export type PortalDisposer = () => void | Promise<void>;

export interface PortalScope {
  readonly id: string;
  readonly version: number;
  readonly basePath: string;
  readonly signal: AbortSignal;
  readonly appName?: string;
  readonly portalName?: string;
  readonly rootDir?: string;
  readonly dataDir?: string;
  readonly config?: unknown;
  registerDisposer(name: string, dispose: PortalDisposer): void;
  onBeforeDestroy(handler: () => void | Promise<void>): () => void;
}

export interface ServerRuntimeContext {
  readonly mode: ServerRunMode;
  readonly appName: string;
  readonly portalName: string;
  readonly basePath: string;
  readonly signal?: AbortSignal;
  readonly scope?: PortalScope;
}

const getAppNameFromApiProxyTarget = () => {
  const target = readServerEnv("NOCOBASE_API_PROXY_TARGET");
  if (!target) return undefined;

  try {
    const pathname = new URL(target, "http://localhost").pathname;
    const match = pathname.match(/\/api\/__app\/([^/?#]+)(?:[/?#]|$)/);
    return match?.[1] ? decodeURIComponent(match[1]) : undefined;
  } catch {
    return undefined;
  }
};

const getAppName = () =>
  readServerEnv("NOCOBASE_APP_NAME") ??
  getAppNameFromApiProxyTarget() ??
  "main";

const getPortalName = () =>
  readServerEnv("NOCOBASE_PORTAL_NAME") ?? "main";

const getPortalPublicPath = () => {
  const appName = getAppName();
  const portalName = getPortalName();
  return appName === "main"
    ? `/portals/${portalName}`
    : `/apps/${appName}/portals/${portalName}`;
};

const getPortalApiUrl = () =>
  readServerEnv("NOCOBASE_API_URL") ?? `${getPortalPublicPath()}/api`;

const normalizeBasePath = (value?: string) => {
  if (!value) return undefined;
  const normalized = `/${value.replace(/^\/+|\/+$/g, "")}`;
  return normalized === "/" ? "/" : normalized;
};

const deriveBasePathFromApiUrl = (apiUrl?: string) => {
  if (!apiUrl) return undefined;

  try {
    const pathname = new URL(apiUrl, "http://localhost").pathname;
    const match = pathname.match(/^(.*)\/api(?:\/)?$/);
    return normalizeBasePath(match?.[1] || "/");
  } catch {
    return undefined;
  }
};

const parseScopeId = (id: string) => {
  const [appName, portalName] = id.split(":");
  if (appName && portalName) {
    return { appName, portalName };
  }

  return {
    appName: "main",
    portalName: id || "main",
  };
};

export const createStandaloneRuntimeContext = (): ServerRuntimeContext => {
  const portalApiUrl = getPortalApiUrl();

  return {
    mode: "standalone",
    appName: getAppName(),
    portalName: getPortalName(),
    basePath:
      normalizeBasePath(readServerEnv("PORTAL_BASE_PATH")) ??
      deriveBasePathFromApiUrl(portalApiUrl) ??
      "/",
  };
};

export const createEmbeddedRuntimeContext = (
  scope: PortalScope
): ServerRuntimeContext => {
  const parsed = parseScopeId(scope.id);

  return {
    mode: "embedded",
    appName: scope.appName ?? parsed.appName,
    portalName: scope.portalName ?? parsed.portalName,
    basePath: scope.basePath,
    signal: scope.signal,
    scope,
  };
};
