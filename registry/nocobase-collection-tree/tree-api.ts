import { nocobaseClient } from "@nocobase/portal-sdk/client";

import { normalizeServerTree } from "./tree-utils";
import type {
  TreeKey,
  TreeListOptions,
  TreeListResult,
  TreeRecord,
} from "./types";

const headers = (key: string) =>
  key === "main" ? undefined : { "X-Data-Source": key };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeListResponse(
  payload: unknown,
  childrenField: string
): TreeListResult {
  let current = payload;
  let count: number | undefined;

  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(current)) {
      const rows = normalizeServerTree(current as TreeRecord[], childrenField);
      return { rows, count: count ?? rows.length };
    }
    if (!isRecord(current)) break;
    const meta = isRecord(current.meta) ? current.meta : undefined;
    const nextCount = Number(current.count ?? meta?.count);
    if (Number.isFinite(nextCount)) count = nextCount;
    current = current.data;
  }

  return { rows: [], count: count ?? 0 };
}

export async function listTreeRecordPage(
  collectionName: string,
  {
    dataSourceKey = "main",
    page = 1,
    pageSize = 20,
    filter,
    sort,
    fields,
    childrenField = "children",
  }: TreeListOptions = {}
): Promise<TreeListResult> {
  const payload = await nocobaseClient.action<unknown>(collectionName, "list", {
    query: {
      tree: true,
      page,
      pageSize,
      ...(filter ? { filter: JSON.stringify(filter) } : {}),
      ...(sort?.length ? { sort } : {}),
      ...(fields?.length ? { fields } : {}),
    },
    headers: headers(dataSourceKey),
    unwrap: "none",
  });

  return normalizeListResponse(payload, childrenField);
}

export async function listTreeRecords(
  collectionName: string,
  dataSourceKey = "main",
  pageSize = 20
) {
  const result = await listTreeRecordPage(collectionName, {
    dataSourceKey,
    pageSize,
  });
  return result.rows;
}

export async function createTreeRecord(
  collectionName: string,
  values: Record<string, unknown>,
  parentId?: TreeKey | null,
  parentField = "parent",
  dataSourceKey = "main"
) {
  return nocobaseClient.action(collectionName, "create", {
    method: "POST",
    body: {
      ...values,
      [parentField]: parentId == null ? null : { id: parentId },
    },
    headers: headers(dataSourceKey),
  });
}

export async function updateTreeRecord(
  collectionName: string,
  id: TreeKey,
  values: Record<string, unknown>,
  parentId?: TreeKey | null,
  parentField = "parent",
  dataSourceKey = "main"
) {
  return nocobaseClient.action(collectionName, "update", {
    method: "POST",
    query: { filterByTk: id },
    body: {
      ...values,
      [parentField]: parentId == null ? null : { id: parentId },
    },
    headers: headers(dataSourceKey),
  });
}

export async function destroyTreeRecord(
  collectionName: string,
  id: TreeKey,
  dataSourceKey = "main"
) {
  return nocobaseClient.action(collectionName, "destroy", {
    method: "POST",
    query: { filterByTk: id },
    headers: headers(dataSourceKey),
  });
}
