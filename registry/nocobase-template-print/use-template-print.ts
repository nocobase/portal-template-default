import { useCallback, useEffect, useState } from "react";

import {
  downloadTemplatePrintResult,
  listPrintingTemplates,
  printTemplate,
} from "./template-print-api";
import type {
  ListPrintingTemplatesOptions,
  PrintingTemplate,
  PrintTemplateOptions,
  TemplatePrintResult,
} from "./types";

export function usePrintingTemplates(
  options: Omit<ListPrintingTemplatesOptions, "signal"> & {
    enabled?: boolean;
  }
) {
  const { collectionName, dataSourceKey, rootDataType, enabled = true } =
    options;
  const [templates, setTemplates] = useState<PrintingTemplate[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error>();
  const [requested, setRequested] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setTemplates([]);
      setLoading(false);
      setError(undefined);
      setRequested(false);
      return;
    }

    const controller = new AbortController();
    setRequested(true);
    setLoading(true);
    setError(undefined);
    listPrintingTemplates({
      collectionName,
      dataSourceKey,
      rootDataType,
      signal: controller.signal,
    })
      .then((records) => {
        setTemplates(records);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason : new Error(String(reason)));
        setLoading(false);
      });

    return () => controller.abort();
  }, [collectionName, dataSourceKey, enabled, refreshIndex, rootDataType]);

  const refresh = useCallback(() => {
    setRefreshIndex((value) => value + 1);
  }, []);

  return { templates, loading, error, requested, refresh };
}

export function useTemplatePrint(
  options: Omit<PrintTemplateOptions, "templateName" | "signal"> & {
    autoDownload?: boolean;
    onPrinted?: (
      result: TemplatePrintResult,
      template: PrintingTemplate
    ) => void;
    onError?: (error: Error) => void;
  }
) {
  const {
    autoDownload = true,
    onPrinted,
    onError,
    ...printOptions
  } = options;
  const [printingTemplate, setPrintingTemplate] = useState<string>();
  const [error, setError] = useState<Error>();

  const print = useCallback(
    async (template: PrintingTemplate) => {
      setPrintingTemplate(template.name);
      setError(undefined);
      try {
        const result = await printTemplate({
          ...printOptions,
          templateName: template.name,
        });
        if (autoDownload) downloadTemplatePrintResult(result);
        onPrinted?.(result, template);
        return result;
      } catch (reason) {
        const normalizedError =
          reason instanceof Error ? reason : new Error(String(reason));
        setError(normalizedError);
        onError?.(normalizedError);
        return undefined;
      } finally {
        setPrintingTemplate(undefined);
      }
    }, [autoDownload, onError, onPrinted, printOptions]
  );

  return { print, printingTemplate, error };
}
