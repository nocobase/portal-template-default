import type { ChinaRegionDisplayProps, ChinaRegionRecord } from "./types";

function isRegion(value: unknown): value is ChinaRegionRecord {
  return typeof value === "object" && value !== null && "code" in value;
}

export function formatChinaRegionValue(
  value: ChinaRegionDisplayProps["value"],
  separator = "/"
) {
  if (value === null || value === undefined || value === "") return "";
  const items = Array.isArray(value) ? value : [value];
  return [...items]
    .sort((left, right) => {
      if (!isRegion(left) || !isRegion(right)) return 0;
      if (left.level !== right.level) return left.level - right.level;
      return (left.sort ?? 0) - (right.sort ?? 0);
    })
    .map((item) => (isRegion(item) ? item.name : String(item)))
    .filter(Boolean)
    .join(separator);
}
