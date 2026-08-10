import fs from "node:fs";
import path from "node:path";

import { build } from "vite";
import { afterEach, expect, it } from "vitest";

import { portalRawIndexHtmlPlugin } from "../src/vite/index.ts";

const fixtureRoots: string[] = [];

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

it("resolves lazy chunk dependencies from the runtime Portal base", async () => {
  const root = fs.mkdtempSync(
    path.join(process.cwd(), ".portal-runtime-asset-base-")
  );
  fixtureRoots.push(root);
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(
    path.join(root, "index.html"),
    '<div id="app"></div><script type="module" src="/src/main.js"></script>'
  );
  fs.writeFileSync(
    path.join(root, "src/main.js"),
    [
      'window.loadFirst = () => import("./first.js");',
      'window.loadSecond = () => import("./second.js");',
    ].join("\n")
  );
  fs.writeFileSync(
    path.join(root, "src/first.js"),
    'import { shared } from "./shared.js"; export default shared;'
  );
  fs.writeFileSync(
    path.join(root, "src/second.js"),
    'import { shared } from "./shared.js"; export default shared;'
  );
  fs.writeFileSync(
    path.join(root, "src/shared.js"),
    'export const shared = "shared";'
  );

  await build({
    root,
    base: "/",
    logLevel: "silent",
    plugins: [portalRawIndexHtmlPlugin({ root, base: "/" })],
  });

  const assetsDir = path.join(root, "dist/assets");
  const scripts = fs
    .readdirSync(assetsDir)
    .filter((file) => file.endsWith(".js"))
    .map((file) => fs.readFileSync(path.join(assetsDir, file), "utf8"))
    .join("\n");
  const rawHtml = fs.readFileSync(path.join(root, "dist/index.raw.html"), "utf8");

  expect(scripts).toContain("window.__NOCOBASE_PORTAL_ENV__");
  expect(rawHtml).toContain("window.__NOCOBASE_PORTAL_ENV__");
  expect(scripts).toContain("window.location.origin");
  expect(scripts).toContain(
    'String(window.__NOCOBASE_PORTAL_ENV__?.NOCOBASE_PORTAL_BASE || "/").replace(/\\/?$/, "/")'
  );
  expect(scripts).not.toMatch(/["']\/assets\//);

  const resolvedAssetUrl = new URL(
    "assets/auto-login-provider-D7j6wOLD.js",
    new URL(
      String("/nocobase/x/main").replace(/\/?$/, "/"),
      "https://pr-10318.v2.test.nocobase.com"
    )
  ).href;

  expect(resolvedAssetUrl).toBe(
    "https://pr-10318.v2.test.nocobase.com/nocobase/x/main/assets/auto-login-provider-D7j6wOLD.js"
  );
});
