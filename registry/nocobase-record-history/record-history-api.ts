import { nocobaseClient, NocoBaseHttpError } from "@nocobase/portal-sdk/client";

import type {
  ListRecordHistoryOptions,
  RecordFieldChange,
  RecordHistory,
  RecordHistoryErrorCode,
  RecordHistoryListResult,
  RecordHistoryUser,
} from "./types";

export function getRecordHistoryErrorCode(error: unknown): RecordHistoryErrorCode {
  if (error instanceof NocoBaseHttpError) {
    if (error.status === 404) return "pluginUnavailable";
    if (error.status === 403) return "forbidden";
    if (error.status === 401) return "unauthorized";
    return "load";
  }
  return error instanceof TypeError ? "network" : "load";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function normalizeUser(value: unknown): RecordHistoryUser | undefined {
  if (!isRecord(value)) return undefined;
  return {
    id:
      typeof value.id === "string" || typeof value.id === "number"
        ? value.id
        : undefined,
    nickname: typeof value.nickname === "string" ? value.nickname : undefined,
    username: typeof value.username === "string" ? value.username : undefined,
  };
}

function normalizeFieldChange(value: unknown): RecordFieldChange | undefined {
  if (!isRecord(value) || !readString(value.fieldPath)) return undefined;
  return {
    id:
      typeof value.id === "string" || typeof value.id === "number"
        ? value.id
        : undefined,
    fieldPath: readString(value.fieldPath),
    before: value.before,
    after: value.after,
    options: isRecord(value.options) ? value.options : undefined,
  };
}

export function normalizeRecordHistory(value: unknown): RecordHistory | undefined {
  if (!isRecord(value) || !readString(value.uuid)) return undefined;
  const changes = Array.isArray(value.recordFieldHistory)
    ? value.recordFieldHistory.flatMap((item) => {
        const change = normalizeFieldChange(item);
        return change ? [change] : [];
      })
    : [];

  return {
    uuid: readString(value.uuid),
    requestId: readString(value.requestId) || undefined,
    recordId: readString(value.recordId),
    collectionName: readString(value.collectionName),
    dataSourceKey: readString(value.dataSourceKey) || "main",
    action: readString(value.action),
    createdAt: readString(value.createdAt) || undefined,
    user: normalizeUser(value.user),
    recordFieldHistory: changes,
    snapshot: isRecord(value.snapshot) ? value.snapshot : undefined,
  };
}

export function normalizeRecordHistoryList(value: unknown): RecordHistoryListResult {
  const findList = (
    payload: unknown,
    depth = 0
  ): { sourceRows: unknown[]; count?: number } => {
    if (Array.isArray(payload)) return { sourceRows: payload };
    if (!isRecord(payload) || depth > 4) return { sourceRows: [] };
    const meta = isRecord(payload.meta) ? payload.meta : undefined;
    const countValue = payload.count ?? meta?.count;
    const count = Number(countValue);
    if (Array.isArray(payload.rows)) {
      return {
        sourceRows: payload.rows,
        count: Number.isFinite(count) ? count : undefined,
      };
    }
    if (Array.isArray(payload.data)) {
      return {
        sourceRows: payload.data,
        count: Number.isFinite(count) ? count : undefined,
      };
    }
    const nested = findList(payload.data, depth + 1);
    return {
      ...nested,
      count: Number.isFinite(count) ? count : nested.count,
    };
  };
  const { sourceRows, count: normalizedCount } = findList(value);
  const rows = sourceRows.flatMap((item) => {
    const history = normalizeRecordHistory(item);
    return history ? [history] : [];
  });
  return { rows, count: normalizedCount ?? rows.length };
}

export async function listRecordHistory({
  collectionName,
  dataSourceKey = "main",
  recordId,
  filter,
  page = 1,
  pageSize = 10,
  sort = "-createdAt",
  appendSnapshots = true,
  signal,
}: ListRecordHistoryOptions): Promise<RecordHistoryListResult> {
  const scope: Record<string, unknown> = {
    dataSourceKey,
    collectionName,
    ...(recordId === undefined ? {} : { recordId: String(recordId) }),
  };
  const mergedFilter = filter ? { $and: [scope, filter] } : scope;
  const response = await nocobaseClient.action<unknown>("recordHistories", "list", {
    query: {
      filter: JSON.stringify(mergedFilter),
      appends: ["recordFieldHistory", "user"],
      appendSnapshots,
      page,
      pageSize,
      sort,
    },
    signal,
    unwrap: "none",
  });

  return normalizeRecordHistoryList(response);
}
