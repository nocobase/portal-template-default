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
  const { listTreeRecordPage } = await server.ssrLoadModule(
    fileURLToPath(new URL("../tree-api.ts", import.meta.url))
  );
  const { nocobaseClient } = await server.ssrLoadModule(
    "@nocobase/portal-sdk/client"
  );

  const originalAction = nocobaseClient.action;
  let call;
  nocobaseClient.action = async (resource, action, options) => {
    call = { resource, action, options };
    return {
      data: {
        data: [
          {
            id: 1,
            title: "Products",
            nodes: [{ id: 2, title: "Hardware", parentId: 1 }],
          },
        ],
        meta: { count: 4 },
      },
    };
  };

  let result;
  try {
    result = await listTreeRecordPage("categories", {
      page: 2,
      pageSize: 5,
      childrenField: "nodes",
      filter: { title: { $includes: "hard" } },
      sort: ["title"],
    });
  } finally {
    nocobaseClient.action = originalAction;
  }

  assert.equal(call.resource, "categories");
  assert.equal(call.action, "list");
  assert.equal(call.options.query.tree, true);
  assert.equal(call.options.query.page, 2);
  assert.equal(call.options.query.pageSize, 5);
  assert.deepEqual(JSON.parse(call.options.query.filter), {
    title: { $includes: "hard" },
  });
  assert.deepEqual(call.options.query.sort, ["title"]);
  assert.equal(result.count, 4);
  assert.equal(result.rows[0].children[0].title, "Hardware");

  const demoSource = await readFile(
    new URL("../demo.tsx", import.meta.url),
    "utf8"
  );
  assert.match(demoSource, /setCollectionName/);
  assert.match(demoSource, /collectionName=\{target\.collectionName\}/);
  assert.match(demoSource, /titleField=\{target\.titleField\}/);
  assert.doesNotMatch(demoSource, /collectionName="tree"/);

  console.log("NocoBase collection tree regression tests passed");
} finally {
  await server.close();
}
