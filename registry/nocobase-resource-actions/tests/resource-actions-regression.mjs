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
    createUpdateBody,
    updateResourceRecords,
    getDuplicateTemplate,
    createDuplicateRecord,
  } = await server.ssrLoadModule(
    fileURLToPath(new URL("../resource-actions-api.ts", import.meta.url))
  );
  const { getValueAtPath, setValueAtPath } = await server.ssrLoadModule(
    fileURLToPath(new URL("../value-path.ts", import.meta.url))
  );
  const { runPostMutationCallback } = await server.ssrLoadModule(
    fileURLToPath(new URL("../action-utils.ts", import.meta.url))
  );
  const { nocobaseClient } = await server.ssrLoadModule(
    "@nocobase/portal-sdk/client"
  );
  const { default: extension } = await server.ssrLoadModule(
    fileURLToPath(new URL("../extension.tsx", import.meta.url))
  );

  assert.equal(extension.id, "nocobase-resource-actions");
  assert.equal(extension.dev.resources[0].list, "resource-actions");
  assert.equal(extension.dev.routes[0].path, "resource-actions");

  assert.deepEqual(
    createUpdateBody(
      { type: "selected", keys: [{ tenantId: 1, id: 1 }, { tenantId: 1, id: 2 }] },
      { status: "active" }
    ),
    {
      filterByTk: [{ tenantId: 1, id: 1 }, { tenantId: 1, id: 2 }],
      values: { status: "active" },
    }
  );
  assert.deepEqual(
    createUpdateBody({ type: "filter", filter: { status: "draft" } }, { status: "active" }),
    { filter: { status: "draft" }, values: { status: "active" } }
  );
  assert.deepEqual(createUpdateBody({ type: "all" }, { status: "active" }), {
    values: { status: "active" },
    forceUpdate: true,
  });
  assert.throws(
    () => createUpdateBody({ type: "selected", keys: [] }, { status: "active" }),
    /NO_SELECTED_RECORDS/
  );
  assert.throws(
    () => createUpdateBody({ type: "filter", filter: {} }, { status: "active" }),
    /EMPTY_FILTER/
  );
  assert.throws(
    () =>
      createUpdateBody(
        { type: "filter", filter: { $and: [] } },
        { status: "active" }
      ),
    /EMPTY_FILTER/
  );

  const nested = {};
  setValueAtPath(nested, "profile.city", "Hangzhou");
  assert.deepEqual(nested, { profile: { city: "Hangzhou" } });
  assert.equal(getValueAtPath(nested, "profile.city"), "Hangzhou");

  const refreshError = new Error("Refresh failed");
  let reportedRefreshError;
  const isolatedRefreshError = await runPostMutationCallback(
    async () => {
      throw refreshError;
    },
    { updated: 2 },
    (error) => {
      reportedRefreshError = error;
    }
  );
  assert.equal(isolatedRefreshError, refreshError);
  assert.equal(reportedRefreshError, refreshError);

  const originalAction = nocobaseClient.action;
  const calls = [];
  nocobaseClient.action = async (resource, action, options) => {
    calls.push({ resource, action, options });
    if (action === "get") return { nickname: "Alice" };
    if (action === "create") return { id: 9 };
    return { updated: 2 };
  };
  try {
    await updateResourceRecords({
      collectionName: "users",
      dataSourceKey: "reporting",
      target: { type: "selected", keys: [1, 2] },
      values: { nickname: "Portal user" },
    });
    const template = await getDuplicateTemplate({
      collectionName: "users",
      dataSourceKey: "reporting",
      recordKey: { tenantId: 1, id: 2 },
      fields: [{ name: "nickname", label: "Nickname" }],
    });
    assert.deepEqual(template, { nickname: "Alice" });
    await createDuplicateRecord({
      collectionName: "users",
      dataSourceKey: "reporting",
      values: template,
    });
  } finally {
    nocobaseClient.action = originalAction;
  }

  assert.deepEqual(calls[0], {
    resource: "users",
    action: "update",
    options: {
      method: "POST",
      body: {
        filterByTk: [1, 2],
        values: { nickname: "Portal user" },
      },
      headers: { "X-Data-Source": "reporting" },
      unwrap: "data",
    },
  });
  assert.equal(calls[1].action, "get");
  assert.equal(calls[1].options.query.filterByTk, '{"tenantId":1,"id":2}');
  assert.deepEqual(calls[1].options.query["fields[]"], ["nickname"]);
  assert.equal(calls[1].options.query.isTemplate, true);
  assert.equal(calls[2].action, "create");
  assert.deepEqual(calls[2].options.body, { nickname: "Alice" });

  const bulkEditSource = await readFile(
    new URL("../bulk-edit-records-button.tsx", import.meta.url),
    "utf8"
  );
  const bulkUpdateSource = await readFile(
    new URL("../bulk-update-records-button.tsx", import.meta.url),
    "utf8"
  );
  const duplicateSource = await readFile(
    new URL("../duplicate-record-button.tsx", import.meta.url),
    "utf8"
  );
  assert.match(bulkEditSource, /Keep unchanged/);
  assert.match(bulkEditSource, /Change to/);
  assert.match(bulkEditSource, /Clear/);
  assert.match(bulkUpdateSource, /confirm = true/);
  assert.match(duplicateSource, /mode = "direct"/);
  assert.match(duplicateSource, /mode === "edit"/);
  assert.match(duplicateSource, /action="create"/);
  assert.match(duplicateSource, /!templateLoaded/);
  assert.match(duplicateSource, /htmlFor={inputId}/);
  assert.match(bulkEditSource, /aria-labelledby={labelId}/);

  console.log("NocoBase resource actions regression tests passed");
} finally {
  await server.close();
}
