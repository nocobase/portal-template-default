import type { ComponentProps, ReactNode } from "react";

import type { Button } from "@/components/ui/button";

export type ResourceKey = string | number | Record<string, string | number>;
export type ResourceValues = Record<string, unknown>;
export type ResourceFilter = Record<string, unknown>;

export type ResourceUpdateTarget =
  | {
      type: "selected";
      keys: ResourceKey[];
    }
  | {
      type: "filter";
      filter: ResourceFilter;
    }
  | {
      type: "all";
    };

export type ResourceActionButtonOptions = Omit<
  ComponentProps<typeof Button>,
  "children" | "onClick"
> & {
  label?: ReactNode;
};

export type ResourceActionFieldOption = {
  label: string;
  value: string;
};

export type ResourceActionFieldInputProps = {
  id: string;
  ariaLabelledBy?: string;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
};

export type ResourceActionField = {
  name: string;
  label: string;
  description?: ReactNode;
  input?: "text" | "email" | "tel" | "number" | "textarea" | "select" | "checkbox";
  options?: ResourceActionFieldOption[];
  placeholder?: string;
  clearValue?: unknown;
  required?: boolean;
  renderInput?: (props: ResourceActionFieldInputProps) => ReactNode;
  validate?: (value: unknown, values: ResourceValues) => string | undefined;
};

export type ResourceActionCommonProps = {
  collectionName: string;
  dataSourceKey?: string;
  button?: ResourceActionButtonOptions;
  onError?: (error: Error) => void;
};

export type BulkEditRecordsButtonProps = ResourceActionCommonProps & {
  target: ResourceUpdateTarget;
  fields: ResourceActionField[];
  onUpdated?: (result: unknown) => void | Promise<void>;
};

export type BulkUpdateRecordsButtonProps = ResourceActionCommonProps & {
  target: ResourceUpdateTarget;
  values: ResourceValues | (() => ResourceValues | Promise<ResourceValues>);
  confirm?: boolean;
  confirmTitle?: ReactNode;
  confirmDescription?: ReactNode;
  onUpdated?: (result: unknown) => void | Promise<void>;
};

export type DuplicateRecordButtonProps = ResourceActionCommonProps & {
  recordKey: ResourceKey;
  fields: ResourceActionField[];
  mode?: "direct" | "edit";
  targetCollectionName?: string;
  confirm?: boolean;
  transformValues?: (
    values: ResourceValues
  ) => ResourceValues | Promise<ResourceValues>;
  onDuplicated?: (record: unknown) => void | Promise<void>;
};
