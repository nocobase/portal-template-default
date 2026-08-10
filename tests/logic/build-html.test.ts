import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const originalEnv = { ...process.env };
const testDir = path.dirname(fileURLToPath(import.meta.url));
const portalRoot = path.resolve(testDir, "../..");
const portalParent = path.resolve(portalRoot, "..");
const buildHtmlScript = path.join(portalRoot, "scripts/build-html.mjs");
const distClientDir = path.join(portalRoot, "dist/client");
const buildHtmlMode = "build-html-test";

const fileBackups = new Map<
  string,
  { existed: boolean; content?: string }
>();

afterEach(() => {
  process.env = { ...originalEnv };

  for (const [file, backup] of fileBackups) {
    if (backup.existed) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, backup.content ?? "");
    } else {
      fs.rmSync(file, { force: true });
    }
  }
  fileBackups.clear();
});

const preserveFile = (file: string) => {
  if (fileBackups.has(file)) return;

  fileBackups.set(
    file,
    fs.existsSync(file)
      ? { existed: true, content: fs.readFileSync(file, "utf8") }
      : { existed: false }
  );
};

const writeFile = (file: string, content: string) => {
  preserveFile(file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

const runBuildHtml = () => {
  execFileSync(process.execPath, [buildHtmlScript], {
    cwd: portalRoot,
    env: {
      ...process.env,
      MODE: buildHtmlMode,
    },
    stdio: "pipe",
  });
};

describe("build-html", () => {
  it("prefixes built asset URLs with the app public path from the API proxy target", () => {
    const rootServerEnv = path.join(portalRoot, `.env.server.${buildHtmlMode}`);
    const parentServerEnv = path.join(
      portalParent,
      `.env.server.${buildHtmlMode}`
    );
    const rootClientEnv = path.join(portalRoot, `.env.client.${buildHtmlMode}`);
    const parentClientEnv = path.join(
      portalParent,
      `.env.client.${buildHtmlMode}`
    );
    const rawIndexPath = path.join(distClientDir, "index.raw.html");
    const indexPath = path.join(distClientDir, "index.html");

    for (const file of [
      rootServerEnv,
      parentServerEnv,
      rootClientEnv,
      parentClientEnv,
      rawIndexPath,
      indexPath,
    ]) {
      preserveFile(file);
      fs.rmSync(file, { force: true });
    }

    writeFile(
      rootServerEnv,
      [
        "NOCOBASE_API_PROXY_TARGET=https://pr-10318.v2.test.nocobase.com/nocobase/api",
        "NOCOBASE_PORTAL_NAME=main",
      ].join("\n")
    );
    writeFile(
      rawIndexPath,
      [
        "<!doctype html>",
        "<html>",
        "  <head>",
        '    <link rel="stylesheet" crossorigin href="/x/main/assets/index-PQRTpU9T.css">',
        "  </head>",
        "  <body>",
        '    <script type="module" crossorigin src="/x/main/assets/index-zHBN7rCN.js"></script>',
        "  </body>",
        "</html>",
      ].join("\n")
    );

    runBuildHtml();

    const html = fs.readFileSync(indexPath, "utf8");

    expect(html).toContain(
      'src="/nocobase/x/main/assets/index-zHBN7rCN.js"'
    );
    expect(html).toContain(
      'href="/nocobase/x/main/assets/index-PQRTpU9T.css"'
    );
    expect(html).toContain('"NOCOBASE_API_URL":"/nocobase/portals/main/api"');
    expect(html).toContain('"NOCOBASE_PORTAL_BASE":"/nocobase/x/main/"');
    expect(html).toContain('"NOCOBASE_WS_URL":"/nocobase/portals/main/ws"');
  });
});
