import { registerTranslationResources } from "@nocobase/portal-sdk/i18n";

import { CHINA_REGION_NAMESPACE } from "../i18n";
import { chinaRegionMessages as enUS } from "./en-US";
import { chinaRegionMessages as zhCN } from "./zh-CN";

registerTranslationResources(CHINA_REGION_NAMESPACE, {
  "en-US": enUS,
  "zh-CN": zhCN,
});
