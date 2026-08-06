import fs from "node:fs";
import path from "node:path";

const outputDir = path.resolve(process.cwd(), "server-dist-cjs");

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  path.join(outputDir, "package.json"),
  `${JSON.stringify({ type: "commonjs" }, null, 2)}\n`
);
