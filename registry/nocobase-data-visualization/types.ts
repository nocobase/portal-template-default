import type { EChartsOption } from "echarts";
import type { ReactNode } from "react";

export type ChartRow = Record<string, unknown>;

export type ChartMeasure = {
  field: string | string[];
  type?: string;
  aggregation?: string;
  alias?: string;
  distinct?: boolean;
};

export type ChartDimension = {
  field: string | string[];
  type?: string;
  alias?: string;
  format?: string;
  options?: Record<string, unknown>;
};

export type ChartOrder = {
  field: string | string[];
  alias?: string;
  order?: "asc" | "desc";
  nulls?: "default" | "first" | "last";
};

type ChartQueryBase = {
  uid?: string;
  dataSource?: string;
  collection: string;
  dimensions?: ChartDimension[];
  orders?: ChartOrder[];
  filter?: Record<string, unknown>;
  having?: Record<string, unknown>;
  contextParams?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  cache?: { enabled: boolean; ttl: number };
  refresh?: boolean;
};

export type ChartBuilderQuery = ChartQueryBase & {
  mode?: "builder";
  measures: ChartMeasure[];
  sql?: never;
};

export type ChartSqlQuery = ChartQueryBase & {
  mode: "sql";
  sql: { fields?: string; clauses?: string };
  measures?: ChartMeasure[];
};

export type ChartQuery = ChartBuilderQuery | ChartSqlQuery;

export type ChartOptionBuilder = (
  rows: ChartRow[],
  query: ChartQuery
) => EChartsOption;

export type NocoBaseChartProps = {
  query: ChartQuery;
  option: EChartsOption | ChartOptionBuilder;
  height?: number | string;
  className?: string;
  ariaLabel?: string;
  emptyContent?: ReactNode;
  loadingContent?: ReactNode;
  onLoaded?: (rows: ChartRow[]) => void;
  onError?: (error: Error) => void;
};
