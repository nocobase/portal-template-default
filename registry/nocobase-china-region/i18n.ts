import { useTranslate } from "@refinedev/core";
import { useCallback } from "react";

export const CHINA_REGION_NAMESPACE = "nocobase-china-region";

export function useChinaRegionTranslation() {
  const translate = useTranslate();
  return useCallback(
    (key: string, fallback: string, values?: Record<string, unknown>) =>
      translate(key, { ns: CHINA_REGION_NAMESPACE, ...values }, fallback),
    [translate]
  );
}
