import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const server = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true } });

try {
  const { normalizeChartRows, queryChartData } = await server.ssrLoadModule(
    fileURLToPath(new URL("../chart-api.ts", import.meta.url))
  );
  const { nocobaseClient } = await server.ssrLoadModule("@nocobase/portal-sdk/client");
  const { default: extension } = await server.ssrLoadModule(
    fileURLToPath(new URL("../extension.tsx", import.meta.url))
  );

  assert.equal(extension.id, "nocobase-data-visualization");
  assert.deepEqual(normalizeChartRows({ data: { data: [{ month: "2026-08", count: 3 }] } }), [
    { month: "2026-08", count: 3 },
  ]);

  const originalAction = nocobaseClient.action;
  let call;
  nocobaseClient.action = async (resource, action, options) => {
    call = { resource, action, options };
    return { data: [{ month: "2026-08", count: 3 }] };
  };
  try {
    const rows = await queryChartData({
      collection: "users",
      measures: [{ field: ["id"], aggregation: "count", alias: "count" }],
      dimensions: [{ field: ["createdAt"], format: "YYYY-MM", alias: "month" }],
    });
    assert.equal(rows[0].count, 3);
  } finally {
    nocobaseClient.action = originalAction;
  }
  assert.equal(call.resource, "charts");
  assert.equal(call.action, "queryData");
  assert.equal(call.options.method, "POST");
  assert.equal(call.options.body.mode, "builder");
  assert.equal(call.options.body.variableResolution, "legacy-schema");
  assert.equal(call.options.body.dataSource, "main");

  const chart = await readFile(new URL("../nocobase-chart.tsx", import.meta.url), "utf8");
  assert.match(chart, /resource="charts"/);
  assert.match(chart, /action="queryData"/);
  console.log("NocoBase data visualization regression tests passed");
} finally {
  await server.close();
}
