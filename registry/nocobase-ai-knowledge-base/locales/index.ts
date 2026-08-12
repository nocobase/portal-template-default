import { useTranslate } from "@refinedev/core";
import { useCallback } from "react";
import { registerTranslationResources } from "@nocobase/portal-sdk/i18n";
import enUS from "./en-US";
import zhCN from "./zh-CN";

export const NOCOBASE_AI_KNOWLEDGE_BASE_I18N_NAMESPACE = "nocobase-ai-knowledge-base";

registerTranslationResources(NOCOBASE_AI_KNOWLEDGE_BASE_I18N_NAMESPACE, {
  "en-US": enUS,
  "zh-CN": zhCN,
});

export function useT() {
  const translate = useTranslate();

  return useCallback(
    (key: string, options: Record<string, unknown> = {}) =>
      translate(key, { ...options, ns: NOCOBASE_AI_KNOWLEDGE_BASE_I18N_NAMESPACE }, key),
    [translate],
  );
}
