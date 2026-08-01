import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

try {
  const { AuthSession } = await server.ssrLoadModule(
    "@nocobase/portal-sdk/client"
  );
  const {
    resolveNocoBaseAppName,
    resolveNocoBaseSettingsUrl,
    resolvePortalUrl,
  } = await server.ssrLoadModule("@nocobase/portal-sdk/runtime");

  assert.equal(
    resolveNocoBaseAppName(
      "/nocobase/x/apps/crm/customer/",
      "/nocobase/api/__app/crm"
    ),
    "crm"
  );
  assert.equal(
    resolveNocoBaseAppName("/x/customer/", "/api/__app/analytics"),
    "analytics"
  );
  assert.equal(resolveNocoBaseAppName("/x/customer/", "/api"), "main");

  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { origin: "http://localhost:14000" },
      NOCOBASE_API_URL: "/api",
      NOCOBASE_PORTAL_BASE: "/x/demo/",
    },
  });
  assert.equal(
    resolvePortalUrl("/users?tab=active#list"),
    "/x/demo/users?tab=active#list"
  );
  assert.equal(
    resolveNocoBaseSettingsUrl(),
    "http://localhost:14000/settings"
  );

  window.NOCOBASE_API_URL = "/api/__app/crm";
  window.NOCOBASE_PORTAL_BASE = "/x/apps/crm/customer/";
  assert.equal(
    resolvePortalUrl("/users?tab=active#list"),
    "/x/apps/crm/customer/users?tab=active#list"
  );
  assert.equal(
    resolveNocoBaseSettingsUrl(),
    "http://localhost:14000/settings/apps/crm"
  );

  window.NOCOBASE_API_URL = "http://127.0.0.1:13000/api";
  window.NOCOBASE_PORTAL_BASE = "/x/demo/";
  assert.equal(
    resolvePortalUrl("/users?tab=active#list"),
    "http://localhost:14000/x/demo/users?tab=active#list"
  );

  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }

  const main = new AuthSession({ appName: "main", storage: createStorage() });
  assert.equal(main.getStorageKey("token"), "NOCOBASE_TOKEN");
  assert.equal(main.getStorageKey("auth"), "NOCOBASE_AUTH");
  assert.equal(main.getStorageKey("role"), "NOCOBASE_ROLE");

  const subApp = new AuthSession({
    appName: "crm",
    storage: createStorage(),
  });
  assert.equal(subApp.getStorageKey("token"), "NOCOBASE_CRM_TOKEN");
  assert.equal(subApp.getStorageKey("auth"), "NOCOBASE_CRM_AUTH");
  assert.equal(subApp.getStorageKey("role"), "NOCOBASE_CRM_ROLE");

  const sharedToken = new AuthSession({
    appName: "crm",
    shareToken: true,
    storage: createStorage(),
  });
  assert.equal(sharedToken.getStorageKey("token"), "NOCOBASE_TOKEN");
  assert.equal(sharedToken.getStorageKey("auth"), "NOCOBASE_CRM_AUTH");

  console.log("NocoBase authentication session regression tests passed");
} finally {
  await server.close();
}
