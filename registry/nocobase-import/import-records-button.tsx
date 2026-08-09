import { CheckCircle2, Download, FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { CanAccess } from "@/components/access-control/can-access";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import {
  downloadImportTemplate,
  downloadImportTemplateResult,
  importRecords,
  isXlsxFile,
} from "./import-api";
import { useImportTranslation } from "./i18n";
import type {
  ImportCompletedResult,
  ImportRecordsButtonProps,
} from "./types";

type ImportPhase = "form" | "importing" | "completed" | "queued" | "error";

function Step({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-[2rem_1fr] gap-3">
      <span
        className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
        aria-hidden="true"
      >
        {number}
      </span>
      <div className="min-w-0 space-y-3">
        <div>
          <h3 className="font-medium">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}

export function ImportRecordsButton(props: ImportRecordsButtonProps) {
  const resolvedTemplate = props.template
    ? props.template
    : {
        columns: props.columns,
        title: props.templateTitle,
        guide: props.explain,
      };
  const {
    collectionName,
    dataSourceKey = "main",
    extension,
    disabled,
    label,
    className,
    variant,
    size,
    onImported,
    onQueued,
    onError,
  } = props;
  const t = useImportTranslation();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<ImportPhase>("form");
  const [file, setFile] = useState<File>();
  const [fileInputKey, setFileInputKey] = useState(0);
  const [result, setResult] = useState<ImportCompletedResult>();
  const [taskId, setTaskId] = useState<string>();
  const [error, setError] = useState<Error>();
  const [downloading, setDownloading] = useState(false);

  const target = useMemo(
    () => `${dataSourceKey} / ${collectionName}`,
    [collectionName, dataSourceKey]
  );

  const reset = useCallback(() => {
    setPhase("form");
    setFile(undefined);
    setFileInputKey((value) => value + 1);
    setResult(undefined);
    setTaskId(undefined);
    setError(undefined);
    setDownloading(false);
    extension?.reset?.();
  }, [extension]);

  const reportError = useCallback(
    (reason: unknown) => {
      const normalized = reason instanceof Error ? reason : new Error(String(reason));
      setError(normalized);
      setPhase("error");
      onError?.(normalized);
    },
    [onError]
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && phase === "importing") return;
      setOpen(nextOpen);
      if (!nextOpen) reset();
    },
    [phase, reset]
  );

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    setError(undefined);
    try {
      const template = await downloadImportTemplate({
        collectionName,
        dataSourceKey,
        columns: resolvedTemplate.columns,
        title: resolvedTemplate.title,
        explain: resolvedTemplate.guide,
      });
      downloadImportTemplateResult(template);
    } catch (reason) {
      reportError(reason);
    } finally {
      setDownloading(false);
    }
  };

  const handleImport = async () => {
    if (!file || !isXlsxFile(file)) {
      reportError(new Error(t("file.invalid", "Choose a file with the .xlsx extension.")));
      return;
    }
    const validationMessage = extension?.validate?.();
    if (validationMessage) {
      reportError(new Error(validationMessage));
      return;
    }

    setPhase("importing");
    setError(undefined);
    try {
      const nextResult = await importRecords({
        collectionName,
        dataSourceKey,
        columns: resolvedTemplate.columns,
        file,
        explain: resolvedTemplate.guide,
        mode: extension?.mode,
        appendFormData: extension?.appendFormData,
      });
      if (nextResult.type === "queued") {
        setTaskId(nextResult.taskId);
        setPhase("queued");
        onQueued?.(nextResult);
        return;
      }
      setResult(nextResult);
      setPhase("completed");
      await onImported?.(nextResult);
    } catch (reason) {
      reportError(reason);
    }
  };

  const handleQueuedCompleted = useCallback(
    async (completed: ImportCompletedResult) => {
      setResult(completed);
      setPhase("completed");
      await onImported?.(completed);
    },
    [onImported]
  );

  const trigger = (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
    >
      <Upload />
      {label || t("action.import", "Import")}
    </Button>
  );

  return (
    <CanAccess
      resource={collectionName}
      action="importXlsx"
      dataSourceKey={dataSourceKey}
    >
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger render={trigger} />
        <DialogContent className="max-h-[min(90vh,48rem)] overflow-y-auto sm:max-w-[750px]">
        <DialogHeader>
          <DialogTitle>{t("dialog.title", "Import records")}</DialogTitle>
          <DialogDescription>
            {t(
              "dialog.description",
              "Download the matching template, fill it in, and upload one XLSX file."
            )}
          </DialogDescription>
        </DialogHeader>

        {phase === "completed" && result ? (
          <div className="space-y-4 py-3">
            <Alert>
              <CheckCircle2 />
              <AlertTitle>{t("result.title", "Import completed")}</AlertTitle>
              <AlertDescription>
                {t(
                  "result.summary",
                  "{{success}} imported, {{updated}} updated, {{skipped}} skipped, {{failed}} failed.",
                  result.stats
                )}
              </AlertDescription>
            </Alert>
          </div>
        ) : phase === "queued" && taskId ? (
          <div className="space-y-4 py-3">
            {extension?.renderQueued?.({
              taskId,
              onCompleted: handleQueuedCompleted,
              onError: reportError,
            }) ?? (
              <Alert>
                <LoaderCircle className="animate-spin" />
                <AlertTitle>{t("queued.title", "Import queued")}</AlertTitle>
                <AlertDescription>
                  {t(
                    "queued.description",
                    "Task {{taskId}} is waiting for background processing.",
                    { taskId }
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : phase === "error" && error ? (
          <div className="space-y-4 py-3">
            <Alert variant="destructive">
              <AlertTitle>{t("error.title", "Import failed")}</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap break-words">
                {error.message}
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-6 py-2" aria-busy={phase === "importing"}>
            <Step
              number={1}
              title={t("step.template", "Download template")}
              description={t(
                "step.templateDescription",
                "The template contains the fields accepted by this import action."
              )}
            >
              <Button
                type="button"
                variant="outline"
                disabled={downloading || phase === "importing"}
                onClick={handleDownloadTemplate}
              >
                {downloading ? <LoaderCircle className="animate-spin" /> : <Download />}
                {downloading
                  ? t("template.downloading", "Downloading...")
                  : t("template.download", "Download template")}
              </Button>
            </Step>

            <Step
              number={2}
              title={t("step.upload", "Upload XLSX")}
              description={t(
                "step.uploadDescription",
                "Only one .xlsx file can be imported at a time."
              )}
            >
              <Input
                key={fileInputKey}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                aria-label={t("file.choose", "Choose XLSX file")}
                disabled={phase === "importing"}
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  setFile(selected);
                  setError(undefined);
                }}
              />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="size-4" />
                <span className="truncate" title={file?.name}>
                  {file?.name || t("file.empty", "No file selected")}
                </span>
              </div>
            </Step>

            <Step
              number={3}
              title={
                extension?.reviewTitle || t("step.review", "Review and import")
              }
              description={
                extension?.reviewDescription ??
                t(
                  "step.reviewDescription",
                  "Confirm the selected file and any available import options."
                )
              }
            >
              <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                {t("target", "Target: {{target}}", { target })}
              </p>
              {extension?.options}
            </Step>
          </div>
        )}

        <DialogFooter>
          {phase === "form" || phase === "importing" ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={phase === "importing"}
                onClick={() => handleOpenChange(false)}
              >
                {t("action.cancel", "Cancel")}
              </Button>
              <Button
                type="button"
                disabled={!file || phase === "importing"}
                onClick={handleImport}
              >
                {phase === "importing" ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Upload />
                )}
                {phase === "importing"
                  ? t("action.importing", "Importing...")
                  : t("action.start", "Start import")}
              </Button>
            </>
          ) : phase === "error" ? (
            <>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {t("action.close", "Close")}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setError(undefined);
                  setPhase("form");
                }}
              >
                {t("action.back", "Back")}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={() => handleOpenChange(false)}>
              {t("action.close", "Close")}
            </Button>
          )}
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </CanAccess>
  );
}
