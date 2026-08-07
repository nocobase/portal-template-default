import type { ResourceUpdateTarget } from "./types";

type Translate = (
  key: string,
  fallback: string,
  values?: Record<string, unknown>
) => string;

export function normalizeResourceActionError(
  reason: unknown,
  t: Translate
): Error {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  if (error.message === "NO_SELECTED_RECORDS") {
    return new Error(t("error.noSelection", "Select at least one record."));
  }
  if (error.message === "EMPTY_FILTER") {
    return new Error(
      t("error.emptyFilter", "A non-empty filter is required for this action.")
    );
  }
  return error;
}

export function describeUpdateTarget(
  target: ResourceUpdateTarget,
  t: Translate
) {
  if (target.type === "selected") {
    return t("target.selected", "{{count}} selected records", {
      count: target.keys.length,
    });
  }
  if (target.type === "filter") {
    return t("target.filter", "Records matching the current filter");
  }
  return t("target.all", "All records in the collection");
}

export const hasSelectedRecords = (target: ResourceUpdateTarget) =>
  target.type !== "selected" || target.keys.length > 0;

export async function runPostMutationCallback(
  callback: ((result: unknown) => void | Promise<void>) | undefined,
  result: unknown,
  onError?: (error: Error) => void
) {
  try {
    await callback?.(result);
    return undefined;
  } catch (reason) {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    try {
      onError?.(error);
    } catch {
      // A consumer error handler must not turn a completed mutation into a failed action.
    }
    return error;
  }
}
