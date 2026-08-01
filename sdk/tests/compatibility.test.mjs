import assert from "node:assert/strict";
import test from "node:test";

import semver from "semver";

test("the initial SDK range includes the current template and excludes the next major", () => {
  const range = ">=2.0.0 <3.0.0";
  assert.equal(semver.satisfies("2.0.0", range), true);
  assert.equal(semver.satisfies("2.9.0", range), true);
  assert.equal(semver.satisfies("3.0.0", range), false);
});
