import type { ComponentProps, ReactNode } from "react";
import type { Button } from "@/components/ui/button";
import type { ExportMode } from "@/extensions/nocobase-export/types";

export type ExportAttachmentsOptions = {
  collectionName: string;
  dataSourceKey?: string;
  title: string;
  fields: string[];
  filter?: unknown;
  sort?: string[];
  appends?: string[];
  mode?: ExportMode;
  singleFolderPerRecord?: boolean;
  signal?: AbortSignal;
};

export type ExportAttachmentsButtonProps = ExportAttachmentsOptions & {
  availableFields: Array<{ name: string; title: string }>;
  label?: ReactNode;
  disabled?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
  onQueued?: (taskId: string) => void;
  onError?: (error: Error) => void;
};
