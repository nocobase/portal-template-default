import { registerTranslationResources } from "@/lib/i18n";
import { app as enUSApp, starter as enUSStarter } from "./en-US";
import { app as zhCNApp, starter as zhCNStarter } from "./zh-CN";

registerTranslationResources("starter", {
  "en-US": enUSStarter,
  "zh-CN": zhCNStarter,
});

registerTranslationResources("app", {
  "en-US": enUSApp,
  "zh-CN": zhCNApp,
});
