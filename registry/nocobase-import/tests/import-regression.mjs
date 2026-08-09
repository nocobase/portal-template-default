import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const {
    downloadImportTemplate,
    getImportTemplateFilename,
    importRecords,
    isXlsxFile,
    normalizeImportPayload,
  } = await server.ssrLoadModule(
    fileURLToPath(new URL("../import-api.ts", import.meta.url))
  );
  const { nocobaseClient } = await server.ssrLoadModule(
    "@nocobase/portal-sdk/client"
  );
  const { default: extension } = await server.ssrLoadModule(
    fileURLToPath(new URL("../extension.tsx", import.meta.url))
  );

  assert.equal(extension.id, "nocobase-import");
  assert.equal(extension.dev.resources[0].list, "import");
  assert.equal(extension.dev.routes[0].path, "import");

  assert.deepEqual(
    normalizeImportPayload({ data: { successCount: "3" } }),
    {
      type: "completed",
      stats: { total: 3, success: 3, skipped: 0, updated: 0, failed: 0 },
      raw: { data: { successCount: "3" } },
    }
  );
  assert.deepEqual(
    normalizeImportPayload({ data: { data: { taskId: 42 } } }),
    {
      type: "queued",
      taskId: "42",
      raw: { data: { data: { taskId: 42 } } },
    }
  );
  assert.equal(isXlsxFile({ name: "users.XLSX" }), true);
  assert.equal(isXlsxFile({ name: "users.xls" }), false);
  assert.equal(
    getImportTemplateFilename(
      'attachment; filename="%E7%94%A8%E6%88%B7-import.xlsx"',
      "fallback.xlsx"
    ),
    "用户-import.xlsx"
  );

  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  let templateRequest;
  globalThis.window = { location: { origin: "http://localhost" } };
  globalThis.fetch = async (input, init) => {
    templateRequest = { input: String(input), init };
    return new Response("template", {
      status: 200,
      headers: {
        "content-disposition": 'attachment; filename="users.xlsx"',
      },
    });
  };
  try {
    const template = await downloadImportTemplate({
      collectionName: "users",
      dataSourceKey: "reporting",
      columns: [{ dataIndex: ["username"], defaultTitle: "Username" }],
      explain: "Use a unique username.",
    });
    assert.equal(template.filename, "users.xlsx");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
  assert.match(templateRequest.input, /users:downloadXlsxTemplate/);
  assert.equal(templateRequest.init.headers["X-Data-Source"], "reporting");
  const templateValues = JSON.parse(String(templateRequest.init.body));
  assert.deepEqual(templateValues, {
    columns: [{ dataIndex: ["username"], defaultTitle: "Username" }],
    explain: "Use a unique username.",
  });
  assert.doesNotThrow(
    () => templateValues.columns.map((column) => column.dataIndex),
    "sends columns at the body root consumed as ctx.action.params.values"
  );

  const originalAction = nocobaseClient.action;
  let importCall;
  nocobaseClient.action = async (resource, action, options) => {
    importCall = { resource, action, options };
    return { data: { stats: { total: 2, success: 1, updated: 1 } } };
  };
  try {
    const result = await importRecords({
      collectionName: "users",
      dataSourceKey: "reporting",
      columns: [{ dataIndex: ["username"], defaultTitle: "Username" }],
      file: new File(["xlsx"], "users.xlsx"),
      mode: "auto",
    });
    assert.equal(result.type, "completed");
    assert.deepEqual(result.stats, {
      total: 2,
      success: 1,
      updated: 1,
      skipped: 0,
      failed: 0,
    });
  } finally {
    nocobaseClient.action = originalAction;
  }
  assert.equal(importCall.resource, "users");
  assert.equal(importCall.action, "importXlsx");
  assert.deepEqual(importCall.options.query, { mode: "auto" });
  assert.equal(importCall.options.headers["X-Data-Source"], "reporting");
  assert.equal(importCall.options.body.get("columns"), '[{"dataIndex":["username"],"defaultTitle":"Username"}]');

  const buttonSource = await readFile(
    new URL("../import-records-button.tsx", import.meta.url),
    "utf8"
  );
  assert.match(buttonSource, /downloadImportTemplate/);
  assert.match(buttonSource, /extension\?\.renderQueued/);
  assert.match(buttonSource, /accept="\.xlsx/);

  console.log("NocoBase import regression tests passed");
} finally {
  await server.close();
}
