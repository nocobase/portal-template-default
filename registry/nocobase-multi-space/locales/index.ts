import { registerTranslationResources } from "@nocobase/portal-sdk/i18n";

import { MULTI_SPACE_NAMESPACE } from "../i18n";
import { multiSpaceMessages as enUS } from "./en-US";
import { multiSpaceMessages as zhCN } from "./zh-CN";

registerTranslationResources(MULTI_SPACE_NAMESPACE, {
  "en-US": enUS,
  "zh-CN": zhCN,
});
