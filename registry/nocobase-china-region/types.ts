import type { FocusEventHandler } from "react";

export type ChinaRegionLevel = 1 | 2 | 3;

export type ChinaRegionRecord = {
  code: string;
  name: string;
  level: number;
  parentCode?: string;
  sort?: number;
};

export type ChinaRegionValue = ChinaRegionRecord[] | string[] | null;

export type ChinaRegionErrorCode = "pluginUnavailable" | "forbidden" | "unauthorized" | "network" | "load";

export type ListChinaRegionsOptions = {
  level?: ChinaRegionLevel;
  parentCode?: string;
  signal?: AbortSignal;
};

export type ChinaRegionPickerProps = {
  value?: ChinaRegionValue;
  onChange?: (value: ChinaRegionValue, selectedRegions: ChinaRegionRecord[]) => void;
  onBlur?: FocusEventHandler<HTMLDivElement>;
  onError?: (error: Error) => void;
  maxLevel?: ChinaRegionLevel;
  labelInValue?: boolean;
  changeOnSelect?: boolean;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  className?: string;
  id?: string;
  ariaLabel?: string;
  placeholders?: Partial<Record<ChinaRegionLevel, string>>;
};

export type ChinaRegionDisplayProps = {
  value?: ChinaRegionValue | ChinaRegionRecord | string;
  separator?: string;
  empty?: string;
  className?: string;
};
