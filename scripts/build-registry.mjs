import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const configPath = path.join(projectRoot, "registry.config.json");
const outputPath = path.join(projectRoot, "registry.json");
const shouldPreview = process.argv.includes("--preview");

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function walkFiles(directory, root = directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory()
        ? walkFiles(entryPath, root)
        : [toPosix(path.relative(root, entryPath))];
    })
    .sort((left, right) => left.localeCompare(right));
}

function isIncluded(file, include) {
  return include.some((entry) => {
    const normalized = entry.replace(/^\.\//, "").replace(/\/$/, "");
    return (
      normalized === "." ||
      file === normalized ||
      file.startsWith(`${normalized}/`)
    );
  });
}

function assertSafePath(value, prefix, label) {
  if (!value.startsWith(prefix) || value.includes("..")) {
    throw new Error(`Unsafe ${label} path: ${value}`);
  }
}

const sourceConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
const config = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  ...sourceConfig,
};
const sourceFiles = new Map();
const previewMappings = new Map();

for (const item of config.items) {
  const source = item.source;
  if (!source) {
    throw new Error(`Registry item ${item.name} is missing its source mapping`);
  }

  assertSafePath(source.root, "registry/", "source");
  assertSafePath(source.target, "src/extensions/", "target");
  previewMappings.set(source.root, source.target);

  const sourceRoot = path.join(projectRoot, source.root);
  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`Registry source does not exist: ${source.root}`);
  }

  const allFiles = sourceFiles.get(source.root) ?? walkFiles(sourceRoot);
  sourceFiles.set(source.root, allFiles);

  item.files = allFiles
    .filter((file) => isIncluded(file, source.include))
    .map((file) => ({
      path: path.posix.join(source.root, file),
      type: "registry:file",
      target: path.posix.join(source.target, file),
    }));

  delete item.source;
}

if (shouldPreview) {
  for (const [sourceRoot, targetRoot] of previewMappings) {
    const sourcePath = path.join(projectRoot, sourceRoot);
    const targetPath = path.join(projectRoot, targetRoot);
    fs.rmSync(targetPath, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.cpSync(sourcePath, targetPath, { recursive: true });
  }
}

fs.writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`);

for (const item of config.items) {
  console.log(`${item.name}: ${item.files.length} files`);
}
