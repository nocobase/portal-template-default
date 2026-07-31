import assert from "node:assert/strict";
import test from "node:test";

import {
  allowsMultipleFiles,
  serializeFileFieldValue,
} from "../registry/nocobase-file-upload/form-value.ts";
import { isNocoBaseManagedFileUrl } from "../registry/nocobase-file-upload/file-url-policy.ts";
import {
  getAvailableFileCount,
  resolveFileUploadMode,
} from "../registry/nocobase-file-upload/upload-strategy.ts";
import {
  matchesFileRules,
  resolveMaxFileSize,
  validateFileForField,
} from "../registry/nocobase-file-upload/validation.ts";
import { validateFieldValidationControllers } from "../src/lib/field-validation.ts";
import type {
  FileFieldDescriptor,
  FileStorageInfo,
  NocoBaseFileRecord,
} from "../registry/nocobase-file-upload/types.ts";

const multiDescriptor: FileFieldDescriptor = {
  sourceCollection: "documents",
  fieldName: "files",
  fileCollection: "files",
  relation: "belongsToMany",
};

const singleDescriptor: FileFieldDescriptor = {
  ...multiDescriptor,
  fieldName: "cover",
  relation: "belongsTo",
};

const localStorage: FileStorageInfo = {
  id: 1,
  name: "local",
  type: "local",
};

test("upload strategy remains compatible across storage capability versions", () => {
  assert.equal(resolveFileUploadMode(localStorage), "multipart");
  assert.equal(
    resolveFileUploadMode({ ...localStorage, type: "s3-compatible" }),
    "direct"
  );
  assert.equal(
    resolveFileUploadMode({
      ...localStorage,
      type: "s3-compatible",
      clientUpload: false,
    }),
    "multipart"
  );
  assert.equal(
    resolveFileUploadMode({ ...localStorage, clientUpload: true }),
    "direct"
  );
  assert.equal(resolveFileUploadMode(localStorage, "direct"), "direct");
});

test("reserved uploads count toward the file limit", () => {
  assert.equal(getAvailableFileCount(1, 0, 1, 1), 0);
  assert.equal(getAvailableFileCount(4, 1, 1, 5), 2);
  assert.equal(getAvailableFileCount(undefined, 2, 3, 4), 4);
});

test("only NocoBase-managed URLs receive preview and download flags", () => {
  const browserUrl = "https://portal.example.com/users";
  const apiUrl = "https://api.example.com/api";

  assert.equal(
    isNocoBaseManagedFileUrl("/storage/files/report.pdf", apiUrl, browserUrl),
    true
  );
  assert.equal(
    isNocoBaseManagedFileUrl(
      "https://api.example.com/storage/report.pdf",
      apiUrl,
      browserUrl
    ),
    true
  );
  assert.equal(
    isNocoBaseManagedFileUrl(
      "https://bucket.example.com/report.pdf?X-Amz-Signature=abc",
      apiUrl,
      browserUrl
    ),
    false
  );
  assert.equal(
    isNocoBaseManagedFileUrl("data:text/plain,hello", apiUrl, browserUrl),
    false
  );
});

test("relation shape controls form serialization", () => {
  const first: NocoBaseFileRecord = { id: 1, filename: "first.txt" };
  const second: NocoBaseFileRecord = { id: 2, filename: "second.txt" };

  assert.equal(allowsMultipleFiles(multiDescriptor), true);
  assert.equal(allowsMultipleFiles(singleDescriptor), false);
  assert.deepEqual(serializeFileFieldValue(multiDescriptor, [first, second]), [
    { id: 1 },
    { id: 2 },
  ]);
  assert.deepEqual(serializeFileFieldValue(singleDescriptor, [first, second]), {
    id: 1,
  });
});

test("field and storage validation use the strictest rules", () => {
  const image = new File([new Uint8Array(8)], "avatar.png", {
    type: "image/png",
  });
  const text = new File([new Uint8Array(8)], "notes.txt", {
    type: "text/plain",
  });
  const messages = {
    fileSizeExceeded: (size: number) => `too large: ${size}`,
    fieldMimeTypeRejected: "wrong field type",
  };

  assert.equal(matchesFileRules(image, ["image/*", ".pdf"]), true);
  assert.equal(matchesFileRules(text, ["image/*", ".pdf"]), false);
  assert.equal(
    resolveMaxFileSize(
      { ...singleDescriptor, maxSize: 20 },
      { ...localStorage, rules: { size: 10 } }
    ),
    10
  );
  assert.deepEqual(
    validateFileForField(
      image,
      { ...singleDescriptor, accept: "image/*" },
      messages
    ),
    { valid: true }
  );
  assert.deepEqual(
    validateFileForField(
      text,
      { ...singleDescriptor, accept: "image/*" },
      messages
    ),
    { valid: false, code: "mimetype", message: "wrong field type" }
  );
});

test("field validation controllers stop at the first validation error", async () => {
  const calls: string[] = [];
  const result = await validateFieldValidationControllers([
    {
      validate: () => {
        calls.push("first");
        return true;
      },
    },
    {
      validate: async () => {
        calls.push("second");
        return "Upload is still in progress";
      },
    },
    {
      validate: () => {
        calls.push("third");
        return true;
      },
    },
  ]);

  assert.equal(result, "Upload is still in progress");
  assert.deepEqual(calls, ["first", "second"]);
});
