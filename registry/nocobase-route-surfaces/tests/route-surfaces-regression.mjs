import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const {
    buildRouteLocationHref,
    createRouteSurfaceNavigationState,
    resolveRouteSurfaceCloseTo,
  } = await server.ssrLoadModule("@nocobase/portal-sdk/routing");
  const location = {
    pathname: "/customers",
    search: "?status=renewal&page=2",
    hash: "#northwind",
    state: { activeTab: "mine" },
  };

  assert.equal(
    buildRouteLocationHref(location),
    "/customers?status=renewal&page=2#northwind"
  );
  assert.deepEqual(createRouteSurfaceNavigationState(location), {
    activeTab: "mine",
    routeSurfaceReturnTo: "/customers?status=renewal&page=2#northwind",
  });
  assert.equal(
    resolveRouteSurfaceCloseTo(
      { routeSurfaceReturnTo: "/customers?page=2" },
      { pathname: "/customers" }
    ),
    "/customers?page=2"
  );
  assert.equal(
    resolveRouteSurfaceCloseTo(undefined, {
      pathname: "/customers/show/42",
      search: "?tab=activity",
    }),
    "/customers/show/42?tab=activity"
  );

  const extensionSource = await readFile(
    new URL("../extension.tsx", import.meta.url),
    "utf8"
  );
  const demoSource = await readFile(
    new URL("../demo/index.tsx", import.meta.url),
    "utf8"
  );
  const guideSource = await readFile(
    new URL("../demo/resource-action-guide.tsx", import.meta.url),
    "utf8"
  );

  assert.match(
    extensionSource,
    /path="edit\/:id"/,
    "keeps list-level edit routes record-addressable"
  );
  assert.match(
    demoSource,
    /openChild\("edit\/42"\)/,
    "opens list-level edit with the selected record id"
  );
  assert.match(
    guideSource,
    /path: "create",\s*resourceAction: "create"/,
    "registers the canonical create route so the resource outlet is mounted"
  );
  assert.match(
    guideSource,
    /path: "edit\/:id",\s*resourceAction: "edit"/,
    "registers the canonical edit route"
  );
  assert.match(
    guideSource,
    /path: "show\/:id",\s*resourceAction: "show"/,
    "registers the canonical show route"
  );
  assert.match(
    guideSource,
    /path: "edit",\s*\/\/ Contextual duplicate:[\s\S]*?<CustomerEditRoute returnTo="show"/,
    "keeps the detail-owned editor contextual instead of registering a duplicate resource action"
  );

  console.log("NocoBase route surfaces regression tests passed");
} finally {
  await server.close();
}
