import { useTranslate } from "@refinedev/core";
import { useCallback } from "react";

export const RECORD_HISTORY_NAMESPACE = "nocobase-record-history";

export function useRecordHistoryTranslation() {
  const translate = useTranslate();
  return useCallback(
    (key: string, fallback: string, values?: Record<string, unknown>) =>
      translate(key, { ns: RECORD_HISTORY_NAMESPACE, ...values }, fallback),
    [translate]
  );
}
