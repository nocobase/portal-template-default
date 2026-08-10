import spawn from "cross-spawn";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import * as util from "node:util";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const parseEnvFile = (file) => {
  if (!fs.existsSync(file)) return {};
  if (typeof util.parseEnv === "function") {
    return util.parseEnv(fs.readFileSync(file, "utf8"));
  }

  const parsed = {};
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

const loadEnvFiles = (scope, mode) =>
  [path.resolve(rootDir, ".."), rootDir].reduce(
    (env, dir) => ({
      ...env,
      ...parseEnvFile(path.join(dir, `.env.${scope}.${mode}`)),
    }),
    {}
  );

const normalizeName = (value) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || undefined;

const normalizePort = (value) => {
  const port = Number.parseInt(String(value || ""), 10);
  return Number.isInteger(port) && port > 0 && port <= 65535
    ? port
    : 3000;
};

const isPortAvailable = (port, host) =>
  new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });
    server.once("listening", () => {
      server.close(() => {
        resolve(true);
      });
    });
    server.listen({ host, port });
  });

const findAvailablePort = async (startPort, host) => {
  for (let port = startPort; port <= 65535; port += 1) {
    if (await isPortAvailable(port, host)) {
      if (port !== startPort) {
        console.info(
          `Port ${startPort} is in use, using ${port} for Portal dev server...`
        );
      }
      return String(port);
    }
  }

  throw new Error(`No available port found starting from ${startPort}.`);
};

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

const omitGeneratedServerEnv = (env) => {
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

const getPortalPublicPath = (appName, portalName) =>
  appName === "main"
    ? `/portals/${portalName}`
    : `/apps/${appName}/portals/${portalName}`;

const getPortalBase = (appName, portalName) =>
  appName === "main" ? `/x/${portalName}` : `/x/apps/${appName}/${portalName}`;

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
  const env = loadEnvFiles("server", "dev");
  const appName =
    normalizeName(getAppNameFromApiProxyTarget(env.NOCOBASE_API_PROXY_TARGET)) ??
    "main";
  const portalName = normalizeName(env.NOCOBASE_PORTAL_NAME) ?? "main";
  const serverEnv = {
    ...omitGeneratedServerEnv(env),
    NOCOBASE_APP_NAME: appName,
    NOCOBASE_PORTAL_NAME: portalName,
    NOCOBASE_API_URL: `${getPortalPublicPath(appName, portalName)}/api`,
  };

  return name ? serverEnv[name] : serverEnv;
};

const readClientEnv = (serverEnv, name) => {
  const clientConfig = pickClientEnvConfig(loadEnvFiles("client", "dev"));
  const env = {
    NOCOBASE_APP_NAME: serverEnv.NOCOBASE_APP_NAME,
    NOCOBASE_PORTAL_NAME: serverEnv.NOCOBASE_PORTAL_NAME,
    NOCOBASE_API_URL: serverEnv.NOCOBASE_API_URL,
    NOCOBASE_PORTAL_BASE:
      getPortalBase(serverEnv.NOCOBASE_APP_NAME, serverEnv.NOCOBASE_PORTAL_NAME),
    NOCOBASE_WS_URL: deriveWebSocketUrlFromApiUrl(serverEnv.NOCOBASE_API_URL),
    NOCOBASE_AUTHENTICATOR: "basic",
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

const devServerHost = String(process.env.DEV_SERVER_HOST || "0.0.0.0").trim();
const portalPort = await findAvailablePort(
  normalizePort(process.env.DEV_SERVER_PORT),
  devServerHost || "0.0.0.0"
);
const devServerEnv = {
  DEV_SERVER_URL: `http://localhost:${portalPort}`,
  DEV_SERVER_HOST: devServerHost || "0.0.0.0",
  DEV_SERVER_PORT: portalPort,
};
const serverFileEnv = readServerEnv();
const clientEnv = {
  ...process.env,
  ...readClientEnv(serverFileEnv),
  ...devServerEnv,
};
const serverEnv = { ...process.env, ...serverFileEnv, ...devServerEnv };

const commands = [
  {
    name: "client",
    command: "vite",
    args: ["--host", "0.0.0.0"],
    env: clientEnv,
  },
  {
    name: "server",
    command: "tsx",
    args: ["watch", "server/standalone.ts"],
    env: serverEnv,
  },
];

let isStopping = false;
let exitCode = 0;
let remaining = commands.length;

const children = commands.map(({ command, args, env, name }) => {
  const child = spawn(command, args, {
    cwd: rootDir,
    env,
    stdio: "inherit",
  });

  child.on("error", (error) => {
    console.error(`Failed to start ${name}: ${error.message}`);
    exitCode = 1;
    stopChildren("SIGTERM");
  });

  child.on("exit", (code, signal) => {
    remaining -= 1;

    if (!isStopping) {
      exitCode = code ?? (signal ? 1 : 0);
      stopChildren("SIGTERM");
    }

    if (remaining === 0) {
      process.exit(exitCode);
    }
  });

  return child;
});

function stopChildren(signal) {
  if (isStopping) return;
  isStopping = true;

  for (const child of children) {
    if (child.exitCode === null && !child.killed) {
      child.kill(signal);
    }
  }
}

process.on("SIGINT", () => {
  exitCode = 130;
  stopChildren("SIGINT");
});

process.on("SIGTERM", () => {
  exitCode = 143;
  stopChildren("SIGTERM");
});
