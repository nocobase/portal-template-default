import { afterEach, describe, expect, it } from "vitest";

import { portalApiPath } from "@/lib/portal-api";

const originalWindow = globalThis.window;

afterEach(() => {
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, "window");
  } else {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }
});

describe("Portal API paths", () => {
  it("uses the reserved Portal API namespace under the runtime API URL", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        location: {
          origin: "http://localhost:5173",
        },
        __NOCOBASE_PORTAL_ENV__: {
          NOCOBASE_API_URL: "/portals/main/api",
        },
      },
    });

    expect(portalApiPath("/users/metadata")).toBe(
      "/portals/main/api/_portal/users/metadata"
    );
    expect(portalApiPath("users")).toBe("/portals/main/api/_portal/users");
  });

  it("keeps absolute runtime API URLs on the dev proxy path", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        location: {
          origin: "http://localhost:5173",
        },
        __NOCOBASE_PORTAL_ENV__: {
          NOCOBASE_API_URL: "http://127.0.0.1:64074/portals/main/api",
        },
      },
    });

    expect(portalApiPath("/users/metadata")).toBe(
      "/portals/main/api/_portal/users/metadata"
    );
  });

  it("returns the namespace root under /api when no runtime API URL is configured", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        location: {
          origin: "http://localhost:5173",
        },
      },
    });

    expect(portalApiPath()).toBe("/api/_portal");
  });
});
