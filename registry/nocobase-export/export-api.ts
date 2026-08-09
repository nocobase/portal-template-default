import {
  getNocoBaseErrorMessage,
  NocoBaseHttpError,
  nocobaseClient,
} from "@nocobase/portal-sdk/client";

import type { ExportRecordsOptions, ExportResult } from "./types";

function dataSourceHeaders(key: string) {
  const headers: Record<string, string> = {};
  if (key !== "main") headers["X-Data-Source"] = key;
  return headers;
}

function decodeFilename(value: string) {
  const unquoted = value.trim().replace(/^"|"$/g, "");
  try { return decodeURIComponent(unquoted); } catch { return unquoted; }
}

export function getExportFilename(disposition: string | null, fallback: string) {
  if (!disposition) return fallback;
  const encoded = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  if (encoded) return decodeFilename(encoded);
  const regular = disposition.match(/filename\s*=\s*("[^"]*"|[^;]+)/i)?.[1];
  return regular ? decodeFilename(regular) : fallback;
}

async function readError(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return text; }
}

export async function exportRecords({
  collectionName,
  dataSourceKey = "main",
  title,
  columns,
  filter,
  sort,
  appends,
  mode,
  signal,
}: ExportRecordsOptions): Promise<ExportResult> {
  const body = { columns };
  const response = await fetch(
    nocobaseClient.buildUrl(`${collectionName}:export`, {
      title,
      filter: filter === undefined ? undefined : JSON.stringify(filter),
      sort,
      appends,
      mode,
    }),
    {
      method: "POST",
      headers: nocobaseClient.getHeaders({
        method: "POST",
        body,
        headers: { ...dataSourceHeaders(dataSourceKey), Accept: "application/octet-stream, application/json" },
      }),
      credentials: "include",
      body: JSON.stringify(body),
      signal,
    }
  );
  if (!response.ok) {
    const payload = await readError(response);
    throw new NocoBaseHttpError({
      status: response.status,
      payload,
      message: getNocoBaseErrorMessage(payload, `Export failed (${response.status})`),
    });
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("json")) {
    const raw = await response.json();
    const taskId = (raw as any)?.data?.taskId ?? (raw as any)?.taskId;
    if (taskId !== undefined) return { type: "queued", taskId: String(taskId), raw };
    throw new Error("Export returned JSON without a task ID.");
  }
  return {
    type: "download",
    blob: await response.blob(),
    filename: getExportFilename(response.headers.get("content-disposition"), `${title}.xlsx`),
  };
}

export function downloadExportResult(result: Extract<ExportResult, { type: "download" }>) {
  const url = URL.createObjectURL(result.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = result.filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
