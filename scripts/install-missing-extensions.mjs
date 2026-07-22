import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const manifestPath = path.join(projectRoot, "extensions.json");
const lockPath = path.join(projectRoot, "extensions.lock.json");
const stateRoot = path.join(projectRoot, ".extension-state");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));

const resolveProjectPath = (value) => path.resolve(projectRoot, value);

const assertSafeTarget = (value) => {
  const normalized = value.split(path.sep).join("/");
  if (!normalized.startsWith("src/extensions/") || normalized.includes("..")) {
    throw new Error(`Unsafe extension target: ${value}`);
  }
};

const hash = (content) =>
  `sha256-${crypto.createHash("sha256").update(content).digest("base64")}`;

function hashDirectory(directory) {
  const digest = crypto.createHash("sha256");
  const visit = (current, root = current) => {
    const entries = fs
      .readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      const relativePath = path
        .relative(root, entryPath)
        .split(path.sep)
        .join("/");
      if (entry.isDirectory()) {
        visit(entryPath, root);
        continue;
      }
      if (!entry.isFile()) continue;
      digest.update(relativePath);
      digest.update("\0");
      digest.update(fs.readFileSync(entryPath));
      digest.update("\0");
    }
  };
  visit(directory);
  return `sha256-${digest.digest("base64")}`;
}

const getStatePath = (extension) =>
  path.join(stateRoot, `${extension.name}.json`);

function readInstallState(extension) {
  const statePath = getStatePath(extension);
  if (!fs.existsSync(statePath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch {
    return undefined;
  }
}

function writeInstallState(extension, installedHash) {
  fs.mkdirSync(stateRoot, { recursive: true });
  fs.writeFileSync(
    getStatePath(extension),
    `${JSON.stringify(
      {
        version: 1,
        name: extension.name,
        target: extension.target,
        installedHash,
      },
      null,
      2
    )}\n`
  );
}

async function readRegistryItem(resolved) {
  if (/^https?:\/\//.test(resolved)) {
    const response = await fetch(resolved);
    if (!response.ok) {
      throw new Error(
        `Unable to download extension registry (${response.status}): ${resolved}`
      );
    }
    return Buffer.from(await response.arrayBuffer());
  }

  return fs.readFileSync(resolveProjectPath(resolved));
}

function writeRegistryItem(item, temporaryTarget, expectedTarget) {
  if (!Array.isArray(item.files) || item.files.length === 0) {
    throw new Error(`Registry item ${item.name ?? "unknown"} has no files`);
  }

  for (const file of item.files) {
    if (typeof file.target !== "string" || typeof file.content !== "string") {
      throw new Error(
        `Registry item ${item.name ?? "unknown"} has an invalid file`
      );
    }
    const relativeTarget = path.relative(expectedTarget, file.target);
    if (
      relativeTarget.startsWith("..") ||
      path.isAbsolute(relativeTarget) ||
      relativeTarget === ""
    ) {
      throw new Error(
        `Registry file target must be inside ${expectedTarget}: ${file.target}`
      );
    }
    const outputPath = path.join(temporaryTarget, relativeTarget);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, file.content);
  }
}

async function prepareExtension(extension, temporaryTarget) {
  const locked = lock.extensions?.[extension.name];
  if (!locked) {
    throw new Error(
      `Extension ${extension.name} is missing from extensions.lock.json`
    );
  }

  const localSource = locked.source
    ? resolveProjectPath(locked.source)
    : undefined;
  if (localSource && fs.existsSync(localSource)) {
    fs.cpSync(localSource, temporaryTarget, { recursive: true });
    return;
  }

  const resolvedItems = Array.isArray(locked.resolved)
    ? locked.resolved
    : [locked.resolved];
  for (const [index, resolved] of resolvedItems.entries()) {
    const content = await readRegistryItem(resolved);
    const expectedIntegrity = Array.isArray(locked.integrity)
      ? locked.integrity[index]
      : locked.integrity;
    if (expectedIntegrity && hash(content) !== expectedIntegrity) {
      throw new Error(
        `Integrity check failed for extension ${extension.name}: ${resolved}`
      );
    }
    const item = JSON.parse(content.toString("utf8"));
    writeRegistryItem(item, temporaryTarget, extension.target);
  }
}

async function installExtension(extension) {
  assertSafeTarget(extension.target);
  const targetPath = resolveProjectPath(extension.target);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const temporaryRoot = fs.mkdtempSync(
    path.join(path.dirname(targetPath), `.${extension.name}-install-`)
  );
  const temporaryTarget = path.join(temporaryRoot, extension.name);

  try {
    await prepareExtension(extension, temporaryTarget);
    const desiredHash = hashDirectory(temporaryTarget);

    if (fs.existsSync(targetPath)) {
      const currentHash = hashDirectory(targetPath);
      if (currentHash === desiredHash) {
        writeInstallState(extension, desiredHash);
        console.log(`${extension.name}: already up to date`);
        return;
      }

      const existingState = readInstallState(extension);
      if (!existingState || existingState.installedHash !== currentHash) {
        console.log(`${extension.name}: local changes detected, preserved`);
        return;
      }

      const backupPath = path.join(temporaryRoot, `${extension.name}-previous`);
      fs.renameSync(targetPath, backupPath);
      try {
        fs.renameSync(temporaryTarget, targetPath);
      } catch (error) {
        fs.renameSync(backupPath, targetPath);
        throw error;
      }
      fs.rmSync(backupPath, { recursive: true, force: true });
      writeInstallState(extension, desiredHash);
      console.log(`${extension.name}: updated ${extension.target}`);
      return;
    }

    fs.renameSync(temporaryTarget, targetPath);
    writeInstallState(extension, desiredHash);
    console.log(`${extension.name}: installed to ${extension.target}`);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

for (const extension of manifest.extensions ?? []) {
  await installExtension(extension);
}
