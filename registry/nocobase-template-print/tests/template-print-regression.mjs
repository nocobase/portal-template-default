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
    buildPrintingTemplateFilter,
    buildTemplatePrintQueryParams,
    getTemplatePrintFilename,
    listPrintingTemplates,
    normalizePrintingTemplateList,
    printTemplate,
  } = await server.ssrLoadModule(
    fileURLToPath(new URL("../template-print-api.ts", import.meta.url))
  );

  assert.deepEqual(
    buildPrintingTemplateFilter({
      collectionName: "users",
      dataSourceKey: "reporting",
      rootDataType: "array",
    }),
    {
      $and: [
        { collectionName: "users" },
        { dataSource: "reporting" },
        { rootDataType: "array" },
      ],
    },
    "filters template list requests by data source, collection, and print scenario"
  );

  assert.deepEqual(
    buildPrintingTemplateFilter({
      collectionName: "users",
      dataSourceKey: "main",
      rootDataType: "map",
    }),
    {
      $and: [
        { collectionName: "users" },
        {
          $or: [
            { dataSource: "main" },
            { dataSource: { $empty: true } },
          ],
        },
        {
          $or: [
            { rootDataType: "map" },
            { rootDataType: { $empty: true } },
          ],
        },
      ],
    },
    "keeps legacy main/map templates eligible in server-side filtering"
  );

  assert.deepEqual(
    normalizePrintingTemplateList({
      data: {
        data: [
          {
            name: "legacy-order",
            title: "Legacy order",
            collectionName: "orders",
          },
        ],
      },
    }),
    [
      {
        name: "legacy-order",
        title: "Legacy order",
        collectionName: "orders",
        dataSource: "main",
        rootDataType: "map",
        filename: undefined,
        legacy: true,
      },
    ]
  );

  {
    const originalFetch = globalThis.fetch;
    const originalWindow = globalThis.window;
    let capturedListUrl;
    globalThis.window = { location: { origin: "http://localhost" } };
    globalThis.fetch = async (input) => {
      capturedListUrl = String(input);
      return new Response(
        JSON.stringify({
          data: [
            {
              name: "users-list",
              title: "Users list",
              collectionName: "users",
              dataSource: "reporting",
              rootDataType: "array",
            },
          ],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      );
    };
    try {
      const templates = await listPrintingTemplates({
        collectionName: "users",
        dataSourceKey: "reporting",
        rootDataType: "array",
      });
      assert.equal(templates.length, 1);
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.window = originalWindow;
    }

    const filter = JSON.parse(
      new URL(capturedListUrl).searchParams.get("filter")
    );
    assert.deepEqual(
      filter,
      buildPrintingTemplateFilter({
        collectionName: "users",
        dataSourceKey: "reporting",
        rootDataType: "array",
      }),
      "sends the matching template filter to printingTemplates:list"
    );
  }

  assert.deepEqual(
    buildTemplatePrintQueryParams(
      { filter: { status: "approved" }, appends: ["customer"] },
      { type: "selected", recordKeys: [1, 2], rowKey: "orderNo" }
    ),
    {
      filter: {
        $and: [
          { status: "approved" },
          { orderNo: { $in: [1, 2] } },
        ],
      },
      appends: ["customer"],
    }
  );

  assert.deepEqual(
    buildTemplatePrintQueryParams(
      { appends: ["items"] },
      { type: "single", filterByTk: { tenantId: 7, orderNo: "A-1" } }
    ),
    {
      appends: ["items"],
      filterByTk: { tenantId: 7, orderNo: "A-1" },
    }
  );

  assert.deepEqual(
    buildTemplatePrintQueryParams(
      { page: 3, pageSize: 20, filter: { status: "approved" } },
      { type: "all" }
    ),
    {
      page: null,
      pageSize: null,
      filter: { status: "approved" },
    }
  );

  assert.equal(
    getTemplatePrintFilename(
      'attachment; filename="%E8%AE%A2%E5%8D%95-42.docx"'
    ),
    "订单-42.docx"
  );

  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  let capturedPrintBody;
  globalThis.window = { location: { origin: "http://localhost" } };
  globalThis.fetch = async (_input, init) => {
    capturedPrintBody = JSON.parse(String(init?.body));
    return new Response("rendered document", {
      status: 200,
      headers: { "content-disposition": 'attachment; filename="user.docx"' },
    });
  };
  try {
    await printTemplate({
      collectionName: "users",
      templateName: "user-profile",
      selection: { type: "single", filterByTk: 1 },
      timezone: "UTC",
      uid: "template-print-regression",
    });
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
  assert.deepEqual(
    capturedPrintBody,
    {
      queryParams: { filterByTk: 1 },
      templateName: "user-profile",
      blockName: "details",
      convertedToPDF: false,
      timezone: "UTC",
      uid: "template-print-regression",
    },
    "sends template print values at the HTTP body root"
  );

  const demoSource = await readFile(
    new URL("../demo.tsx", import.meta.url),
    "utf8"
  );
  const buttonSource = await readFile(
    new URL("../template-print-button.tsx", import.meta.url),
    "utf8"
  );
  assert.match(
    buttonSource,
    /<DropdownMenuContent[^>]*>\s*<DropdownMenuGroup>[\s\S]*?<DropdownMenuLabel>/,
    "keeps the Base UI menu label and items inside a menu group"
  );
  assert.match(
    buttonSource,
    /<DropdownMenu open=\{pickerOpen\} onOpenChange=\{handlePickerOpenChange\}>/,
    "controls the template picker so an empty result can show feedback"
  );
  assert.match(
    buttonSource,
    /enabled: needsTemplateList && pickerOpen/,
    "loads selectable templates only when the menu is opened"
  );
  assert.match(
    buttonSource,
    /!templates\.length[\s\S]*?notifyNoTemplates\(\)/,
    "notifies the user when no matching printing template exists"
  );
  assert.match(
    demoSource,
    /aria-labelledby="template-print-users-table"[\s\S]*?<Table>/,
    "places list printing in a users table"
  );
  assert.match(
    demoSource,
    /aria-labelledby="template-print-user-detail"[\s\S]*?border-t pt-4/,
    "places detail printing below the user detail block"
  );
  assert.equal(
    demoSource.match(/<TemplatePrintButton/g)?.length,
    6,
    "shows fixed and selectable printing plus two PDF examples"
  );
  assert.equal(
    demoSource.match(/templateName=\{/g)?.length,
    4,
    "shows preconfigured templates for the base examples and both PDF examples"
  );
  assert.equal(
    demoSource.match(/selectTemplate:/g)?.length,
    2,
    "keeps exactly two choose-on-click examples"
  );
  assert.equal(
    demoSource.match(/convertedToPDF/g)?.length,
    2,
    "shows PDF printing for list and detail contexts"
  );

  console.log("NocoBase template print regression tests passed");
} finally {
  await server.close();
}
