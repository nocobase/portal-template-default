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
  it("uses the configured Portal name under the reserved API namespace", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        NOCOBASE_PORTAL_NAME: "sales portal",
      },
    });

    expect(portalApiPath("/users/metadata")).toBe(
      "/api/_portal/sales%20portal/users/metadata"
    );
    expect(portalApiPath("users")).toBe("/api/_portal/sales%20portal/users");
  });

  it("falls back to main when no Portal name is configured", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {},
    });

    expect(portalApiPath()).toBe("/api/_portal/main");
  });
});
