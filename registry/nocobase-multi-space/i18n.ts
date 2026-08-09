import { useTranslate } from "@refinedev/core";
import { useCallback } from "react";

export const MULTI_SPACE_NAMESPACE = "nocobase-multi-space";

export function useMultiSpaceTranslation() {
  const translate = useTranslate();
  return useCallback(
    (key: string, fallback: string, values?: Record<string, unknown>) =>
      translate(key, { ns: MULTI_SPACE_NAMESPACE, ...values }, fallback),
    [translate]
  );
}
