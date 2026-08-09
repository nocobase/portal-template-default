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
    appendImportProFormData,
    createImportProOptions,
    createImportProOptionsFromConfig,
  } =
    await server.ssrLoadModule(
      fileURLToPath(new URL("../import-pro-options.ts", import.meta.url))
    );
  const { getAsyncImportTask, normalizeAsyncImportTask, cancelAsyncImportTask } =
    await server.ssrLoadModule(
      fileURLToPath(new URL("../import-task-api.ts", import.meta.url))
    );
  const { nocobaseClient } = await server.ssrLoadModule(
    "@nocobase/portal-sdk/client"
  );
  const { default: extension } = await server.ssrLoadModule(
    fileURLToPath(new URL("../extension.tsx", import.meta.url))
  );

  assert.equal(extension.id, "nocobase-import-pro");
  assert.equal(extension.dev, undefined);

  assert.deepEqual(createImportProOptions(), {
    mode: "auto",
    triggerWorkflow: false,
    identifyDuplicates: false,
    uniqueFields: [],
    duplicateMode: "skip",
    emptyValueOption: "ignore",
  });

  assert.deepEqual(
    createImportProOptionsFromConfig({
      defaultOptions: { mode: "sync", duplicateMode: "overwrite" },
      execution: { mode: "async", triggerWorkflow: true },
      duplicates: {
        enabled: true,
        strategy: "update_only",
        fields: ["username"],
        emptyCell: "ignore",
      },
    }),
    {
      mode: "async",
      triggerWorkflow: true,
      identifyDuplicates: true,
      uniqueFields: ["username"],
      duplicateMode: "update_only",
      emptyValueOption: "ignore",
    }
  );

  const options = createImportProOptions({
    identifyDuplicates: true,
    uniqueFields: ["username"],
    duplicateMode: "overwrite",
    emptyValueOption: "ignore",
    triggerWorkflow: true,
  });
  const formData = new FormData();
  appendImportProFormData(formData, options);
  assert.equal(formData.get("triggerWorkflow"), "true");
  assert.deepEqual(JSON.parse(String(formData.get("duplicateOption"))), {
    uniqueField: ["username"],
    mode: "overwrite",
    emptyValueOption: "ignore",
  });

  assert.deepEqual(
    normalizeAsyncImportTask({
      data: {
        data: {
          id: "task-1",
          status: 0,
          cancelable: true,
          progressCurrent: "40",
          progressTotal: 100,
        },
      },
    }),
    {
      id: "task-1",
      title: undefined,
      status: 0,
      result: undefined,
      cancelable: true,
      progressCurrent: 40,
      progressTotal: 100,
    }
  );

  const originalAction = nocobaseClient.action;
  const calls = [];
  nocobaseClient.action = async (resource, action, actionOptions) => {
    calls.push({ resource, action, actionOptions });
    if (action === "get") {
      return { data: { id: "task-1", status: null, cancelable: true } };
    }
    return {};
  };
  try {
    await getAsyncImportTask("task-1");
    await cancelAsyncImportTask("task-1");
  } finally {
    nocobaseClient.action = originalAction;
  }
  assert.deepEqual(calls[0].actionOptions.query, { filterByTk: "task-1" });
  assert.deepEqual(calls[1], {
    resource: "asyncTasks",
    action: "stop",
    actionOptions: {
      method: "POST",
      query: { filterByTk: "task-1" },
      unwrap: "none",
    },
  });

  const buttonSource = await readFile(
    new URL("../import-pro-records-button.tsx", import.meta.url),
    "utf8"
  );
  const taskSource = await readFile(
    new URL("../import-task-progress.tsx", import.meta.url),
    "utf8"
  );
  assert.match(buttonSource, /ImportRecordsButton/);
  assert.match(buttonSource, /duplicateMode/);
  assert.match(buttonSource, /createImportProOptionsFromConfig/);
  assert.match(buttonSource, /duplicates\?\.editableByUploader/);
  assert.match(buttonSource, /disabled={!duplicateOptionsEditable}/);
  assert.match(buttonSource, /<Select\s+multiple/);
  assert.match(buttonSource, /reviewTitle: t\("options\.title", "Import options"\)/);
  assert.match(taskSource, /getAsyncImportTask/);
  assert.match(taskSource, /cancelAsyncImportTask/);

  console.log("NocoBase import Pro regression tests passed");
} finally {
  await server.close();
}
