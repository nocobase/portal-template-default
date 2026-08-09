import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const server = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true } });

try {
  const {
    getRecordHistoryErrorCode,
    listRecordHistory,
    normalizeRecordHistoryList,
    resolveRecordHistoryResult,
  } = await server.ssrLoadModule(
    fileURLToPath(new URL("../record-history-api.ts", import.meta.url))
  );
  const { NocoBaseHttpError } = await server.ssrLoadModule("@nocobase/portal-sdk/client");
  const { nocobaseClient } = await server.ssrLoadModule("@nocobase/portal-sdk/client");
  const { default: extension } = await server.ssrLoadModule(
    fileURLToPath(new URL("../extension.tsx", import.meta.url))
  );

  assert.equal(extension.id, "nocobase-record-history");
  const payload = {
    data: [
      {
        uuid: "history-1",
        recordId: 7,
        collectionName: "users",
        dataSourceKey: "main",
        action: "update",
        recordFieldHistory: [{ fieldPath: "nickname", before: "A", after: "B" }],
      },
    ],
    meta: { count: 21 },
  };
  const normalized = normalizeRecordHistoryList(payload);
  assert.equal(normalized.count, 21);
  assert.equal(normalized.rows[0].recordId, "7");
  assert.equal(normalized.rows[0].recordFieldHistory[0].after, "B");

  const fallback = resolveRecordHistoryResult(
    { rows: [], count: 0 },
    normalized.rows
  );
  assert.equal(fallback.usingFallback, true);
  assert.equal(fallback.rows[0].uuid, "history-1");
  assert.equal(
    resolveRecordHistoryResult(normalized, []).usingFallback,
    false
  );

  const originalAction = nocobaseClient.action;
  let call;
  nocobaseClient.action = async (resource, action, options) => {
    call = { resource, action, options };
    return payload;
  };
  try {
    await listRecordHistory({ collectionName: "users", recordId: 7, page: 2, pageSize: 5 });
  } finally {
    nocobaseClient.action = originalAction;
  }
  assert.equal(call.resource, "recordHistories");
  assert.equal(call.action, "list");
  assert.deepEqual(call.options.query.appends, ["recordFieldHistory", "user"]);
  assert.equal(call.options.query.appendSnapshots, true);
  assert.equal(call.options.query.page, 2);
  assert.deepEqual(JSON.parse(call.options.query.filter), {
    dataSourceKey: "main",
    collectionName: "users",
    recordId: "7",
  });

  assert.equal(
    getRecordHistoryErrorCode(new NocoBaseHttpError({ status: 404, message: "Not Found" })),
    "pluginUnavailable"
  );
  assert.equal(
    getRecordHistoryErrorCode(new NocoBaseHttpError({ status: 403, message: "Forbidden" })),
    "forbidden"
  );
  assert.equal(getRecordHistoryErrorCode(new TypeError("Failed to fetch")), "network");
  assert.equal(getRecordHistoryErrorCode(new Error("Unexpected")), "load");

  const timeline = await readFile(new URL("../record-history-timeline.tsx", import.meta.url), "utf8");
  assert.match(timeline, /resource="recordHistories"/);
  console.log("NocoBase record history regression tests passed");
} finally {
  await server.close();
}
