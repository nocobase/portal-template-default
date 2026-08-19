import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createPortal } from "../../server/embedded";
import type { PortalDisposer, PortalScope } from "../../server/runtime";

const tempRoots: string[] = [];
const disposers: PortalDisposer[] = [];

const getDateStamp = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

afterEach(async () => {
  await drainDisposers();

  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

const drainDisposers = async () => {
  const activeDisposers = disposers.splice(0);

  for (const dispose of activeDisposers) {
    await dispose();
  }
};

const createScope = (rootDir: string): PortalScope => ({
  id: "main:main",
  version: 1,
  basePath: "/portals/main",
  signal: new AbortController().signal,
  appName: "main",
  portalName: "main",
  rootDir,
  registerDisposer: (_name, dispose) => {
    disposers.push(dispose);
  },
  onBeforeDestroy: (handler) => {
    disposers.push(handler);
    return () => {
      const index = disposers.indexOf(handler);
      if (index >= 0) disposers.splice(index, 1);
    };
  },
});

const readJsonLines = (file: string) =>
  fs
    .readFileSync(file, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);

describe("server logging", () => {
  it("writes embedded system and request logs under dated files", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "portal-logs-"));
    tempRoots.push(rootDir);

    const app = await createPortal(createScope(rootDir));
    const response = await app.request(
      "http://localhost/api/_portal/notes/cached"
    );

    expect(response.status).toBe(200);
    await drainDisposers();

    const dateStamp = getDateStamp();
    const systemFile = path.join(
      rootDir,
      "logs",
      "embedded",
      `system-${dateStamp}.log`
    );
    const requestFile = path.join(
      rootDir,
      "logs",
      "embedded",
      `request-${dateStamp}.log`
    );

    const systemLogs = readJsonLines(systemFile);
    const requestLogs = readJsonLines(requestFile);
    const systemMessages = systemLogs.map((entry) => ({
      disposer: entry.disposer,
      msg: entry.msg,
    }));

    expect(systemLogs).toContainEqual(
      expect.objectContaining({
        channel: "system",
        mode: "embedded",
        msg: "Embedded Portal app created",
      })
    );
    expect(systemMessages).toContainEqual({
      disposer: "portal pino loggers",
      msg: "Portal disposer registered",
    });
    expect(systemMessages).toContainEqual({
      disposer: "local cache-manager and kysely sqlite store",
      msg: "Portal disposer registered",
    });
    expect(systemMessages).toContainEqual({
      disposer: "portal pino loggers",
      msg: "Portal disposer started",
    });
    expect(systemMessages).toContainEqual({
      disposer: "portal pino loggers",
      msg: "Portal disposer completed",
    });
    expect(systemMessages).toContainEqual({
      disposer: "local cache-manager and kysely sqlite store",
      msg: "Portal disposer started",
    });
    expect(systemMessages).toContainEqual({
      disposer: "local cache-manager and kysely sqlite store",
      msg: "Portal disposer completed",
    });
    expect(systemLogs.at(0)).toMatchObject({
      channel: "system",
      mode: "embedded",
    });
    expect(requestLogs.at(-1)).toMatchObject({
      channel: "request",
      method: "GET",
      mode: "embedded",
      path: "/api/_portal/notes/cached",
      status: 200,
    });
  });
});
