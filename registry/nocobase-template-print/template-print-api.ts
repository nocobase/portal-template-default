import {
  getNocoBaseErrorMessage,
  NocoBaseHttpError,
  nocobaseClient,
} from "@nocobase/portal-sdk/client";

import type {
  ListPrintingTemplatesOptions,
  PrintingTemplate,
  PrintTemplateOptions,
  TemplatePrintResult,
  TemplatePrintSelection,
} from "./types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: UnknownRecord, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function findArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];

  for (const key of ["data", "rows"]) {
    const nested = value[key];
    const records = findArray(nested);
    if (records.length || Array.isArray(nested)) return records;
  }

  return [];
}

export function normalizePrintingTemplate(
  value: unknown
): PrintingTemplate | null {
  if (!isRecord(value)) return null;

  const name = readString(value, "name");
  if (!name) return null;

  const dataSource = readString(value, "dataSource");
  const collectionName = readString(value, "collectionName");
  const rootDataType = readString(value, "rootDataType");

  return {
    name,
    title: readString(value, "title") || name,
    collectionName,
    dataSource: dataSource || "main",
    rootDataType: rootDataType === "array" ? "array" : "map",
    filename: readString(value, "filename") || undefined,
    legacy:
      !dataSource ||
      !collectionName ||
      (rootDataType !== "map" && rootDataType !== "array"),
  };
}

export function normalizePrintingTemplateList(
  response: unknown
): PrintingTemplate[] {
  return findArray(response)
    .map(normalizePrintingTemplate)
    .filter((item): item is PrintingTemplate => Boolean(item));
}

export function buildPrintingTemplateFilter({
  collectionName,
  dataSourceKey = "main",
  rootDataType,
}: Omit<ListPrintingTemplatesOptions, "signal">) {
  return {
    $and: [
      { collectionName },
      dataSourceKey === "main"
        ? {
            $or: [
              { dataSource: "main" },
              { dataSource: { $empty: true } },
            ],
          }
        : { dataSource: dataSourceKey },
      rootDataType === "map"
        ? {
            $or: [
              { rootDataType: "map" },
              { rootDataType: { $empty: true } },
            ],
          }
        : { rootDataType },
    ],
  };
}

export async function listPrintingTemplates({
  collectionName,
  dataSourceKey = "main",
  rootDataType,
  signal,
}: ListPrintingTemplatesOptions): Promise<PrintingTemplate[]> {
  const response = await nocobaseClient.action<unknown>(
    "printingTemplates",
    "list",
    {
      query: {
        filter: JSON.stringify(
          buildPrintingTemplateFilter({
            collectionName,
            dataSourceKey,
            rootDataType,
          })
        ),
        paginate: false,
        sort: "title",
      },
      signal,
      unwrap: "none",
    }
  );

  return normalizePrintingTemplateList(response);
}

function mergeSelectionFilter(
  currentFilter: unknown,
  selectionFilter: Record<string, unknown>
) {
  return isRecord(currentFilter) && Object.keys(currentFilter).length
    ? { $and: [currentFilter, selectionFilter] }
    : selectionFilter;
}

export function buildTemplatePrintQueryParams(
  queryParams: Record<string, unknown> = {},
  selection: TemplatePrintSelection
) {
  if (selection.type === "single") {
    return { ...queryParams, filterByTk: selection.filterByTk };
  }

  if (selection.type === "all") {
    return { ...queryParams, page: null, pageSize: null };
  }

  const selectionFilter = {
    [selection.rowKey || "id"]: { $in: selection.recordKeys },
  };

  return {
    ...queryParams,
    filter: mergeSelectionFilter(queryParams.filter, selectionFilter),
  };
}

function decodeFilename(value: string) {
  const unquoted = value.trim().replace(/^"|"$/g, "");
  try {
    return decodeURIComponent(unquoted);
  } catch {
    return unquoted;
  }
}

export function getTemplatePrintFilename(
  contentDisposition: string | null,
  fallback = "template-print"
) {
  if (!contentDisposition) return fallback;

  const encoded = contentDisposition.match(
    /filename\*\s*=\s*UTF-8''([^;]+)/i
  )?.[1];
  if (encoded) return decodeFilename(encoded);

  const regular = contentDisposition.match(/filename\s*=\s*("[^"]*"|[^;]+)/i)?.[1];
  return regular ? decodeFilename(regular) : fallback;
}

async function readErrorPayload(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => undefined);
  }
  return response.text().catch(() => undefined);
}

export async function printTemplate({
  collectionName,
  dataSourceKey = "main",
  templateName,
  selection,
  queryParams,
  convertedToPDF = false,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  uid = `portal-template-print:${dataSourceKey}:${collectionName}`,
  signal,
}: PrintTemplateOptions): Promise<TemplatePrintResult> {
  const body = {
    queryParams: buildTemplatePrintQueryParams(queryParams, selection),
    templateName,
    blockName: selection.type === "single" ? "details" : "table",
    convertedToPDF,
    timezone,
    uid,
  };
  const method = "POST";
  const response = await fetch(
    nocobaseClient.buildUrl(`${collectionName}:templatePrint`),
    {
      method,
      headers: nocobaseClient.getHeaders({
        method,
        body,
        headers:
          dataSourceKey === "main"
            ? undefined
            : { "X-Data-Source": dataSourceKey },
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
        `Template print failed (${response.status})`
      ),
    });
  }

  return {
    blob: await response.blob(),
    filename: getTemplatePrintFilename(
      response.headers.get("content-disposition"),
      convertedToPDF ? "template-print.pdf" : "template-print"
    ),
  };
}

export function downloadTemplatePrintResult(result: TemplatePrintResult) {
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
