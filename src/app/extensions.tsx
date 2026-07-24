import type { PropsWithChildren, ReactNode } from "react";
import type { AppExtension } from "./extension";

const extensionModules = import.meta.glob<{ default: AppExtension }>(
  "../extensions/*/extension.tsx",
  { eager: true }
);

export const appExtensions = Object.values(extensionModules)
  .map((module) => module.default)
  .sort((left, right) => left.id.localeCompare(right.id));

export const extensionResources = appExtensions.flatMap(
  (extension) => extension.resources ?? []
);

export const extensionRouteElements = appExtensions
  .map((extension) => extension.routes)
  .filter((routes): routes is NonNullable<typeof routes> => Boolean(routes));

const i18nExtensions = appExtensions.filter(
  (extension) => extension.i18nProvider
);

if (i18nExtensions.length > 1) {
  console.warn(
    `Multiple app extensions provide i18nProvider (${i18nExtensions
      .map((extension) => extension.id)
      .join(", ")}). Using ${i18nExtensions[0].id}.`
  );
}

export const extensionI18nProvider = i18nExtensions[0]?.i18nProvider;

export const extensionUserMenuItems = appExtensions
  .filter((extension) => extension.UserMenuItems)
  .map((extension) => ({
    id: extension.id,
    Component: extension.UserMenuItems!,
  }));

export function AppExtensionProviders({ children }: PropsWithChildren) {
  return appExtensions.reduceRight<ReactNode>((content, extension) => {
    const Provider = extension.Provider;
    return Provider ? <Provider>{content}</Provider> : content;
  }, children);
}

export type { AppExtension } from "./extension";
