import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync(
  new URL("../password-policy-api.ts", import.meta.url),
  "utf8",
);
const ui = fs.readFileSync(
  new URL("../password-policy-manager.tsx", import.meta.url),
  "utf8",
);

assert.match(api, /passwordPolicy/);
assert.match(api, /lockedUsers/);
assert.match(api, /isPasswordPolicyUnavailable/);
assert.match(ui, /Local demo mode/);
assert.match(ui, /Password rules/);
assert.match(ui, /Sign-in security/);
assert.match(ui, /Locked users/);

console.log("password policy regression checks passed");
