import { useTranslate } from "@refinedev/core";
import { useCallback } from "react";

export const IMPORT_PRO_NAMESPACE = "nocobase-import-pro";

export function useImportProTranslation() {
  const translate = useTranslate();
  return useCallback(
    (key: string, fallback: string, values?: Record<string, unknown>) =>
      translate(key, { ns: IMPORT_PRO_NAMESPACE, ...values }, fallback),
    [translate]
  );
}
