import { nocobaseClient } from "@nocobase/portal-sdk/client";

import type { AsyncImportTask } from "./types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findTask(value: unknown, depth = 0): UnknownRecord | undefined {
  if (!isRecord(value) || depth > 5) return undefined;
  if ((typeof value.id === "string" || typeof value.id === "number") && "status" in value) {
    return value;
  }
  for (const key of ["data", "result"]) {
    const task = findTask(value[key], depth + 1);
    if (task) return task;
  }
  return undefined;
}

function readNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function normalizeAsyncImportTask(payload: unknown): AsyncImportTask {
  const task = findTask(payload);
  if (!task) throw new Error("Async import task was not found in the response.");
  const status = task.status === null ? null : readNumber(task.status);

  return {
    id: String(task.id),
    title: typeof task.title === "string" ? task.title : undefined,
    status,
    result: task.result,
    cancelable: task.cancelable === true,
    progressCurrent: readNumber(task.progressCurrent),
    progressTotal: readNumber(task.progressTotal),
  };
}

export async function getAsyncImportTask(
  taskId: string,
  signal?: AbortSignal
) {
  const payload = await nocobaseClient.action<unknown>("asyncTasks", "get", {
    query: { filterByTk: taskId },
    signal,
    unwrap: "none",
  });
  return normalizeAsyncImportTask(payload);
}

export async function cancelAsyncImportTask(taskId: string) {
  await nocobaseClient.action("asyncTasks", "stop", {
    method: "POST",
    query: { filterByTk: taskId },
    unwrap: "none",
  });
}
