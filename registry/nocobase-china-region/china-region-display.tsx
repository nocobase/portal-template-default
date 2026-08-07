import { cn } from "@/lib/utils";

import { formatChinaRegionValue } from "./format";
import type { ChinaRegionDisplayProps } from "./types";

export function ChinaRegionDisplay({
  value,
  separator = "/",
  empty = "—",
  className,
}: ChinaRegionDisplayProps) {
  return <span className={cn("break-words", className)}>{formatChinaRegionValue(value, separator) || empty}</span>;
}
