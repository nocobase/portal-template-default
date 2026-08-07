import { registerTranslationResources } from "@nocobase/portal-sdk/i18n";

import { DATA_VISUALIZATION_NAMESPACE } from "../i18n";
import { dataVisualizationMessages as enUS } from "./en-US";
import { dataVisualizationMessages as zhCN } from "./zh-CN";

registerTranslationResources(DATA_VISUALIZATION_NAMESPACE, {
  "en-US": enUS,
  "zh-CN": zhCN,
});
