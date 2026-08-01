import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const processes = [];
let stopping = false;

const start = (args) => {
  const child = spawn(pnpm, args, {
    cwd: projectRoot,
    stdio: "inherit",
  });
  processes.push(child);
  child.on("error", (error) => {
    console.error(error);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    if (stopping) return;
    if (signal) {
      stop(1);
      return;
    }
    stop(code ?? 1);
  });
};

const stop = (exitCode = 0) => {
  if (stopping) return;
  stopping = true;
  for (const child of processes) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
    }
  }
  process.exitCode = exitCode;
};

process.once("SIGINT", () => stop(0));
process.once("SIGTERM", () => stop(0));

if (fs.existsSync(path.join(projectRoot, "sdk", "package.json"))) {
  start(["--dir", "sdk", "dev"]);
}
start(["exec", "vite", "--host", "0.0.0.0"]);
