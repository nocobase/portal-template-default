import { useTranslate } from "@refinedev/core";
import { useCallback } from "react";

export const IMPORT_NAMESPACE = "nocobase-import";

export function useImportTranslation() {
  const translate = useTranslate();
  return useCallback(
    (key: string, fallback: string, values?: Record<string, unknown>) =>
      translate(key, { ns: IMPORT_NAMESPACE, ...values }, fallback),
    [translate]
  );
}
