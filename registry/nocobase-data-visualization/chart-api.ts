import { nocobaseClient } from "@nocobase/portal-sdk/client";

import type { ChartQuery, ChartRow } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeChartRows(value: unknown, depth = 0): ChartRow[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }
  if (!isRecord(value) || depth > 4) return [];

  if (Array.isArray(value.rows)) return value.rows.filter(isRecord);
  if ("data" in value) return normalizeChartRows(value.data, depth + 1);
  return [];
}

export async function queryChartData(
  query: ChartQuery,
  signal?: AbortSignal
): Promise<ChartRow[]> {
  const response = await nocobaseClient.action<unknown>("charts", "queryData", {
    method: "POST",
    body: {
      mode: query.mode ?? "builder",
      variableResolution:
        query.mode === "sql" ? undefined : "legacy-schema",
      dataSource: query.dataSource ?? "main",
      collection: query.collection,
      measures: query.measures,
      sql: query.sql,
      dimensions: query.dimensions ?? [],
      orders: query.orders ?? [],
      filter: query.filter,
      having: query.having,
      contextParams: query.contextParams,
      limit: query.limit,
      offset: query.offset,
      cache: query.cache,
      uid: query.uid,
      refresh: query.refresh,
    },
    signal,
    unwrap: "none",
  });

  return normalizeChartRows(response);
}
