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

const readEnv = (name: string) => {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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

export const createStandaloneRuntimeContext = (): ServerRuntimeContext => ({
  mode: "standalone",
  appName: readEnv("NOCOBASE_APP_NAME") ?? readEnv("APP_NAME") ?? "main",
  portalName: readEnv("PORTAL_NAME") ?? readEnv("APP_NAME") ?? "main",
  basePath: readEnv("PORTAL_BASE_PATH") ?? "/",
});

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
