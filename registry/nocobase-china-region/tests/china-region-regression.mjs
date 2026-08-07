import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const server = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true } });

try {
  const {
    getChinaRegionErrorCode,
    listChinaRegions,
    normalizeChinaRegionList,
  } = await server.ssrLoadModule(fileURLToPath(new URL("../china-region-api.ts", import.meta.url)));
  const { formatChinaRegionValue } = await server.ssrLoadModule(fileURLToPath(new URL("../format.ts", import.meta.url)));
  const { nocobaseClient, NocoBaseHttpError } = await server.ssrLoadModule("@nocobase/portal-sdk/client");
  const { default: extension } = await server.ssrLoadModule(fileURLToPath(new URL("../extension.tsx", import.meta.url)));

  assert.equal(extension.id, "nocobase-china-region");
  assert.equal(extension.dev.routes[0].path, "china-region");

  const payload = {
    data: {
      data: [
        { code: 330100, name: "杭州市", level: 2, parentCode: 330000 },
        { code: "110100", name: "北京市", level: 2, parentCode: "110000" },
      ],
    },
  };
  const normalized = normalizeChinaRegionList(payload);
  assert.deepEqual(
    normalized.map((item) => item.code),
    ["110100", "330100"]
  );
  assert.equal(normalized[1].parentCode, "330000");

  const originalAction = nocobaseClient.action;
  let call;
  nocobaseClient.action = async (resource, action, options) => {
    call = { resource, action, options };
    return payload;
  };
  try {
    await listChinaRegions({ parentCode: "330000" });
  } finally {
    nocobaseClient.action = originalAction;
  }
  assert.equal(call.resource, "chinaRegions");
  assert.equal(call.action, "list");
  assert.deepEqual(JSON.parse(call.options.query.filter), { parentCode: "330000" });
  assert.equal(call.options.query.paginate, false);
  assert.equal(call.options.query.sort, "code");

  assert.equal(
    getChinaRegionErrorCode(new NocoBaseHttpError({ status: 404, message: "Not Found" })),
    "pluginUnavailable"
  );
  assert.equal(
    formatChinaRegionValue([
      { code: "330106", name: "西湖区", level: 3 },
      { code: "330000", name: "浙江省", level: 1 },
      { code: "330100", name: "杭州市", level: 2 },
    ]),
    "浙江省/杭州市/西湖区"
  );
  assert.equal(formatChinaRegionValue(null), "");

  const pickerSource = await readFile(new URL("../china-region-picker.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(pickerSource, /from ["']antd["']/);
  assert.match(pickerSource, /listChinaRegions\(\{ level: 1/);
  assert.match(pickerSource, /listChinaRegions\(\{ parentCode:/);

  console.log("NocoBase China region regression tests passed");
} finally {
  await server.close();
}
