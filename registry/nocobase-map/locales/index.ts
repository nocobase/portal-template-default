import { registerTranslationResources } from "@nocobase/portal-sdk/i18n";

import { MAP_NAMESPACE } from "../i18n";
import { mapMessages as enUS } from "./en-US";
import { mapMessages as zhCN } from "./zh-CN";

registerTranslationResources(MAP_NAMESPACE, { "en-US": enUS, "zh-CN": zhCN });
