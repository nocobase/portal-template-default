import fs from "node:fs";
import path from "node:path";
import * as util from "node:util";

const rootDir = process.cwd();

const getEnvMode = () => {
  const mode = process.env.MODE || process.env.NODE_ENV || "development";
  return mode === "local" ? "development" : mode;
};

const getEnvFiles = () => {
  const mode = getEnvMode();
  return [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`].map(
    (file) => path.join(rootDir, file)
  );
};

const parseEnvFile = (file: string) => {
  if (!fs.existsSync(file)) return {};
  if (typeof util.parseEnv === "function") {
    return util.parseEnv(fs.readFileSync(file, "utf8"));
  }

  const parsed: Record<string, string> = {};
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

const loadEnvFiles = () => {
  for (const envFile of getEnvFiles()) {
    const parsed = parseEnvFile(envFile);

    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
};

loadEnvFiles();

const readEnv = (name: string) => {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const normalizeApiTarget = (target?: string) => {
  if (!target) return undefined;
  return target.replace(/\/+$/, "");
};

const deriveProxyTarget = () => {
  const explicitTarget = normalizeApiTarget(readEnv("NOCOBASE_API_PROXY_TARGET"));
  if (explicitTarget) return explicitTarget;

  const apiUrl = readEnv("NOCOBASE_API_URL");
  if (!apiUrl || apiUrl.startsWith("/")) return undefined;

  try {
    return normalizeApiTarget(new URL(apiUrl).toString());
  } catch {
    return undefined;
  }
};

export const config = {
  host: readEnv("APP_SERVER_HOST") ?? "0.0.0.0",
  port: Number(readEnv("APP_SERVER_PORT") ?? readEnv("PORT") ?? 3000),
  nocobaseApiTarget: deriveProxyTarget(),
};
