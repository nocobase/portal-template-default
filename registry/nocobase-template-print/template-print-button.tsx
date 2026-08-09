import { ChevronDown, LoaderCircle, Printer } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { usePrintingTemplates, useTemplatePrint } from "./use-template-print";
import type {
  PrintingTemplate,
  TemplatePrintMessages,
  TemplatePrintResult,
  TemplatePrintSelection,
  TemplateRootDataType,
} from "./types";

const defaultMessages: TemplatePrintMessages = {
  print: "Template print",
  selectTemplate: "Select a printing template",
  loadingTemplates: "Loading templates...",
  noTemplates: "No printing templates are configured for this collection",
  failedToLoadTemplates: "Failed to load printing templates",
  printing: "Generating document...",
  noSelectedRecords: "Select at least one record to print",
};

export type TemplatePrintButtonProps = {
  collectionName: string;
  dataSourceKey?: string;
  selection: TemplatePrintSelection;
  queryParams?: Record<string, unknown>;
  templateName?: string;
  templateTitle?: string;
  templates?: PrintingTemplate[];
  convertedToPDF?: boolean;
  uid?: string;
  autoDownload?: boolean;
  disabled?: boolean;
  label?: ReactNode;
  messages?: Partial<TemplatePrintMessages>;
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  onPrinted?: (
    result: TemplatePrintResult,
    template: PrintingTemplate
  ) => void;
  onError?: (error: Error) => void;
};

export function TemplatePrintButton({
  collectionName,
  dataSourceKey = "main",
  selection,
  queryParams,
  templateName,
  templateTitle,
  templates: suppliedTemplates,
  convertedToPDF,
  uid,
  autoDownload,
  disabled,
  label,
  messages: messageOverrides,
  className,
  variant,
  size,
  onPrinted,
  onError,
}: TemplatePrintButtonProps) {
  const messages = useMemo(
    () => ({ ...defaultMessages, ...messageOverrides }),
    [messageOverrides]
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const rootDataType: TemplateRootDataType =
    selection.type === "single" ? "map" : "array";
  const needsTemplateList = !templateName && !suppliedTemplates;
  const templateRequest = usePrintingTemplates({
    collectionName,
    dataSourceKey,
    rootDataType,
    enabled: needsTemplateList && pickerOpen,
  });
  const templates = suppliedTemplates ?? templateRequest.templates;
  const loadingTemplates =
    needsTemplateList &&
    pickerOpen &&
    (!templateRequest.requested || templateRequest.loading);
  const directTemplate = templateName
    ? {
        name: templateName,
        title: templateTitle || templateName,
        collectionName,
        dataSource: dataSourceKey,
        rootDataType,
      }
    : undefined;
  const printer = useTemplatePrint({
    collectionName,
    dataSourceKey,
    selection,
    queryParams,
    convertedToPDF,
    uid,
    autoDownload,
    onPrinted,
    onError,
  });
  const selectionEmpty =
    selection.type === "selected" && selection.recordKeys.length === 0;
  const busy = Boolean(printer.printingTemplate);
  const buttonDisabled = disabled || selectionEmpty || busy;
  const buttonTitle = selectionEmpty
    ? messages.noSelectedRecords
    : printer.error?.message;
  const buttonLabel = busy ? messages.printing : label || messages.print;
  const notifyNoTemplates = useCallback(() => {
    const error = new Error(messages.noTemplates);
    if (onError) {
      onError(error);
      return;
    }
    toast.error(error.message);
  }, [messages.noTemplates, onError]);

  const handlePickerOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setPickerOpen(false);
        return;
      }
      if (!needsTemplateList && !templates.length) {
        notifyNoTemplates();
        return;
      }
      setPickerOpen(true);
    },
    [needsTemplateList, notifyNoTemplates, templates.length]
  );

  useEffect(() => {
    if (
      !pickerOpen ||
      !needsTemplateList ||
      !templateRequest.requested ||
      templateRequest.loading ||
      templateRequest.error ||
      templates.length
    ) {
      return;
    }
    setPickerOpen(false);
    notifyNoTemplates();
  }, [
    notifyNoTemplates,
    needsTemplateList,
    pickerOpen,
    templateRequest.error,
    templateRequest.loading,
    templateRequest.requested,
    templates.length,
  ]);

  const trigger = (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={buttonDisabled}
      title={buttonTitle}
      aria-busy={busy}
    >
      {busy ? <LoaderCircle className="animate-spin" /> : <Printer />}
      {buttonLabel}
    </Button>
  );

  if (directTemplate) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={buttonDisabled}
        title={buttonTitle}
        aria-busy={busy}
        onClick={async () => {
          await printer.print(directTemplate);
        }}
      >
        {busy ? <LoaderCircle className="animate-spin" /> : <Printer />}
        {buttonLabel}
      </Button>
    );
  }

  return (
    <DropdownMenu open={pickerOpen} onOpenChange={handlePickerOpenChange}>
      <DropdownMenuTrigger render={trigger}>
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{messages.selectTemplate}</DropdownMenuLabel>
          {loadingTemplates ? (
            <DropdownMenuItem disabled>
              <LoaderCircle className="animate-spin" />
              {messages.loadingTemplates}
            </DropdownMenuItem>
          ) : templateRequest.error ? (
            <DropdownMenuItem disabled>
              {messages.failedToLoadTemplates}
            </DropdownMenuItem>
          ) : templates.length ? (
            templates.map((template) => (
              <DropdownMenuItem
                key={template.name}
                onClick={async () => {
                  await printer.print(template);
                }}
              >
                <Printer />
                <span className="min-w-0 truncate" title={template.title}>
                  {template.title}
                </span>
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled>{messages.noTemplates}</DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
