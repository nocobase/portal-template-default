import type { ReactNode } from "react";

export type RecordHistoryAction = "create" | "update" | "destroy" | string;

export type RecordFieldChange = {
  id?: string | number;
  fieldPath: string;
  before: unknown;
  after: unknown;
  options?: Record<string, unknown>;
};

export type RecordHistoryUser = {
  id?: string | number;
  nickname?: string;
  username?: string;
};

export type RecordHistory = {
  uuid: string;
  requestId?: string;
  recordId: string;
  collectionName: string;
  dataSourceKey: string;
  action: RecordHistoryAction;
  createdAt?: string;
  user?: RecordHistoryUser;
  recordFieldHistory: RecordFieldChange[];
  snapshot?: Record<string, unknown>;
};

export type RecordHistoryListResult = {
  rows: RecordHistory[];
  count: number;
};

export type RecordHistoryErrorCode = "pluginUnavailable" | "forbidden" | "unauthorized" | "network" | "load";

export type ListRecordHistoryOptions = {
  collectionName: string;
  dataSourceKey?: string;
  recordId?: string | number;
  filter?: Record<string, unknown>;
  page?: number;
  pageSize?: number;
  sort?: "createdAt" | "-createdAt";
  appendSnapshots?: boolean;
  signal?: AbortSignal;
};

export type RecordHistoryTimelineProps = Omit<ListRecordHistoryOptions, "signal"> & {
  fieldLabels?: Record<string, string>;
  fallbackRows?: RecordHistory[];
  fallbackNotice?: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  renderSummary?: (history: RecordHistory) => ReactNode;
  renderValue?: (value: unknown, change: RecordFieldChange, side: "before" | "after") => ReactNode;
  onPageChange?: (page: number) => void;
  onError?: (error: Error) => void;
};
