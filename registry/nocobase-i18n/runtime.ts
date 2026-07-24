import { createInstance, type TOptions } from "i18next";

import {
  getTranslationResources,
  registerTranslationResources,
  subscribeTranslationResources,
  type TranslationOptions,
} from "@/lib/i18n";
import { nocobaseClient } from "@/lib/nocobase/client";
import {
  DEFAULT_LOCALE,
  getLocaleDefinition,
  getLocaleDirection,
  getLocaleLabel,
  registerLocale,
  resolveSupportedLocale,
} from "./locale-store";
import enUS from "./locales/en-US";
import zhCN from "./locales/zh-CN";

export type LocaleResources = Record<
  string,
  Record<string, string | number | boolean>
>;

export const i18n = createInstance();

void i18n.init({
  lng: resolveSupportedLocale(nocobaseClient.getLocale()),
  fallbackLng: DEFAULT_LOCALE,
  defaultNS: "starter",
  fallbackNS: "starter",
  keySeparator: false,
  nsSeparator: false,
  initImmediate: false,
  interpolation: {
    escapeValue: false,
  },
  resources: {
    "en-US": enUS,
    "zh-CN": zhCN,
  },
});

function addLocaleResources(namespace: string, resources: LocaleResources) {
  for (const [locale, resource] of Object.entries(resources)) {
    i18n.addResourceBundle(locale, namespace, resource, true, true);
    registerLocale({
      locale,
      label: getLocaleLabel(locale),
      direction: getLocaleDirection(locale),
    });
  }
}

getTranslationResources().forEach(([namespace, resources]) =>
  addLocaleResources(namespace, resources)
);

subscribeTranslationResources(addLocaleResources);

export function getCurrentLocale() {
  return resolveSupportedLocale(i18n.resolvedLanguage ?? i18n.language);
}

export function registerLocaleResources(
  namespace: string,
  resources: LocaleResources
) {
  registerTranslationResources(namespace, resources);
}

export function translate(
  key: string,
  options?: TranslationOptions | string,
  defaultMessage?: string
) {
  const normalizedOptions = typeof options === "string" ? undefined : options;
  const normalizedDefault =
    typeof options === "string" ? options : defaultMessage;
  const value = i18n.t(key, {
    ...(normalizedOptions as TOptions),
    defaultValue: normalizedDefault ?? normalizedOptions?.defaultValue ?? key,
  });

  return typeof value === "string" ? value : String(value);
}

export function applyDocumentLocale(locale = getCurrentLocale()) {
  if (typeof document === "undefined") return;
  const direction =
    getLocaleDefinition(locale)?.direction ?? getLocaleDirection(locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = direction;
}

export async function changeLocale(locale: string) {
  const nextLocale = resolveSupportedLocale(locale);

  if (nocobaseClient.getToken()) {
    try {
      await nocobaseClient.action("users", "updateLang", {
        method: "POST",
        body: { appLang: nextLocale },
      });
    } catch (error) {
      console.warn("Unable to persist the NocoBase language preference", error);
    }
  }

  nocobaseClient.setLocale(nextLocale);
  await i18n.changeLanguage(nextLocale);
  applyDocumentLocale(nextLocale);

  if (typeof window !== "undefined") window.location.reload();
}

applyDocumentLocale();
