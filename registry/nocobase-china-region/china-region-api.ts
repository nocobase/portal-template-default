import { nocobaseClient, NocoBaseHttpError } from "@nocobase/portal-sdk/client";

import type {
  ChinaRegionErrorCode,
  ChinaRegionRecord,
  ListChinaRegionsOptions,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findRows(value: unknown, depth = 0): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value) || depth > 4) return [];
  if (Array.isArray(value.rows)) return value.rows;
  return findRows(value.data, depth + 1);
}

export function normalizeChinaRegion(value: unknown): ChinaRegionRecord | undefined {
  if (!isRecord(value)) return undefined;
  const code = typeof value.code === "string" || typeof value.code === "number" ? String(value.code) : "";
  const name = typeof value.name === "string" ? value.name : "";
  const level = Number(value.level);
  if (!code || !name || !Number.isFinite(level)) return undefined;
  return {
    code,
    name,
    level,
    parentCode:
      typeof value.parentCode === "string" || typeof value.parentCode === "number"
        ? String(value.parentCode)
        : undefined,
    sort: typeof value.sort === "number" ? value.sort : undefined,
  };
}

export function normalizeChinaRegionList(value: unknown): ChinaRegionRecord[] {
  return findRows(value)
    .flatMap((item) => {
      const region = normalizeChinaRegion(item);
      return region ? [region] : [];
    })
    .sort((left, right) => left.code.localeCompare(right.code));
}

export function getChinaRegionErrorCode(error: unknown): ChinaRegionErrorCode {
  if (error instanceof NocoBaseHttpError) {
    if (error.status === 404) return "pluginUnavailable";
    if (error.status === 403) return "forbidden";
    if (error.status === 401) return "unauthorized";
    return "load";
  }
  return error instanceof TypeError ? "network" : "load";
}

export async function listChinaRegions({ level, parentCode, signal }: ListChinaRegionsOptions = {}) {
  if (level === undefined && !parentCode) {
    throw new Error("A region level or parent code is required.");
  }
  const filter = parentCode ? { parentCode } : { level };
  const response = await nocobaseClient.action<unknown>("chinaRegions", "list", {
    query: {
      filter: JSON.stringify(filter),
      paginate: false,
      sort: "code",
    },
    signal,
    unwrap: "none",
  });
  return normalizeChinaRegionList(response);
}
