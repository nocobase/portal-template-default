import { enUS } from "./i18n/en-US";
import { zhCN } from "./i18n/zh-CN";

export function resolveVditorI18n(locale: string) {
  return locale.toLowerCase().startsWith("zh") ? zhCN : enUS;
}
