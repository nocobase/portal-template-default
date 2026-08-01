import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const localSdk = path.join(projectRoot, "sdk", "package.json");

const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

if (fs.existsSync(localSdk)) {
  run("pnpm", ["--dir", "sdk", "build"]);
}

run("pnpm", ["exec", "portal-sdk", "check"]);
