import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
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

  return {
    base: normalizeBase(env.NOCOBASE_PORTAL_BASE),
    envPrefix: ["VITE_", "NOCOBASE_"],
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
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
