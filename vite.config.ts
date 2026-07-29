import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig, loadEnv } from "vite";

const getDefaultProxyTarget = (apiUrl?: string) => {
  if (!apiUrl || apiUrl.startsWith("/")) return undefined;

  try {
    return new URL(apiUrl).origin;
  } catch {
    return undefined;
  }
};

const getProxyPath = (apiUrl?: string) => {
  if (!apiUrl) return "/api";
  if (apiUrl.startsWith("/")) return apiUrl;

  try {
    return new URL(apiUrl).pathname || "/api";
  } catch {
    return "/api";
  }
};

const normalizeBase = (base?: string) => {
  const normalized = String(base || "/").trim();
  if (!normalized || normalized === "/") return "/";
  return `/${normalized.replace(/^\/+|\/+$/g, "")}/`;
};

const getBasePrefix = (base: string) => base.replace(/\/$/, "");

const defaultRuntimeConfig = `<!-- nocobase-runtime-config:start -->
<script>
  window.NOCOBASE_PORTAL_BASE = "/";
  window.NOCOBASE_API_URL = "/api";
  window.__nocobase_api_client_storage_prefix__ = window.__nocobase_api_client_storage_prefix__ ?? "NOCOBASE_";
  window.__nocobase_api_client_storage_type__ = window.__nocobase_api_client_storage_type__ ?? "localStorage";
  window.__nocobase_api_client_share_token__ = window.__nocobase_api_client_share_token__ ?? false;
</script>
<!-- nocobase-runtime-config:end -->
`;

const stripBaseFromIndexHtml = (html: string, base: string) => {
  const basePrefix = getBasePrefix(base);
  if (!basePrefix) return html;

  const attributePattern = /\b(src|href|content)=(["'])\/(?!\/)([^"']*)\2/g;

  return html.replace(attributePattern, (match, attribute, quote, path) => {
    const value = `/${path}`;
    if (!value.startsWith(`${basePrefix}/`)) return match;
    return `${attribute}=${quote}${value.slice(basePrefix.length) || "/"}${quote}`;
  });
};

const copyRawIndexHtmlPlugin = (base: string) => ({
  name: "copy-raw-index-html",
  closeBundle() {
    const distDir = path.resolve(__dirname, "dist");
    const indexHtml = path.join(distDir, "index.html");
    const rawIndexHtml = path.join(distDir, "index.raw.html");

    if (fs.existsSync(indexHtml)) {
      const html = fs.readFileSync(indexHtml, "utf8");
      const rawHtml = stripBaseFromIndexHtml(html, base);
      const moduleScriptPattern =
        /<script\s+[^>]*type=["']module["'][^>]*>/i;
      const moduleScriptMatch = rawHtml.match(moduleScriptPattern);

      if (moduleScriptMatch?.index === undefined) {
        fs.writeFileSync(rawIndexHtml, rawHtml);
        return;
      }

      fs.writeFileSync(
        rawIndexHtml,
        `${rawHtml.slice(0, moduleScriptMatch.index)}${defaultRuntimeConfig}${rawHtml.slice(moduleScriptMatch.index)}`
      );
    }
  },
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
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
    : path.resolve(__dirname, "./src/extensions");

  return {
    base: portalBase,
    envPrefix: ["VITE_", "NOCOBASE_", "API_CLIENT_"],
    plugins: [react(), tailwindcss(), copyRawIndexHtmlPlugin(portalBase)],
    resolve: {
      alias: {
        "@/extensions": extensionsRoot,
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: proxyTarget
      ? {
          proxy: {
            [getProxyPath(env.NOCOBASE_API_URL)]: {
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
          },
        }
      : undefined,
  };
});
