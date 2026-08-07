import { registerTranslationResources } from "@nocobase/portal-sdk/i18n";

import { RESOURCE_ACTIONS_NAMESPACE } from "../i18n";
import { resourceActionsMessages as enUS } from "./en-US";
import { resourceActionsMessages as zhCN } from "./zh-CN";

registerTranslationResources(RESOURCE_ACTIONS_NAMESPACE, {
  "en-US": enUS,
  "zh-CN": zhCN,
});
