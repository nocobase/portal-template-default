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

export function AppExtensionProviders({ children }: PropsWithChildren) {
  return appExtensions.reduceRight<ReactNode>((content, extension) => {
    const Provider = extension.Provider;
    return Provider ? <Provider>{content}</Provider> : content;
  }, children);
}

export type { AppExtension } from "./extension";
