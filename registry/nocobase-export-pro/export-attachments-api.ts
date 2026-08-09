import {
  getNocoBaseErrorMessage,
  NocoBaseHttpError,
  nocobaseClient,
} from "@nocobase/portal-sdk/client";

import { getExportFilename } from "@/extensions/nocobase-export/export-api";
import type { ExportResult } from "@/extensions/nocobase-export/types";

import type { ExportAttachmentsOptions } from "./types";

export async function exportAttachments({
  collectionName,
  dataSourceKey = "main",
  title,
  fields,
  filter,
  sort,
  appends,
  mode = "auto",
  singleFolderPerRecord = true,
  signal,
}: ExportAttachmentsOptions): Promise<ExportResult> {
  const body = { fields, singleFolderPerRecord };
  const response = await fetch(
    nocobaseClient.buildUrl(`${collectionName}:exportAttachments`, {
      filter: filter === undefined ? undefined : JSON.stringify(filter),
      sort,
      appends,
      mode,
    }),
    {
      method: "POST",
      credentials: "include",
      signal,
      body: JSON.stringify(body),
      headers: nocobaseClient.getHeaders({
        method: "POST",
        body,
        headers: {
          ...(dataSourceKey === "main"
            ? {}
            : { "X-Data-Source": dataSourceKey }),
          Accept: "application/zip, application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    let payload: unknown = text;
    try {
      payload = JSON.parse(text);
    } catch {
      // Preserve a non-JSON error response as text.
    }
    throw new NocoBaseHttpError({
      status: response.status,
      payload,
      message: getNocoBaseErrorMessage(
        payload,
        `Attachment export failed (${response.status})`
      ),
    });
  }

  if ((response.headers.get("content-type") || "").includes("json")) {
    const raw = await response.json();
    const taskId = (raw as any)?.data?.taskId ?? (raw as any)?.taskId;
    if (taskId !== undefined) {
      return { type: "queued", taskId: String(taskId), raw };
    }
    throw new Error("Attachment export returned JSON without a task ID.");
  }

  return {
    type: "download",
    blob: await response.blob(),
    filename: getExportFilename(
      response.headers.get("content-disposition"),
      `${title}-attachments.zip`
    ),
  };
}
