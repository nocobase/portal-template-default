import assert from "node:assert/strict";
import test from "node:test";
import {
  clampPage,
  normalizePagedResult,
  pageAfterDelete,
} from "../providers/utils.ts";
import {
  canMaintainKnowledgeBaseDocument,
  canMaintainKnowledgeBaseDocuments,
  isKnowledgeBaseDocumentProcessing,
  type KnowledgeBase,
} from "../providers/types.ts";
import { getKnowledgeBaseServiceKey } from "../hooks/shared.ts";
import fs from "node:fs";
import path from "node:path";

test("normalizes every supported NocoBase paged envelope", () => {
  const cases: Array<[unknown, string[]]> = [
    [{ data: [{ id: "a" }], meta: { count: 3, page: 2, pageSize: 5 } }, ["a"]],
    [{ data: { rows: [{ id: "b" }], count: 4, page: 3, pageSize: 6 } }, ["b"]],
    [{ data: { data: [{ id: "nested" }], meta: { count: 2, page: 2, pageSize: 4 } } }, ["nested"]],
    [{ rows: [{ id: "c" }], count: 1, page: 1, pageSize: 20 }, ["c"]],
    [[{ id: "d" }], ["d"]],
  ];
  for (const [payload, ids] of cases) {
    assert.deepEqual(
      normalizePagedResult<{ id: string }>(payload).rows.map((row) => row.id),
      ids,
    );
  }
  assert.equal(
    normalizePagedResult<{ id: string }>({
      data: [{ id: "a" }],
      meta: { count: 3, page: 2, pageSize: 5 },
    }).count,
    3,
  );
});


test("clamps invalid pages and falls back after deleting a final item", () => {
  assert.equal(clampPage(9, 7, 5), 2);
  assert.equal(pageAfterDelete(2, 6, 5), 1);
});

test("LOCAL gates document management and accessAbility gates document maintenance affordances", () => {
  const local: KnowledgeBase = {
    id: 1,
    key: "local",
    name: "Local",
    knowledgeBaseType: "LOCAL",
    enabled: true,
  };
  const readonly: KnowledgeBase = { ...local, knowledgeBaseType: "READONLY" };
  const external: KnowledgeBase = { ...local, knowledgeBaseType: "EXTERNAL" };
  assert.equal(canMaintainKnowledgeBaseDocuments(local), true);
  assert.equal(canMaintainKnowledgeBaseDocuments(readonly), false);
  assert.equal(canMaintainKnowledgeBaseDocuments(external), false);
  assert.equal(
    canMaintainKnowledgeBaseDocument({ id: 1, knowledgeBaseKey: "local", accessAbility: "readWrite" }),
    true,
  );
  assert.equal(
    canMaintainKnowledgeBaseDocument({ id: 2, knowledgeBaseKey: "local", accessAbility: "readOnly" }),
    false,
  );
  assert.equal(canMaintainKnowledgeBaseDocument({ id: 3, knowledgeBaseKey: "local" }), false);
});

test("document processing covers queued and active indexing or segmentation", () => {
  assert.equal(isKnowledgeBaseDocumentProcessing({ indexStatus: "PENDING" }), true);
  assert.equal(isKnowledgeBaseDocumentProcessing({ indexStatus: "PROCESSING" }), true);
  assert.equal(isKnowledgeBaseDocumentProcessing({ segmentStatus: "processing" }), true);
  assert.equal(isKnowledgeBaseDocumentProcessing({ indexStatus: "SUCCESS", segmentStatus: "FAILED" }), false);
});

test("request keys preserve injected service identity without serializing adapter methods", () => {
  const first = {} as Parameters<typeof getKnowledgeBaseServiceKey>[0];
  const second = {} as Parameters<typeof getKnowledgeBaseServiceKey>[0];
  assert.equal(getKnowledgeBaseServiceKey(first), getKnowledgeBaseServiceKey(first));
  assert.notEqual(getKnowledgeBaseServiceKey(first), getKnowledgeBaseServiceKey(second));
});

test("resource hooks live in focused modules without routing dependencies", () => {
  const hooksRoot = path.resolve("registry/nocobase-ai-knowledge-base/hooks");
  const index = fs.readFileSync(path.join(hooksRoot, "index.ts"), "utf8");
  const knowledgeBase = fs.readFileSync(path.join(hooksRoot, "use-knowledge-base.ts"), "utf8");
  const document = fs.readFileSync(path.join(hooksRoot, "use-knowledge-base-document.ts"), "utf8");
  const segment = fs.readFileSync(path.join(hooksRoot, "use-knowledge-base-segment.ts"), "utf8");
  const shared = fs.readFileSync(path.join(hooksRoot, "shared.ts"), "utf8");
  const hookSources = `${knowledgeBase}\n${document}\n${segment}`;
  assert.deepEqual(index.trim().split("\n"), [
    'export * from "./use-knowledge-base";',
    'export * from "./use-knowledge-base-document";',
    'export * from "./use-knowledge-base-segment";',
  ]);
  assert.match(knowledgeBase, /export function useKnowledgeBase\(/);
  assert.match(document, /export function useKnowledgeBaseDocument\(/);
  assert.match(segment, /export function useKnowledgeBaseSegment\(/);
  assert.match(shared, /export const getKnowledgeBaseServiceKey/);
  assert.match(shared, /export function useRequest/);
  assert.equal(fs.existsSync(path.join(hooksRoot, "service-key.ts")), false);
  assert.equal(fs.existsSync(path.join(hooksRoot, "use-request.ts")), false);
  assert.doesNotMatch(hookSources, /useParams|useSearchParams|URLSearchParams|useLocation/);
});
