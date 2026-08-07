import { nocobaseClient } from "@nocobase/portal-sdk/client";

import type { MapConfiguration, MapProvider } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrap(value: unknown, depth = 0): unknown {
  if (!isRecord(value) || depth > 4) return value;
  return "data" in value ? unwrap(value.data, depth + 1) : value;
}

export function normalizeMapConfiguration(
  value: unknown,
  provider: MapProvider
): MapConfiguration | undefined {
  const payload = unwrap(value);
  if (!isRecord(payload) || typeof payload.accessKey !== "string" || !payload.accessKey) return undefined;
  return {
    type: provider,
    accessKey: payload.accessKey,
    securityJsCode: typeof payload.securityJsCode === "string" ? payload.securityJsCode : undefined,
  };
}

export async function getMapConfiguration(provider: MapProvider, signal?: AbortSignal) {
  const response = await nocobaseClient.action<unknown>("map-configuration", "get", {
    query: { type: provider },
    signal,
    unwrap: "none",
  });
  return normalizeMapConfiguration(response, provider);
}
