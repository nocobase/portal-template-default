import { Copy, LoaderCircle } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { CanAccess } from "@/components/access-control/can-access";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import {
  normalizeResourceActionError,
  runPostMutationCallback,
} from "./action-utils";
import { ResourceActionFieldInput } from "./field-input";
import { useResourceActionsTranslation } from "./i18n";
import {
  createDuplicateRecord,
  getDuplicateTemplate,
} from "./resource-actions-api";
import type {
  DuplicateRecordButtonProps,
  ResourceValues,
} from "./types";
import { getValueAtPath, setValueAtPath } from "./value-path";

export function DuplicateRecordButton({
  collectionName,
  targetCollectionName = collectionName,
  dataSourceKey,
  recordKey,
  fields,
  mode = "direct",
  confirm = true,
  transformValues,
  button,
  onDuplicated,
  onError,
}: DuplicateRecordButtonProps) {
  const t = useResourceActionsTranslation();
  const fieldIdPrefix = useId();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<ResourceValues>({});
  const [error, setError] = useState<Error>();
  const { label: buttonLabel, ...buttonProps } = button ?? {};
  const disabled = button?.disabled || !fields.length;

  const reportError = (reason: unknown) => {
    const normalized = normalizeResourceActionError(reason, t);
    setError(normalized);
    toast.error(normalized.message);
    onError?.(normalized);
  };

  const loadTemplate = async () => {
    return getDuplicateTemplate({
      collectionName,
      dataSourceKey,
      recordKey,
      fields,
    });
  };

  const createRecord = async (templateValues: ResourceValues) => {
    const nextValues = transformValues
      ? await transformValues(templateValues)
      : templateValues;
    const record = await createDuplicateRecord({
      collectionName: targetCollectionName,
      dataSourceKey,
      values: nextValues,
    });
    return record;
  };

  const completeDuplicate = async (record: unknown) => {
    toast.success(t("success.duplicated", "Record duplicated successfully."));
    const callbackError = await runPostMutationCallback(
      onDuplicated,
      record,
      onError
    );
    if (callbackError) toast.error(callbackError.message);
  };

  const handleDirectDuplicate = async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      const templateValues = await loadTemplate();
      const record = await createRecord(templateValues);
      setConfirmOpen(false);
      await completeDuplicate(record);
    } catch (reason) {
      reportError(reason);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditor = async () => {
    setLoading(true);
    setTemplateLoaded(false);
    setValues({});
    setError(undefined);
    setOpen(true);
    try {
      setValues(await loadTemplate());
      setTemplateLoaded(true);
    } catch (reason) {
      reportError(reason);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromEditor = async () => {
    for (const field of fields) {
      const value = getValueAtPath(values, field.name);
      if (field.required && (value === undefined || value === "")) {
        setError(
          new Error(
            t("error.required", "{{field}} is required.", {
              field: field.label,
            })
          )
        );
        return;
      }
      const validationMessage = field.validate?.(value, values);
      if (validationMessage) {
        setError(new Error(validationMessage));
        return;
      }
    }
    setSubmitting(true);
    setError(undefined);
    try {
      const record = await createRecord(values);
      setOpen(false);
      setValues({});
      setTemplateLoaded(false);
      await completeDuplicate(record);
    } catch (reason) {
      reportError(reason);
    } finally {
      setSubmitting(false);
    }
  };

  const trigger = (
    <Button
      {...buttonProps}
      type="button"
      disabled={disabled || loading || submitting}
      onClick={
        mode === "edit"
          ? handleOpenEditor
          : confirm
            ? undefined
            : handleDirectDuplicate
      }
    >
      {loading || submitting ? <LoaderCircle className="animate-spin" /> : <Copy />}
      {buttonLabel ??
        (submitting
          ? t("action.duplicating", "Duplicating...")
          : t("action.duplicate", "Duplicate"))}
    </Button>
  );

  return (
    <CanAccess resource={targetCollectionName} action="create" dataSourceKey={dataSourceKey}>
      {mode === "direct" && confirm ? (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger render={trigger} />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("duplicate.confirmTitle", "Duplicate record")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  "duplicate.confirmDescription",
                  "Create a new record using the configured fields from this record?"
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>
                {t("action.cancel", "Cancel")}
              </AlertDialogCancel>
              <AlertDialogAction disabled={submitting} onClick={handleDirectDuplicate}>
                {submitting ? <LoaderCircle className="animate-spin" /> : null}
                {t("action.confirm", "Confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        trigger
      )}

      {mode === "edit" ? (
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            if (!nextOpen && submitting) return;
            setOpen(nextOpen);
            if (!nextOpen) {
              setValues({});
              setError(undefined);
              setTemplateLoaded(false);
            }
          }}
        >
          <DialogContent className="max-h-[min(90vh,46rem)] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("duplicate.editTitle", "Duplicate record")}</DialogTitle>
              <DialogDescription>
                {t(
                  "duplicate.editDescription",
                  "Review the copied values before creating the new record."
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2" aria-busy={loading}>
              {loading ? (
                <div className="flex min-h-32 items-center justify-center text-muted-foreground">
                  <LoaderCircle className="animate-spin" />
                </div>
              ) : (
                fields.map((field, index) => {
                  const inputId = `${fieldIdPrefix}-input-${index}`;
                  return (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={inputId}>{field.label}</Label>
                    <ResourceActionFieldInput
                      field={field}
                      id={inputId}
                      value={getValueAtPath(values, field.name)}
                      disabled={submitting}
                      onChange={(value) =>
                        setValues((current) => {
                          const next = structuredClone(current);
                          setValueAtPath(next, field.name, value);
                          return next;
                        })
                      }
                    />
                    {field.description ? (
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                    ) : null}
                  </div>
                  );
                })
              )}
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setOpen(false)}
              >
                {t("action.cancel", "Cancel")}
              </Button>
              <Button
                type="button"
                disabled={loading || submitting || !templateLoaded}
                onClick={handleCreateFromEditor}
              >
                {submitting ? <LoaderCircle className="animate-spin" /> : <Copy />}
                {submitting
                  ? t("action.duplicating", "Duplicating...")
                  : t("action.createDuplicate", "Create duplicate")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </CanAccess>
  );
}
