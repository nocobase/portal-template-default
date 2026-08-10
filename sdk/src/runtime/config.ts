export type EnvValues = Record<string, string>;

const readValue = (source: Record<string, unknown>, name: string) => {
  const value = source[name];
  if (typeof value === "boolean") return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

export const normalizePortalBase = (base?: string) => {
  const normalized = String(base || "/").trim();
  if (!normalized || normalized === "/") return "/";
  return `/${normalized.replace(/^\/+|\/+$/g, "")}/`;
};

const readImportMetaEnv = (): EnvValues =>
  Object.fromEntries(
    Object.entries(import.meta.env ?? {}).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );

const readWindowEnv = (): EnvValues => {
  if (typeof window === "undefined") return {};

  const runtime = window as unknown as Record<string, unknown>;
  const env =
    runtime.__NOCOBASE_PORTAL_ENV__ &&
    typeof runtime.__NOCOBASE_PORTAL_ENV__ === "object"
      ? (runtime.__NOCOBASE_PORTAL_ENV__ as Record<string, unknown>)
      : {};

  return Object.fromEntries(
    Object.entries(env).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
};

const normalizeName = (value?: string) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || undefined;

const normalizeClientEnv = (env: EnvValues): EnvValues => {
  const appName = normalizeName(env.NOCOBASE_APP_NAME);
  const portalName = normalizeName(env.NOCOBASE_PORTAL_NAME);

  return {
    ...env,
    ...(appName ? { NOCOBASE_APP_NAME: appName } : {}),
    ...(portalName ? { NOCOBASE_PORTAL_NAME: portalName } : {}),
    API_CLIENT_STORAGE_PREFIX:
      env.API_CLIENT_STORAGE_PREFIX || "NOCOBASE_",
    API_CLIENT_STORAGE_TYPE:
      env.API_CLIENT_STORAGE_TYPE || "localStorage",
    API_CLIENT_SHARE_TOKEN:
      env.API_CLIENT_SHARE_TOKEN || "false",
  };
};

export function readClientEnv(): EnvValues;
export function readClientEnv(name: string): string | undefined;
export function readClientEnv(name?: string) {
  const env = normalizeClientEnv({
    ...readImportMetaEnv(),
    ...readWindowEnv(),
  });
  return name ? readValue(env, name) : env;
}

export const getPortalBase = () =>
  normalizePortalBase(
    readClientEnv("NOCOBASE_PORTAL_BASE") ?? readClientEnv("BASE_URL")
  );

export const getRuntimeApiUrl = () =>
  readClientEnv("NOCOBASE_API_URL");

export const resolveNocoBasePortalName = (portalBase: string) =>
  portalBase.match(/\/x\/(?:apps\/[^/]+\/)?([^/?#]+)(?:[/?#]|$)/)?.[1];

export const getNocoBasePortalName = () =>
  readClientEnv("NOCOBASE_PORTAL_NAME") ??
  resolveNocoBasePortalName(getPortalBase());

const getAppNameFromPortalBase = (base: string) =>
  base.match(/\/x\/apps\/([^/]+)(?:\/|$)/)?.[1];

const getAppNameFromApiUrl = (apiUrl?: string) =>
  apiUrl?.match(/\/api\/__app\/([^/?#]+)(?:[/?#]|$)/)?.[1];

export const resolveNocoBaseAppName = (portalBase: string, apiUrl?: string) =>
  getAppNameFromPortalBase(portalBase) ??
  getAppNameFromApiUrl(apiUrl) ??
  "main";

export const getNocoBaseAppName = () =>
  readClientEnv("NOCOBASE_APP_NAME") ??
  resolveNocoBaseAppName(getPortalBase(), getRuntimeApiUrl());

export const resolveNocoBaseServerUrl = (path = "/") => {
  if (typeof window === "undefined") return path;

  const apiUrl = new URL(
    getRuntimeApiUrl() || "/api",
    window.location.origin
  );
  const apiPathMatch = apiUrl.pathname.match(/\/api(?:\/|$)/);
  const serverBasePath = apiPathMatch
    ? apiUrl.pathname.slice(0, apiPathMatch.index)
    : "";

  return new URL(
    path.replace(/^\/+/, ""),
    `${apiUrl.origin}${serverBasePath}/`
  ).toString();
};

export const resolveNocoBaseSettingsUrl = () => {
  const appName = getNocoBaseAppName();
  const settingsPath =
    appName === "main"
      ? "/settings"
      : `/settings/apps/${encodeURIComponent(appName)}`;

  return resolveNocoBaseServerUrl(settingsPath);
};

export const resolvePortalUrl = (path = "/") => {
  if (typeof window === "undefined") return path;
  if (/^[a-z][a-z\d+.-]*:/i.test(path)) return path;

  const portalBase = getPortalBase();
  const relativePath = path.replace(/^\/+/, "");
  const portalUrl = new URL(
    relativePath,
    `${window.location.origin}${portalBase}`
  );
  const apiUrl = new URL(
    getRuntimeApiUrl() || "/api",
    window.location.origin
  );

  // Same-origin deployments should use a root-relative callback. Besides
  // avoiding unnecessary origin coupling, this remains compatible with older
  // SSO plugins that only accept NocoBase-local redirect paths. A standalone
  // Portal dev server keeps the absolute URL so the callback can return to
  // Vite instead of the deployed Portal route.
  if (apiUrl.origin === portalUrl.origin) {
    return `${portalUrl.pathname}${portalUrl.search}${portalUrl.hash}`;
  }
  return portalUrl.toString();
};
