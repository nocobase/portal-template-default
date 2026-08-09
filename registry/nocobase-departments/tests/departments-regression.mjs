import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync(
  new URL("../departments-api.ts", import.meta.url),
  "utf8"
);
const ui = fs.readFileSync(
  new URL("../departments-manager.tsx", import.meta.url),
  "utf8"
);

for (const contract of [
  'associatedEndpoint("departments", id, "members"',
  'associatedEndpoint("roles", roleName, "departments"',
  '"setOwner"',
  '"setDepartments"',
]) {
  assert.match(api, new RegExp(contract.replace(/[()]/g, "\\$&")));
}
assert.doesNotMatch(api, /resourceOf/);
assert.match(ui, /Set owner/);

console.log("departments regression checks passed");
