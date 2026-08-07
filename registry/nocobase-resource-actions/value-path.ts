import type { ResourceValues } from "./types";

export function getValueAtPath(values: ResourceValues, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    return (current as ResourceValues)[segment];
  }, values);
}

export function setValueAtPath(
  values: ResourceValues,
  path: string,
  value: unknown
) {
  const segments = path.split(".");
  let current = values;
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      current[segment] = value;
      return;
    }
    const existing = current[segment];
    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      current[segment] = {};
    }
    current = current[segment] as ResourceValues;
  });
}
