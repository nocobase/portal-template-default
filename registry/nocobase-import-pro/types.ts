import type { ImportMode, ImportRecordsButtonProps } from "@/extensions/nocobase-import";

export type DuplicateMode = "skip" | "overwrite" | "update_only";
export type EmptyValueOption = "overwrite" | "ignore";

export type ImportProOptionsValue = {
  mode: ImportMode;
  triggerWorkflow: boolean;
  identifyDuplicates: boolean;
  uniqueFields: string[];
  duplicateMode: DuplicateMode;
  emptyValueOption: EmptyValueOption;
};

export type ImportProExecutionConfig = {
  mode?: ImportMode;
  triggerWorkflow?: boolean;
};

export type ImportProDuplicatesConfig = {
  enabled?: boolean;
  strategy?: DuplicateMode;
  fields?: string[];
  emptyCell?: EmptyValueOption;
  editableByUploader?: boolean;
};

type DistributiveOmit<T, Key extends PropertyKey> = T extends unknown
  ? Omit<T, Key>
  : never;

export type ImportProRecordsButtonProps = DistributiveOmit<
  ImportRecordsButtonProps,
  "extension"
> & {
  execution?: ImportProExecutionConfig;
  duplicates?: ImportProDuplicatesConfig;
  /** @deprecated Use `execution` and `duplicates`. */
  defaultOptions?: Partial<ImportProOptionsValue>;
  /** @deprecated Processing mode is fixed through `execution.mode`. */
  allowModeSelection?: boolean;
  /** @deprecated Workflow triggering is fixed through `execution.triggerWorkflow`. */
  allowWorkflowTrigger?: boolean;
  /** @deprecated Use `duplicates.editableByUploader`. */
  allowDuplicateHandling?: boolean;
};

export type AsyncImportTask = {
  id: string;
  title?: string;
  status: number | null;
  result?: unknown;
  cancelable: boolean;
  progressCurrent: number;
  progressTotal: number;
};
