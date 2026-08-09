import type { AppExtension } from "@nocobase/portal-sdk/extensions";

export const sortDevelopmentExtensions = (extensions: AppExtension[]) =>
  [...extensions].sort(
    (left, right) =>
      (left.dev?.order ?? 100) - (right.dev?.order ?? 100) ||
      left.id.localeCompare(right.id)
  );
