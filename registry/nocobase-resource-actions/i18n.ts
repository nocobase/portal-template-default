import { useTranslate } from "@refinedev/core";
import { useCallback } from "react";

export const RESOURCE_ACTIONS_NAMESPACE = "nocobase-resource-actions";

export function useResourceActionsTranslation() {
  const translate = useTranslate();
  return useCallback(
    (key: string, fallback: string, values?: Record<string, unknown>) =>
      translate(key, { ns: RESOURCE_ACTIONS_NAMESPACE, ...values }, fallback),
    [translate]
  );
}
