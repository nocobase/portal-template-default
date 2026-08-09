import type { ComponentProps, ReactNode } from "react";

import type { Button } from "@/components/ui/button";

export type ImportColumn = {
  dataIndex: string[];
  defaultTitle: string;
  title?: string;
  description?: string;
};

export type ImportTemplateConfig = {
  columns: ImportColumn[];
  title?: string;
  guide?: string;
};

export type ImportMode = "sync" | "async" | "auto";

export type ImportStats = {
  total: number;
  success: number;
  skipped: number;
  updated: number;
  failed: number;
};

export type ImportCompletedResult = {
  type: "completed";
  stats: ImportStats;
  raw: unknown;
};

export type ImportQueuedResult = {
  type: "queued";
  taskId: string;
  raw: unknown;
};

export type ImportRecordsResult = ImportCompletedResult | ImportQueuedResult;

export type ImportQueuedContext = {
  taskId: string;
  onCompleted: (result: ImportCompletedResult) => Promise<void>;
  onError: (error: Error) => void;
};

export type ImportRecordsExtension = {
  mode?: ImportMode;
  reviewTitle?: string;
  reviewDescription?: string;
  options?: ReactNode;
  validate?: () => string | undefined;
  appendFormData?: (formData: FormData) => void;
  renderQueued?: (context: ImportQueuedContext) => ReactNode;
  reset?: () => void;
};

export type DownloadImportTemplateOptions = {
  collectionName: string;
  dataSourceKey?: string;
  columns: ImportColumn[];
  title?: string;
  explain?: string;
  signal?: AbortSignal;
};

export type ImportRecordsOptions = {
  collectionName: string;
  dataSourceKey?: string;
  columns: ImportColumn[];
  file: File;
  explain?: string;
  mode?: ImportMode;
  appendFormData?: (formData: FormData) => void;
  signal?: AbortSignal;
};

export type ImportTemplateResult = {
  blob: Blob;
  filename: string;
};

type ImportRecordsButtonCommonProps = {
  collectionName: string;
  dataSourceKey?: string;
  extension?: ImportRecordsExtension;
  disabled?: boolean;
  label?: ReactNode;
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  onImported?: (result: ImportCompletedResult) => void | Promise<void>;
  onQueued?: (result: ImportQueuedResult) => void;
  onError?: (error: Error) => void;
};

type ImportRecordsButtonTemplateProps = {
  template: ImportTemplateConfig;
  columns?: never;
  templateTitle?: never;
  explain?: never;
};

type ImportRecordsButtonLegacyTemplateProps = {
  template?: never;
  /** @deprecated Use `template.columns`. */
  columns: ImportColumn[];
  /** @deprecated Use `template.title`. */
  templateTitle?: string;
  /** @deprecated Use `template.guide`. */
  explain?: string;
};

export type ImportRecordsButtonProps = ImportRecordsButtonCommonProps &
  (ImportRecordsButtonTemplateProps | ImportRecordsButtonLegacyTemplateProps);
