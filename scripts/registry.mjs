import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const configPath = path.join(projectRoot, "registry.config.json");
const outputPath = path.join(projectRoot, "registry.json");
const action = process.argv[2];

if (!new Set(["build", "install-missing", "preview"]).has(action)) {
  throw new Error(
    "Usage: node scripts/registry.mjs <build|install-missing|preview>"
  );
}

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
const sourceFiles = new Map();
const sourceMappings = new Map();

const items = sourceConfig.items.map((item) => {
  const source = item.source;
  if (!source) {
    throw new Error(`Registry item ${item.name} is missing its source mapping`);
  }

  assertSafePath(source.root, "registry/", "source");
  assertSafePath(source.target, "src/extensions/", "target");

  const sourceRoot = path.join(projectRoot, source.root);
  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`Registry source does not exist: ${source.root}`);
  }

  sourceMappings.set(`${source.root}\0${source.target}`, source);

  if (action !== "build") return item;

  const allFiles = sourceFiles.get(source.root) ?? walkFiles(sourceRoot);
  sourceFiles.set(source.root, allFiles);
  const { source: _source, ...registryItem } = item;

  return {
    ...registryItem,
    files: allFiles
      .filter((file) => isIncluded(file, source.include))
      .map((file) => ({
        path: path.posix.join(source.root, file),
        type: "registry:file",
        target: path.posix.join(source.target, file),
      })),
  };
});

function copySource(source, overwrite) {
  const sourcePath = path.join(projectRoot, source.root);
  const targetPath = path.join(projectRoot, source.target);

  if (fs.existsSync(targetPath) && !overwrite) {
    console.log(`${source.target}: already installed, preserved`);
    return;
  }

  if (overwrite) {
    fs.rmSync(targetPath, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.cpSync(sourcePath, targetPath, { recursive: true });
    console.log(`${source.target}: preview refreshed`);
    return;
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const temporaryRoot = fs.mkdtempSync(
    path.join(path.dirname(targetPath), `.${path.basename(targetPath)}-install-`)
  );
  const temporaryTarget = path.join(temporaryRoot, path.basename(targetPath));

  try {
    fs.cpSync(sourcePath, temporaryTarget, { recursive: true });
    fs.renameSync(temporaryTarget, targetPath);
    console.log(`${source.target}: installed`);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

if (action === "build") {
  const registry = {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    ...sourceConfig,
    items,
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(registry, null, 2)}\n`);
  for (const item of items) {
    console.log(`${item.name}: ${item.files.length} files`);
  }
} else {
  for (const source of sourceMappings.values()) {
    copySource(source, action === "preview");
  }
}
