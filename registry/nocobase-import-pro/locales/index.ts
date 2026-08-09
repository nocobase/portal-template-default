import { registerTranslationResources } from "@nocobase/portal-sdk/i18n";

import { IMPORT_PRO_NAMESPACE } from "../i18n";
import { importProMessages as enUS } from "./en-US";
import { importProMessages as zhCN } from "./zh-CN";

registerTranslationResources(IMPORT_PRO_NAMESPACE, {
  "en-US": enUS,
  "zh-CN": zhCN,
});
