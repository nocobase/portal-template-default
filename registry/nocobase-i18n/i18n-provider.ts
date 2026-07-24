import type { I18nProvider } from "@refinedev/core";

import { changeLocale, getCurrentLocale, translate } from "./runtime";

export const i18nProvider: I18nProvider = {
  translate,
  changeLocale,
  getLocale: getCurrentLocale,
};
