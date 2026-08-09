import type { ComponentProps, ReactNode } from "react";

import type { Button } from "@/components/ui/button";

export type ExportColumn = {
  dataIndex: string[];
  defaultTitle: string;
  title?: string;
  enum?: Array<{ value: unknown; label: string }>;
};

export type ExportMode = "sync" | "async" | "auto";

export type ExportResult =
  | { type: "download"; blob: Blob; filename: string }
  | { type: "queued"; taskId: string; raw: unknown };

export type ExportRecordsOptions = {
  collectionName: string;
  dataSourceKey?: string;
  title: string;
  columns: ExportColumn[];
  filter?: unknown;
  sort?: string[];
  appends?: string[];
  mode?: ExportMode;
  signal?: AbortSignal;
};

export type ExportRecordsButtonProps = ExportRecordsOptions & {
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  selectedFilter?: unknown;
  onQueued?: (taskId: string) => void;
  onExported?: (result: ExportResult) => void;
  onError?: (error: Error) => void;
};
