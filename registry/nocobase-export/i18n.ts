import { useTranslate } from "@refinedev/core";
import { useCallback } from "react";

export const EXPORT_NAMESPACE = "nocobase-export";
export function useExportTranslation() {
  const translate = useTranslate();
  return useCallback((key: string, fallback: string, values?: Record<string, unknown>) =>
    translate(key, { ns: EXPORT_NAMESPACE, ...values }, fallback), [translate]);
}
