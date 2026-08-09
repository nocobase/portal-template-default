import assert from "node:assert/strict";
import fs from "node:fs";

const provider = fs.readFileSync(
  new URL("../space-provider.tsx", import.meta.url),
  "utf8",
);
const api = fs.readFileSync(
  new URL("../space-api.ts", import.meta.url),
  "utf8",
);
const demo = fs.readFileSync(
  new URL("../demo.tsx", import.meta.url),
  "utf8",
);
const extension = fs.readFileSync(
  new URL("../extension.tsx", import.meta.url),
  "utf8",
);

assert.match(provider, /addHeaderProvider/);
assert.match(provider, /window.location.reload/);
assert.match(api, /"spaces", "my"/);
assert.match(api, /spaces\/\$\{encodeURIComponent\(name\)\}\/users/);
assert.match(api, /if \(!space\?\.trim\(\)\) return \[\]/);
assert.match(demo, /<SpaceSwitcher/);
assert.match(extension, /import "\.\/locales"/);
assert.match(extension, /i18nKey: "navigation\.title"/);

console.log("multi-space regression checks passed");
