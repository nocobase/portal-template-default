import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const server = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true } });

try {
  const { getMapConfiguration, normalizeMapConfiguration } = await server.ssrLoadModule(
    fileURLToPath(new URL("../map-api.ts", import.meta.url))
  );
  const { nocobaseClient } = await server.ssrLoadModule("@nocobase/portal-sdk/client");
  const { default: extension } = await server.ssrLoadModule(
    fileURLToPath(new URL("../extension.tsx", import.meta.url))
  );

  assert.equal(extension.id, "nocobase-map");
  assert.deepEqual(
    normalizeMapConfiguration({ data: { data: { accessKey: "key", securityJsCode: "security" } } }, "amap"),
    { type: "amap", accessKey: "key", securityJsCode: "security" }
  );
  assert.equal(normalizeMapConfiguration({ data: {} }, "google"), undefined);

  const originalAction = nocobaseClient.action;
  let call;
  nocobaseClient.action = async (resource, action, options) => {
    call = { resource, action, options };
    return { data: { accessKey: "google-key" } };
  };
  try {
    assert.equal((await getMapConfiguration("google")).accessKey, "google-key");
  } finally {
    nocobaseClient.action = originalAction;
  }
  assert.deepEqual(call, {
    resource: "map-configuration",
    action: "get",
    options: { query: { type: "google" }, signal: undefined, unwrap: "none" },
  });

  const runtime = await readFile(new URL("../map-runtime.ts", import.meta.url), "utf8");
  const component = await readFile(new URL("../nocobase-map.tsx", import.meta.url), "utf8");
  assert.match(runtime, /webapi\.amap\.com/);
  assert.match(runtime, /maps\.googleapis\.com/);
  for (const geometry of ["point", "lineString", "polygon", "circle"]) assert.match(runtime, new RegExp(geometry));
  assert.match(component, /resource="map-configuration"/);
  console.log("NocoBase map regression tests passed");
} finally {
  await server.close();
}
