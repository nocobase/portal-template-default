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
const itemNames = new Set();

const items = sourceConfig.items.map((item) => {
  if (!item.name || itemNames.has(item.name)) {
    throw new Error(`Registry item name must be unique: ${item.name}`);
  }
  itemNames.add(item.name);
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

  if (!Array.isArray(source.include) || !source.include.length) {
    throw new Error(`Registry item ${item.name} must include at least one path`);
  }

  const mappingKey = `${source.root}\0${source.target}`;
  const mapping = sourceMappings.get(mappingKey) ?? {
    root: source.root,
    target: source.target,
    include: new Set(),
  };
  source.include.forEach((entry) => mapping.include.add(entry));
  sourceMappings.set(mappingKey, mapping);

  const allFiles = sourceFiles.get(source.root) ?? walkFiles(sourceRoot);
  sourceFiles.set(source.root, allFiles);
  const includedFiles = allFiles.filter((file) =>
    isIncluded(file, source.include)
  );
  if (!includedFiles.length) {
    throw new Error(
      `Registry item ${item.name} include paths did not match any files`
    );
  }

  if (action !== "build") return item;
  const { source: _source, ...registryItem } = item;

  return {
    ...registryItem,
    files: includedFiles.map((file) => ({
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

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const temporaryRoot = fs.mkdtempSync(
    path.join(path.dirname(targetPath), `.${path.basename(targetPath)}-install-`)
  );
  const temporaryTarget = path.join(temporaryRoot, path.basename(targetPath));

  try {
    const includedFiles = walkFiles(sourcePath).filter((file) =>
      isIncluded(file, [...source.include])
    );
    for (const file of includedFiles) {
      const sourceFile = path.join(sourcePath, file);
      const targetFile = path.join(temporaryTarget, file);
      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      fs.copyFileSync(sourceFile, targetFile);
    }
    if (overwrite) fs.rmSync(targetPath, { recursive: true, force: true });
    fs.renameSync(temporaryTarget, targetPath);
    console.log(
      `${source.target}: ${overwrite ? "preview refreshed" : "installed"}`
    );
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
