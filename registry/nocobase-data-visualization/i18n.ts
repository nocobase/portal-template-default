import { useTranslate } from "@refinedev/core";
import { useCallback } from "react";

export const DATA_VISUALIZATION_NAMESPACE = "nocobase-data-visualization";

export function useDataVisualizationTranslation() {
  const translate = useTranslate();
  return useCallback(
    (key: string, fallback: string, values?: Record<string, unknown>) =>
      translate(key, { ns: DATA_VISUALIZATION_NAMESPACE, ...values }, fallback),
    [translate]
  );
}
