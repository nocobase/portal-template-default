import { registerTranslationResources } from "@nocobase/portal-sdk/i18n";
import { IN_APP_MESSAGE_NAMESPACE } from "../i18n";
import { inAppMessage as enUS } from "./en-US";
import { inAppMessage as zhCN } from "./zh-CN";

registerTranslationResources(IN_APP_MESSAGE_NAMESPACE, {
  "en-US": enUS,
  "zh-CN": zhCN,
});
