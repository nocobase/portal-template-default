import assert from "node:assert/strict";
import fs from "node:fs";

const editor = fs.readFileSync(
  new URL("../markdown-vditor.tsx", import.meta.url),
  "utf8",
);
const api = fs.readFileSync(
  new URL("../vditor-api.ts", import.meta.url),
  "utf8",
);

assert.match(editor, /new Vditor/);
assert.match(editor, /markdown.*sanitize/s);
assert.match(editor, /uploadFile/);
assert.match(editor, /lute\.min\.js\?url/);
assert.match(editor, /_lutePath:\s*lutePath/);
assert.match(editor, /i18n:\s*resolveVditorI18n/);
assert.match(editor, /icons\/ant\.js/);
assert.match(api, /"vditor", "check"/);

console.log("markdown vditor regression checks passed");
