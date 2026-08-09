import {
  getNocoBaseErrorMessage,
  NocoBaseHttpError,
  nocobaseClient,
} from "@nocobase/portal-sdk/client";

import type {
  DownloadImportTemplateOptions,
  ImportCompletedResult,
  ImportRecordsOptions,
  ImportRecordsResult,
  ImportStats,
  ImportTemplateResult,
} from "./types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function findRecord(
  value: unknown,
  predicate: (record: UnknownRecord) => boolean,
  depth = 0
): UnknownRecord | undefined {
  if (!isRecord(value) || depth > 5) return undefined;
  if (predicate(value)) return value;

  for (const key of ["data", "result", "stats", "meta"]) {
    const nested = findRecord(value[key], predicate, depth + 1);
    if (nested) return nested;
  }
  return undefined;
}

function normalizeStats(payload: unknown): ImportStats {
  const record =
    findRecord(payload, (candidate) =>
      [
        "successCount",
        "success",
        "total",
        "skipped",
        "updated",
        "failed",
      ].some((key) => key in candidate)
    ) ?? {};
  const success = readNumber(record, ["success", "successCount"]) ?? 0;
  const skipped = readNumber(record, ["skipped", "skip"]) ?? 0;
  const updated = readNumber(record, ["updated", "update"]) ?? 0;
  const failed = readNumber(record, ["failed", "failure", "failureCount"]) ?? 0;
  const total = readNumber(record, ["total"]) ?? success + skipped + updated + failed;

  return { total, success, skipped, updated, failed };
}

export function normalizeImportPayload(payload: unknown): ImportRecordsResult {
  const taskRecord = findRecord(
    payload,
    (record) => typeof record.taskId === "string" || typeof record.taskId === "number"
  );
  if (taskRecord) {
    return {
      type: "queued",
      taskId: String(taskRecord.taskId),
      raw: payload,
    };
  }

  return {
    type: "completed",
    stats: normalizeStats(payload),
    raw: payload,
  };
}

export function normalizeCompletedImportPayload(
  payload: unknown
): ImportCompletedResult {
  const result = normalizeImportPayload(payload);
  return result.type === "completed"
    ? result
    : {
        type: "completed",
        stats: normalizeStats(payload),
        raw: payload,
      };
}

function getDataSourceHeaders(dataSourceKey: string) {
  return dataSourceKey === "main"
    ? undefined
    : { "X-Data-Source": dataSourceKey };
}

async function readErrorPayload(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => undefined);
  }
  return response.text().catch(() => undefined);
}

function decodeFilename(value: string) {
  const unquoted = value.trim().replace(/^"|"$/g, "");
  try {
    return decodeURIComponent(unquoted);
  } catch {
    return unquoted;
  }
}

export function getImportTemplateFilename(
  contentDisposition: string | null,
  fallback: string
) {
  if (!contentDisposition) return fallback;
  const encoded = contentDisposition.match(
    /filename\*\s*=\s*UTF-8''([^;]+)/i
  )?.[1];
  if (encoded) return decodeFilename(encoded);
  const regular = contentDisposition.match(/filename\s*=\s*("[^"]*"|[^;]+)/i)?.[1];
  return regular ? decodeFilename(regular) : fallback;
}

export function isXlsxFile(file: Pick<File, "name">) {
  return file.name.toLowerCase().endsWith(".xlsx");
}

export async function downloadImportTemplate({
  collectionName,
  dataSourceKey = "main",
  columns,
  title,
  explain,
  signal,
}: DownloadImportTemplateOptions): Promise<ImportTemplateResult> {
  const method = "POST";
  const body = { title, explain, columns };
  const response = await fetch(
    nocobaseClient.buildUrl(`${collectionName}:downloadXlsxTemplate`),
    {
      method,
      headers: nocobaseClient.getHeaders({
        method,
        body,
        headers: {
          ...getDataSourceHeaders(dataSourceKey),
          Accept:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      }),
      credentials: "include",
      body: JSON.stringify(body),
      signal,
    }
  );

  if (!response.ok) {
    const payload = await readErrorPayload(response);
    throw new NocoBaseHttpError({
      status: response.status,
      payload,
      message: getNocoBaseErrorMessage(
        payload,
        `Import template download failed (${response.status})`
      ),
    });
  }

  return {
    blob: await response.blob(),
    filename: getImportTemplateFilename(
      response.headers.get("content-disposition"),
      `${collectionName}-import-template.xlsx`
    ),
  };
}

export function downloadImportTemplateResult(result: ImportTemplateResult) {
  const url = URL.createObjectURL(result.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = result.filename;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function importRecords({
  collectionName,
  dataSourceKey = "main",
  columns,
  file,
  explain,
  mode = "sync",
  appendFormData,
  signal,
}: ImportRecordsOptions): Promise<ImportRecordsResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("columns", JSON.stringify(columns));
  formData.append("explain", explain ?? "");
  appendFormData?.(formData);

  const payload = await nocobaseClient.action<unknown>(
    collectionName,
    "importXlsx",
    {
      method: "POST",
      query: { mode },
      headers: getDataSourceHeaders(dataSourceKey),
      body: formData,
      signal,
      unwrap: "none",
    }
  );

  return normalizeImportPayload(payload);
}
