import { useSyncExternalStore } from "react";

export type LocaleDirection = "ltr" | "rtl";

export type LocaleDefinition = {
  locale: string;
  label: string;
  direction?: LocaleDirection;
};

export const DEFAULT_LOCALE = "en-US";

const localeDefinitions = new Map<string, LocaleDefinition>([
  ["en-US", { locale: "en-US", label: "English", direction: "ltr" }],
  ["zh-CN", { locale: "zh-CN", label: "简体中文", direction: "ltr" }],
]);
const listeners = new Set<() => void>();
let enabledLocaleCodes: string[] = [];
let enabledLocaleSnapshot: LocaleDefinition[] = [];

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function refreshSnapshot() {
  const nextSnapshot = enabledLocaleCodes
    .map((locale) => localeDefinitions.get(locale))
    .filter((definition): definition is LocaleDefinition =>
      Boolean(definition)
    );
  const changed =
    nextSnapshot.length !== enabledLocaleSnapshot.length ||
    nextSnapshot.some((definition, index) => {
      const current = enabledLocaleSnapshot[index];
      return (
        definition.locale !== current?.locale ||
        definition.label !== current.label ||
        definition.direction !== current.direction
      );
    });

  if (!changed) return;
  enabledLocaleSnapshot = nextSnapshot;
  emitChange();
}

export function getLocaleDirection(locale: string): LocaleDirection {
  return /^(ar|fa|he|ku|ur)(-|$)/i.test(locale) ? "rtl" : "ltr";
}

export function getLocaleLabel(locale: string) {
  const existing = localeDefinitions.get(locale)?.label;
  if (existing && existing !== locale) return existing;

  try {
    return (
      new Intl.DisplayNames([locale], { type: "language" }).of(locale) ?? locale
    );
  } catch {
    return locale;
  }
}

export function registerLocale(definition: LocaleDefinition) {
  const current = localeDefinitions.get(definition.locale);
  const currentLabel =
    current?.label && current.label !== definition.locale
      ? current.label
      : undefined;
  localeDefinitions.set(definition.locale, {
    locale: definition.locale,
    label:
      definition.label && definition.label !== definition.locale
        ? definition.label
        : currentLabel ?? getLocaleLabel(definition.locale),
    direction:
      definition.direction ??
      current?.direction ??
      getLocaleDirection(definition.locale),
  });

  if (enabledLocaleCodes.includes(definition.locale)) refreshSnapshot();
}

export function setEnabledLocales(locales: string[]) {
  enabledLocaleCodes = [...new Set(locales.filter(Boolean))];
  for (const locale of enabledLocaleCodes) {
    if (!localeDefinitions.has(locale)) {
      localeDefinitions.set(locale, {
        locale,
        label: getLocaleLabel(locale),
        direction: getLocaleDirection(locale),
      });
    }
  }
  refreshSnapshot();
}

export function getLocaleDefinitions() {
  return enabledLocaleSnapshot;
}

export function useEnabledLocales() {
  return useSyncExternalStore(
    subscribe,
    getLocaleDefinitions,
    getLocaleDefinitions
  );
}

export function resolveSupportedLocale(locale?: string) {
  if (!locale) return DEFAULT_LOCALE;

  const exact = [...localeDefinitions.keys()].find(
    (candidate) => candidate.toLowerCase() === locale.toLowerCase()
  );
  if (exact) return exact;

  const language = locale.split("-")[0]?.toLowerCase();
  return (
    [...localeDefinitions.keys()].find(
      (candidate) => candidate.split("-")[0]?.toLowerCase() === language
    ) ?? DEFAULT_LOCALE
  );
}

export function getLocaleDefinition(locale: string) {
  return localeDefinitions.get(locale);
}
