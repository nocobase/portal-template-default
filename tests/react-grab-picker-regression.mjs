import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const appSource = await readFile(
  new URL("../src/App.tsx", import.meta.url),
  "utf8"
);
assert.match(appSource, /import\.meta\.env\.DEV/);
assert.match(appSource, /react-grab-picker/);

const pickerSource = await readFile(
  new URL(
    "../src/components/development/react-grab-picker.tsx",
    import.meta.url
  ),
  "utf8"
);
assert.match(pickerSource, /import\("react-grab\/core"\)/);
assert.match(pickerSource, /telemetry:\s*false/);
assert.doesNotMatch(
  pickerSource,
  /registerPlugin|transformCopyContent|toolbar:\s*\{|<Button|ChevronUp|freezeReactUpdates/
);

await assert.rejects(
  access(
    new URL(
      "../src/components/development/react-grab-picker-content.ts",
      import.meta.url
    )
  ),
  { code: "ENOENT" }
);

console.log("React Grab default experience regression tests passed");
