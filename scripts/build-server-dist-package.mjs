import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const serverDistDir = path.join(rootDir, "dist");
const rootPackagePath = path.join(rootDir, "package.json");
const serverDistPackagePath = path.join(serverDistDir, "package.json");
const serverRuntimeDirs = ["server", "shared"];

const toPosix = (value) => value.split(path.sep).join("/");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

const walkFiles = (directory) => {
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.name === "node_modules") return [];

      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
    })
    .sort((left, right) => left.localeCompare(right));
};

const getPackageName = (specifier) => {
  if (
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    specifier.startsWith("node:")
  ) {
    return undefined;
  }

  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
};

const findBareImports = (content) => {
  const specifiers = new Set();
  const patterns = [
    /\bimport\s+(?:[^"'()]+?\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+[^"']*?\s+from\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      const packageName = getPackageName(match[1]);
      if (packageName) specifiers.add(packageName);
    }
  }

  return specifiers;
};

const getInstalledVersion = (packageName) => {
  const packagePath = path.join(
    rootDir,
    "node_modules",
    ...packageName.split("/"),
    "package.json"
  );

  if (!fs.existsSync(packagePath)) return undefined;
  return readJson(packagePath).version;
};

const getDeclaredVersion = (rootPackage, packageName) => {
  const version =
    rootPackage.dependencies?.[packageName] ??
    rootPackage.devDependencies?.[packageName] ??
    rootPackage.peerDependencies?.[packageName];

  if (!version) return undefined;
  return version.replace(/^[~^]/, "");
};

if (!fs.existsSync(serverDistDir)) {
  throw new Error("Missing dist. Run pnpm build:server first.");
}

const rootPackage = readJson(rootPackagePath);
const files = serverRuntimeDirs.flatMap((runtimeDir) =>
  walkFiles(path.join(serverDistDir, runtimeDir)).filter((file) =>
    /\.[cm]?js$/.test(file)
  )
);
const packageNames = new Set();

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  for (const packageName of findBareImports(content)) {
    packageNames.add(packageName);
  }
}

const dependencies = Object.fromEntries(
  [...packageNames]
    .sort((left, right) => left.localeCompare(right))
    .map((packageName) => {
      const version =
        getInstalledVersion(packageName) ??
        getDeclaredVersion(rootPackage, packageName);

      if (!version) {
        throw new Error(
          `Could not find a declared or installed version for ${packageName}`
        );
      }

      return [packageName, version];
    })
);

const serverDistPackage = {
  version: rootPackage.version ?? "1.0.0",
  private: true,
  type: "module",
  main: "./server/embedded.js",
  exports: {
    ".": "./server/embedded.js",
    "./embedded": "./server/embedded.js",
    "./standalone": "./server/standalone.js",
  },
  scripts: {
    start: "node ./server/standalone.js",
  },
  engines: {
    node: ">=22",
  },
  dependencies,
};

fs.writeFileSync(
  serverDistPackagePath,
  `${JSON.stringify(serverDistPackage, null, 2)}\n`
);

console.log(
  `Generated ${toPosix(path.relative(rootDir, serverDistPackagePath))} with ${Object.keys(
    dependencies
  ).length} production dependencies.`
);
