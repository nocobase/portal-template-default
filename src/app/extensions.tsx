import { Suspense, type PropsWithChildren, type ReactNode } from "react";
import type { AppExtension } from "./extension";
import { LoadingState } from "@/components/app-shell/loading-state";

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

export const extensionUserMenuItems = appExtensions
  .filter((extension) => extension.UserMenuItems)
  .map((extension) => ({
    id: extension.id,
    Component: extension.UserMenuItems!,
  }));

export const extensionAuthAdapters = appExtensions.flatMap(
  (extension) => extension.authAdapters ?? []
);

export function AppExtensionProviders({ children }: PropsWithChildren) {
  return appExtensions.reduceRight<ReactNode>((content, extension) => {
    const Provider = extension.Provider;
    return Provider ? <Provider>{content}</Provider> : content;
  }, children);
}

export function AppAuthRuntimeProviders({ children }: PropsWithChildren) {
  return [...appExtensions]
    .filter((extension) => extension.AuthRuntimeProvider)
    .sort(
      (left, right) =>
        (left.authRuntimePriority ?? 100) -
          (right.authRuntimePriority ?? 100) || left.id.localeCompare(right.id)
    )
    .reduceRight<ReactNode>((content, extension) => {
      const Provider = extension.AuthRuntimeProvider!;
      return (
        <Suspense fallback={<LoadingState className="min-h-svh" />}>
          <Provider>{content}</Provider>
        </Suspense>
      );
    }, children);
}

export type { AppExtension } from "./extension";
