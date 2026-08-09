import { registerTranslationResources } from "@nocobase/portal-sdk/i18n";

import { RECORD_HISTORY_NAMESPACE } from "../i18n";
import { recordHistoryMessages as enUS } from "./en-US";
import { recordHistoryMessages as zhCN } from "./zh-CN";

registerTranslationResources(RECORD_HISTORY_NAMESPACE, {
  "en-US": enUS,
  "zh-CN": zhCN,
});
