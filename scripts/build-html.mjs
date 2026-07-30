import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const rawIndexPath = path.join(distDir, "index.raw.html");
const indexPath = path.join(distDir, "index.html");

const startMarker = "<!-- nocobase-runtime-config:start -->";
const endMarker = "<!-- nocobase-runtime-config:end -->";

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

const portalBase = normalizePortalBase(process.env.NOCOBASE_PORTAL_BASE);
const apiUrl = String(process.env.NOCOBASE_API_URL || "/api").trim() || "/api";
const storagePrefix =
  String(process.env.API_CLIENT_STORAGE_PREFIX || "NOCOBASE_").trim() ||
  "NOCOBASE_";
const storageType =
  String(process.env.API_CLIENT_STORAGE_TYPE || "localStorage").trim() ||
  "localStorage";
const shareToken = /^true$/i.test(
  String(process.env.API_CLIENT_SHARE_TOKEN || "false").trim()
);

if (!fs.existsSync(rawIndexPath)) {
  throw new Error(
    `Missing ${path.relative(rootDir, rawIndexPath)}. Run pnpm build first.`
  );
}

const runtimeConfig = `${startMarker}
<script>
  window.NOCOBASE_PORTAL_BASE = ${JSON.stringify(portalBase)};
  window.NOCOBASE_API_URL = ${JSON.stringify(apiUrl)};
  window.__nocobase_api_client_storage_prefix__ = ${JSON.stringify(storagePrefix)};
  window.__nocobase_api_client_storage_type__ = ${JSON.stringify(storageType)};
  window.__nocobase_api_client_share_token__ = ${JSON.stringify(shareToken)};
</script>
${endMarker}
`;

const rawHtml = fs.readFileSync(rawIndexPath, "utf8");
const html = rewriteHtmlFilePaths(
  stripExistingRuntimeConfig(rawHtml),
  portalBase,
  getRawPortalBase(rawHtml)
);

const moduleScriptPattern = /<script\s+[^>]*type=["']module["'][^>]*>/i;
const moduleScriptMatch = html.match(moduleScriptPattern);

if (moduleScriptMatch?.index === undefined) {
  throw new Error("Could not find the module script in dist/index.raw.html.");
}

const outputHtml = `${html.slice(0, moduleScriptMatch.index)}${runtimeConfig}${html.slice(moduleScriptMatch.index)}`;

fs.writeFileSync(indexPath, outputHtml);

console.log(
  `Generated ${path.relative(rootDir, indexPath)} from ${path.relative(
    rootDir,
    rawIndexPath
  )}`
);
