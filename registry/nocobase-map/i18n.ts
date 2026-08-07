import { useTranslate } from "@refinedev/core";
import { useCallback } from "react";

export const MAP_NAMESPACE = "nocobase-map";

export function useMapTranslation() {
  const translate = useTranslate();
  return useCallback(
    (key: string, fallback: string, values?: Record<string, unknown>) =>
      translate(key, { ns: MAP_NAMESPACE, ...values }, fallback),
    [translate]
  );
}
