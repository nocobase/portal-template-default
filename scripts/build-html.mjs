import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as util from "node:util";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist", "client");
const rawIndexPath = path.join(distDir, "index.raw.html");
const indexPath = path.join(distDir, "index.html");

const startMarker = "<!-- nocobase-runtime-config:start -->";
const endMarker = "<!-- nocobase-runtime-config:end -->";

const parseEnv = (content) => {
  if (typeof util.parseEnv === "function") return util.parseEnv(content);

  const parsed = {};
  const linePattern =
    /^\s*(?:export\s+)?([\w.-]+)\s*=\s*('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|[^#\r\n]*)?\s*(?:#.*)?$/;

  for (const line of content.split(/\r?\n/)) {
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

const expandEnvValue = (value, env) =>
  value.replace(/\\?\${?([A-Za-z_][A-Za-z0-9_]*)}?/g, (match, key) => {
    if (match.startsWith("\\")) return match.slice(1);
    return env[key] ?? "";
  });

const getModeAlias = (mode) => {
  if (mode === "local" || mode === "development") return "dev";
  if (mode === "production") return "prod";
  return mode;
};

const getEnvFilesForMode = (scope, mode) =>
  [path.resolve(rootDir, ".."), rootDir].map((dir) =>
    path.join(dir, `.env.${scope}.${getModeAlias(mode)}`)
  );

const normalizeName = (value) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || undefined;

const readEnvFiles = (scope, mode) => {
  const env = {};

  for (const envFile of getEnvFilesForMode(scope, mode)) {
    if (!fs.existsSync(envFile)) continue;
    Object.assign(env, parseEnv(fs.readFileSync(envFile, "utf8")));
  }

  const expansionEnv = { ...env, ...process.env };
  for (const [key, value] of Object.entries(env)) {
    env[key] = expandEnvValue(value, expansionEnv);
  }

  return env;
};

const pickClientEnvConfig = (env) =>
  Object.fromEntries(
    [
      "API_CLIENT_STORAGE_PREFIX",
      "API_CLIENT_STORAGE_TYPE",
      "API_CLIENT_SHARE_TOKEN",
    ]
      .filter((key) => env[key])
      .map((key) => [key, env[key]])
  );

const getAppNameFromApiProxyTarget = (target) => {
  if (!target) return undefined;

  try {
    const pathname = new URL(target, "http://localhost").pathname;
    const match = pathname.match(/\/api\/__app\/([^/?#]+)(?:[/?#]|$)/);
    return match?.[1] ? decodeURIComponent(match[1]) : undefined;
  } catch {
    return undefined;
  }
};

const deriveWebSocketUrlFromApiUrl = (apiUrl) => {
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

const readServerEnv = (name) => {
  const mode = process.env.MODE || "production";
  const env = readEnvFiles("server", mode);
  const appName =
    normalizeName(env.NOCOBASE_APP_NAME) ??
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
  const serverEnv = {
    ...env,
    NOCOBASE_APP_NAME: appName,
    NOCOBASE_PORTAL_NAME: portalName,
    NOCOBASE_API_URL: env.NOCOBASE_API_URL || `${portalPublicPath}/api`,
    NOCOBASE_PORTAL_BASE: env.NOCOBASE_PORTAL_BASE || portalBase,
  };

  return name ? serverEnv[name] : serverEnv;
};

const readClientEnv = (name) => {
  const mode = process.env.MODE || "production";
  const serverEnv = readServerEnv();
  const clientConfig = pickClientEnvConfig(readEnvFiles("client", mode));
  const env = {
    NOCOBASE_APP_NAME: serverEnv.NOCOBASE_APP_NAME,
    NOCOBASE_PORTAL_NAME: serverEnv.NOCOBASE_PORTAL_NAME,
    NOCOBASE_API_URL: serverEnv.NOCOBASE_API_URL,
    NOCOBASE_PORTAL_BASE: serverEnv.NOCOBASE_PORTAL_BASE,
    NOCOBASE_WS_URL:
      serverEnv.NOCOBASE_WS_URL ||
      deriveWebSocketUrlFromApiUrl(serverEnv.NOCOBASE_API_URL),
    NOCOBASE_AUTHENTICATOR:
      serverEnv.NOCOBASE_AUTHENTICATOR || "basic",
    ...clientConfig,
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

const normalizePortalBase = (base) => {
  const normalized = String(base || "/").trim();
  if (!normalized || normalized === "/") return "/";
  return `/${normalized.replace(/^\/+|\/+$/g, "")}/`;
};

const getBasePrefix = (base) => base.replace(/\/$/, "");

const getRawPortalBase = (html) => {
  const moduleScriptPattern =
    /<script\s+[^>]*type=["']module["'][^>]*\bsrc=(["'])([^"']+)\1[^>]*>/i;
  const match = html.match(moduleScriptPattern);
  const src = match?.[2];

  if (!src?.startsWith("/")) return "/";

  const assetsIndex = src.indexOf("/assets/");
  if (assetsIndex === -1) return "/";

  return normalizePortalBase(src.slice(0, assetsIndex) || "/");
};

const rewriteHtmlFilePaths = (html, portalBase, rawPortalBase) => {
  const portalPrefix = getBasePrefix(portalBase);
  const rawPrefix = getBasePrefix(rawPortalBase);
  const attributePattern = /\b(src|href|content)=(["'])\/(?!\/)([^"']*)\2/g;

  if (!portalPrefix && !rawPrefix) return html;

  return html.replace(attributePattern, (match, attribute, quote, path) => {
    let value = `/${path}`;

    if (rawPrefix && value.startsWith(`${rawPrefix}/`)) {
      value = value.slice(rawPrefix.length) || "/";
    }

    if (!portalPrefix || value.startsWith(`${portalPrefix}/`)) {
      return `${attribute}=${quote}${value}${quote}`;
    }

    return `${attribute}=${quote}${portalPrefix}${value}${quote}`;
  });
};

const stripExistingRuntimeConfig = (html) => {
  const pattern = new RegExp(
    `${startMarker}[\\s\\S]*?${endMarker}\\s*`,
    "g"
  );
  return html.replace(pattern, "");
};

const clientEnv = readClientEnv();
const portalBase = normalizePortalBase(clientEnv.NOCOBASE_PORTAL_BASE);

const sourceIndexPath = fs.existsSync(rawIndexPath) ? rawIndexPath : indexPath;

if (!fs.existsSync(sourceIndexPath)) {
  throw new Error(
    `Missing ${path.relative(rootDir, indexPath)}. Run pnpm build:client first.`
  );
}

const runtimeConfig = `${startMarker}
<script>
  window.__NOCOBASE_PORTAL_ENV__ = ${JSON.stringify(clientEnv)};
</script>
${endMarker}
`;

const rawHtml = fs.readFileSync(sourceIndexPath, "utf8");
const html = rewriteHtmlFilePaths(
  stripExistingRuntimeConfig(rawHtml),
  portalBase,
  getRawPortalBase(rawHtml)
);

const moduleScriptPattern = /<script\s+[^>]*type=["']module["'][^>]*>/i;
const moduleScriptMatch = html.match(moduleScriptPattern);

if (moduleScriptMatch?.index === undefined) {
  throw new Error(
    `Could not find the module script in ${path.relative(rootDir, rawIndexPath)}.`
  );
}

const outputHtml = `${html.slice(0, moduleScriptMatch.index)}${runtimeConfig}${html.slice(moduleScriptMatch.index)}`;

fs.writeFileSync(indexPath, outputHtml);

console.log(
  `Generated ${path.relative(rootDir, indexPath)} from ${path.relative(
    rootDir,
    sourceIndexPath
  )}`
);
