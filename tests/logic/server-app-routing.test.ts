import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../../server/app";
import {
  createEmbeddedRuntimeContext,
  type PortalDisposer,
  type PortalScope,
  type ServerRuntimeContext,
} from "../../server/runtime";

const disposers: PortalDisposer[] = [];

afterEach(async () => {
  const activeDisposers = disposers.splice(0);
  await Promise.all(activeDisposers.map((dispose) => dispose()));
});

const createPortalScope = (): PortalScope => ({
  id: "main:main",
  version: 1,
  basePath: "/portals/main",
  signal: new AbortController().signal,
  appName: "main",
  portalName: "main",
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

const standaloneRuntime: ServerRuntimeContext = {
  mode: "standalone",
  appName: "main",
  portalName: "main",
  basePath: "/portals/main",
};

describe("server app route mounting", () => {
  it("requires the Portal base path in standalone dev mode", async () => {
    const app = createApp({ runtime: standaloneRuntime });

    expect(
      (await app.request("http://localhost/api/_portal/notes/cached")).status,
    ).toBe(404);
    expect(
      (
        await app.request(
          "http://localhost/portals/main/api/_portal/notes/cached",
        )
      ).status,
    ).toBe(200);
  });

  it("serves standalone Portal APIs below a NocoBase public path", async () => {
    const app = createApp({
      runtime: {
        ...standaloneRuntime,
        basePath: "/nocobase/portals/main",
      },
    });

    expect(
      (
        await app.request(
          "http://localhost/nocobase/portals/main/api/_portal/notes/cached",
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await app.request(
          "http://localhost/portals/main/api/_portal/notes/cached",
        )
      ).status,
    ).toBe(404);
  });

  it("mounts at the path received from portal-host in embedded mode", async () => {
    const app = createApp({
      runtime: createEmbeddedRuntimeContext(createPortalScope()),
    });

    expect(
      (await app.request("http://localhost/api/_portal/notes/cached")).status,
    ).toBe(200);
    expect(
      (
        await app.request(
          "http://localhost/portals/main/api/_portal/notes/cached",
        )
      ).status,
    ).toBe(404);
  });
});
