import assert from "node:assert/strict";
import test from "node:test";

import { evaluateAccess } from "../dist/acl/index.js";
import {
  buildRouteLocationHref,
  buildRouteResources,
  createRouteSurfaceNavigationState,
  defineAppRoutes,
  resolveRouteSurfaceCloseTo,
} from "../dist/routing/index.js";
import {
  configurePortalI18n,
  registerTranslationResources,
  translate,
} from "../dist/i18n/index.js";
import { loadSystemSettings } from "../dist/system-settings/index.js";

test("published ACL and routing entry points are executable in Node", () => {
  assert.equal(
    evaluateAccess(
      { allowAll: true, roles: [] },
      { resource: "users", action: "list" }
    ),
    true
  );

  const routes = defineAppRoutes([
    {
      name: "users",
      path: "/users",
      resource: { meta: { label: "Users" } },
      children: [
        { name: "users-create", path: "create", resourceAction: "create" },
      ],
    },
  ]);
  const resources = buildRouteResources(routes);
  assert.equal(resources[0].list, "/users");
  assert.equal(resources[0].create, "/users/create");

  const location = {
    pathname: "/customers",
    search: "?page=2",
    hash: "#renewal",
    state: { activeTab: "mine" },
  };
  assert.equal(
    buildRouteLocationHref(location),
    "/customers?page=2#renewal"
  );
  assert.deepEqual(createRouteSurfaceNavigationState(location), {
    activeTab: "mine",
    routeSurfaceReturnTo: "/customers?page=2#renewal",
  });
  assert.equal(
    resolveRouteSurfaceCloseTo(
      { routeSurfaceReturnTo: "/customers?page=2" },
      { pathname: "/customers" }
    ),
    "/customers?page=2"
  );
});

test("published i18n and System Settings entry points are executable", async () => {
  registerTranslationResources("test", {
    "en-US": { greeting: "Hello" },
  });
  await configurePortalI18n({
    defaultLocale: "en-US",
    locales: [{ locale: "en-US", label: "English" }],
    initOptions: { defaultNS: "test", initImmediate: true },
  });

  assert.equal(translate("greeting", { ns: "test" }), "Hello");
  assert.equal(typeof loadSystemSettings, "function");
});
