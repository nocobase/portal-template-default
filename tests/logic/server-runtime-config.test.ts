import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import { readServerEnv } from "../../server/config";
import {
  createEmbeddedRuntimeContext,
  createStandaloneRuntimeContext,
  type PortalDisposer,
  type PortalScope,
} from "../../server/runtime";

const originalEnv = { ...process.env };
const testDir = path.dirname(fileURLToPath(import.meta.url));
const portalRoot = path.resolve(testDir, "../..");
const portalParent = path.resolve(portalRoot, "..");
const envFileNames = [".env.server.test"];
const envFileBackups = new Map<
  string,
  { existed: boolean; content?: string }
>();

afterEach(() => {
  process.env = { ...originalEnv };

  for (const [file, backup] of envFileBackups) {
    if (backup.existed) {
      fs.writeFileSync(file, backup.content ?? "");
    } else {
      fs.rmSync(file, { force: true });
    }
  }
  envFileBackups.clear();
});

const useEnvFiles = (files: Record<string, string>) => {
  process.env.MODE = "test";
  const envFiles = [portalParent, portalRoot].flatMap((dir) =>
    envFileNames.map((name) => path.join(dir, name))
  );

  for (const file of envFiles) {
    if (!envFileBackups.has(file)) {
      envFileBackups.set(
        file,
        fs.existsSync(file)
          ? { existed: true, content: fs.readFileSync(file, "utf8") }
          : { existed: false }
      );
    }
    fs.rmSync(file, { force: true });
  }

  for (const [file, content] of Object.entries(files)) {
    fs.writeFileSync(file, content);
  }
};

const createPortalScope = (): PortalScope => ({
  id: "sales:crm",
  version: 1,
  basePath: "/portals/crm",
  signal: new AbortController().signal,
  appName: "sales",
  portalName: "crm",
  registerDisposer: (_name: string, _dispose: PortalDisposer) => {},
  onBeforeDestroy: () => () => {},
});

describe("server runtime config", () => {
  it("reads env files from the config parent directories without registering them on process.env", () => {
    delete process.env.NOCOBASE_APP_NAME;
    delete process.env.NOCOBASE_PORTAL_NAME;
    delete process.env.PORTAL_LOG_LEVEL;
    useEnvFiles({
      [path.join(portalParent, ".env.server.test")]: [
        "NOCOBASE_PORTAL_NAME=shared",
        "PORTAL_LOG_LEVEL=info",
      ].join("\n"),
      [path.join(portalRoot, ".env.server.test")]: [
        "NOCOBASE_PORTAL_NAME=ops",
        "NOCOBASE_API_PROXY_TARGET=http://127.0.0.1:64074/api/__app/sales",
        "PORTAL_LOG_LEVEL=debug",
      ].join("\n"),
    });

    expect(readServerEnv("NOCOBASE_API_PROXY_TARGET")).toBe(
      "http://127.0.0.1:64074/api/__app/sales"
    );
    expect(readServerEnv("NOCOBASE_PORTAL_NAME")).toBe("ops");
    expect(readServerEnv("PORTAL_LOG_LEVEL")).toBe("debug");
    expect(process.env.NOCOBASE_APP_NAME).toBeUndefined();
    expect(process.env.NOCOBASE_PORTAL_NAME).toBeUndefined();
    expect(process.env.PORTAL_LOG_LEVEL).toBeUndefined();
  });

  it("does not mix process env values into env file values", () => {
    useEnvFiles({
      [path.join(portalRoot, ".env.server.test")]: [
        "NOCOBASE_PORTAL_NAME=from-file",
        "PORTAL_LOG_LEVEL=debug",
      ].join("\n"),
    });
    process.env.NOCOBASE_PORTAL_NAME = "from-process";
    process.env.PORTAL_LOG_LEVEL = "warn";

    expect(readServerEnv()).toMatchObject({
      NOCOBASE_PORTAL_NAME: "from-file",
      PORTAL_LOG_LEVEL: "debug",
    });
  });

  it("uses DEV server settings from process env instead of env files", async () => {
    useEnvFiles({
      [path.join(portalRoot, ".env.server.test")]: [
        "DEV_SERVER_HOST=127.0.0.2",
        "DEV_SERVER_PORT=3101",
      ].join("\n"),
    });
    delete process.env.DEV_SERVER_HOST;
    delete process.env.DEV_SERVER_PORT;

    vi.resetModules();
    const fileOnlyConfig = await import("../../server/config");
    expect(fileOnlyConfig.config).toMatchObject({
      host: "0.0.0.0",
      port: 3000,
    });

    process.env.DEV_SERVER_HOST = "127.0.0.1";
    process.env.DEV_SERVER_PORT = "3202";

    vi.resetModules();
    const processConfig = await import("../../server/config");
    expect(processConfig.config).toMatchObject({
      host: "127.0.0.1",
      port: 3202,
    });
  });

  it("creates standalone runtime context from env file values", () => {
    delete process.env.NOCOBASE_APP_NAME;
    delete process.env.NOCOBASE_PORTAL_NAME;
    delete process.env.NOCOBASE_API_URL;
    useEnvFiles({
      [path.join(portalRoot, ".env.server.test")]: [
        "NOCOBASE_API_PROXY_TARGET=http://127.0.0.1:64074/api/__app/sales",
        "NOCOBASE_PORTAL_NAME=ops",
      ].join("\n"),
    });

    expect(createStandaloneRuntimeContext()).toMatchObject({
      mode: "standalone",
      appName: "sales",
      portalName: "ops",
      basePath: "/apps/sales/portals/ops",
    });
  });

  it("uses the main app path when the API proxy target is not app-scoped", () => {
    delete process.env.NOCOBASE_APP_NAME;
    delete process.env.NOCOBASE_PORTAL_NAME;
    delete process.env.NOCOBASE_API_URL;
    useEnvFiles({
      [path.join(portalRoot, ".env.server.test")]: [
        "NOCOBASE_API_PROXY_TARGET=http://127.0.0.1:64074/api",
        "NOCOBASE_PORTAL_NAME=ops",
      ].join("\n"),
    });

    expect(createStandaloneRuntimeContext()).toMatchObject({
      mode: "standalone",
      appName: "main",
      portalName: "ops",
      basePath: "/portals/ops",
    });
  });

  it("derives config paths from an app-scoped API proxy target", async () => {
    delete process.env.NOCOBASE_APP_NAME;
    delete process.env.NOCOBASE_PORTAL_NAME;
    delete process.env.NOCOBASE_API_URL;
    useEnvFiles({
      [path.join(portalRoot, ".env.server.test")]: [
        "NOCOBASE_API_PROXY_TARGET=http://127.0.0.1:64074/api/__app/sales",
        "NOCOBASE_PORTAL_NAME=ops",
      ].join("\n"),
    });

    vi.resetModules();
    const { config } = await import("../../server/config");

    expect(config).toMatchObject({
      portalApiUrl: "/apps/sales/portals/ops/api",
      nocobaseApiTarget: "http://127.0.0.1:64074/api/__app/sales",
      nocobaseWebSocketPath: "/apps/sales/portals/ops/ws",
      nocobaseWebSocketTarget: "ws://127.0.0.1:64074/ws?__appName=sales",
    });
  });

  it("derives app name, websocket proxy target, and base path without server env overrides", async () => {
    delete process.env.NOCOBASE_APP_NAME;
    delete process.env.NOCOBASE_PORTAL_NAME;
    delete process.env.NOCOBASE_API_URL;
    useEnvFiles({
      [path.join(portalRoot, ".env.server.test")]: [
        "NOCOBASE_API_PROXY_TARGET=http://127.0.0.1:64074/api/__app/sales",
        "NOCOBASE_PORTAL_NAME=ops",
        "NOCOBASE_APP_NAME=ignored",
        "NOCOBASE_WS_PROXY_TARGET=ws://127.0.0.1:64074/ignored-ws",
        "PORTAL_BASE_PATH=/ignored",
      ].join("\n"),
    });

    expect(createStandaloneRuntimeContext()).toMatchObject({
      mode: "standalone",
      appName: "sales",
      portalName: "ops",
      basePath: "/apps/sales/portals/ops",
    });
    expect(readServerEnv("NOCOBASE_APP_NAME")).toBe("sales");
    expect(readServerEnv("NOCOBASE_WS_PROXY_TARGET")).toBeUndefined();
    expect(readServerEnv("PORTAL_BASE_PATH")).toBeUndefined();

    vi.resetModules();
    const { config } = await import("../../server/config");

    expect(config).toMatchObject({
      portalApiUrl: "/apps/sales/portals/ops/api",
      nocobaseWebSocketPath: "/apps/sales/portals/ops/ws",
      nocobaseWebSocketTarget: "ws://127.0.0.1:64074/ws?__appName=sales",
    });
  });

  it("keeps embedded runtime context based on the portal scope", () => {
    expect(createEmbeddedRuntimeContext(createPortalScope())).toMatchObject({
      mode: "embedded",
      appName: "sales",
      portalName: "crm",
      basePath: "/portals/crm",
    });
  });
});
