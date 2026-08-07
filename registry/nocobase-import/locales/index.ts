import { registerTranslationResources } from "@nocobase/portal-sdk/i18n";

import { IMPORT_NAMESPACE } from "../i18n";
import { importMessages as enUS } from "./en-US";
import { importMessages as zhCN } from "./zh-CN";

registerTranslationResources(IMPORT_NAMESPACE, {
  "en-US": enUS,
  "zh-CN": zhCN,
});
