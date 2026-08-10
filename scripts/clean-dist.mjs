import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDirs = ["dist", "server-dist"];

for (const outputDir of outputDirs) {
  const outputPath = path.join(rootDir, outputDir);
  fs.rmSync(outputPath, { recursive: true, force: true });
  console.log(`Removed ${outputDir}`);
}
