import { useTranslate } from "@refinedev/core";
import { useCallback } from "react";

export const IN_APP_MESSAGE_NAMESPACE = "nocobase-in-app-message";

export function useInAppMessageTranslation() {
  const translate = useTranslate();
  return useCallback(
    (key: string, fallback: string, values?: Record<string, unknown>) =>
      translate(
        key,
        { ns: IN_APP_MESSAGE_NAMESPACE, ...values },
        fallback
      ),
    [translate]
  );
}
