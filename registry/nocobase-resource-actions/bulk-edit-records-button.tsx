import { Edit3, LoaderCircle } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";

import { CanAccess } from "@/components/access-control/can-access";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  describeUpdateTarget,
  hasSelectedRecords,
  normalizeResourceActionError,
  runPostMutationCallback,
} from "./action-utils";
import { ResourceActionFieldInput } from "./field-input";
import { useResourceActionsTranslation } from "./i18n";
import { updateResourceRecords } from "./resource-actions-api";
import type {
  BulkEditRecordsButtonProps,
  ResourceValues,
} from "./types";
import { setValueAtPath } from "./value-path";

type FieldOperation = {
  mode: "unchanged" | "set" | "clear";
  value?: unknown;
};

export function BulkEditRecordsButton({
  collectionName,
  dataSourceKey,
  target,
  fields,
  button,
  onUpdated,
  onError,
}: BulkEditRecordsButtonProps) {
  const t = useResourceActionsTranslation();
  const fieldIdPrefix = useId();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error>();
  const [operations, setOperations] = useState<Record<string, FieldOperation>>(
    {}
  );
  const { label: buttonLabel, ...buttonProps } = button ?? {};
  const targetDescription = useMemo(
    () => describeUpdateTarget(target, t),
    [t, target]
  );
  const disabled =
    button?.disabled || !fields.length || !hasSelectedRecords(target);

  const reset = () => {
    setOperations({});
    setError(undefined);
    setSubmitting(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && submitting) return;
    setOpen(nextOpen);
    if (!nextOpen) reset();
  };

  const handleSubmit = async () => {
    const values: ResourceValues = {};
    for (const field of fields) {
      const operation = operations[field.name] ?? { mode: "unchanged" };
      if (operation.mode === "unchanged") continue;
      const value =
        operation.mode === "clear" ? field.clearValue ?? null : operation.value;
      if (operation.mode === "set" && field.required && (value === undefined || value === "")) {
        setError(
          new Error(
            t("error.required", "{{field}} is required.", {
              field: field.label,
            })
          )
        );
        return;
      }
      setValueAtPath(values, field.name, value);
      const validationMessage = field.validate?.(value, values);
      if (validationMessage) {
        setError(new Error(validationMessage));
        return;
      }
    }
    if (!Object.keys(values).length) {
      setError(
        new Error(t("error.noChanges", "Choose at least one field to change."))
      );
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      const result = await updateResourceRecords({
        collectionName,
        dataSourceKey,
        target,
        values,
      });
      toast.success(t("success.updated", "Records updated successfully."));
      setOpen(false);
      reset();
      const callbackError = await runPostMutationCallback(
        onUpdated,
        result,
        onError
      );
      if (callbackError) toast.error(callbackError.message);
    } catch (reason) {
      const normalized = normalizeResourceActionError(reason, t);
      setError(normalized);
      onError?.(normalized);
    } finally {
      setSubmitting(false);
    }
  };

  const trigger = (
    <Button {...buttonProps} type="button" disabled={disabled}>
      <Edit3 />
      {buttonLabel ?? t("action.bulkEdit", "Bulk edit")}
    </Button>
  );

  return (
    <CanAccess resource={collectionName} action="update" dataSourceKey={dataSourceKey}>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger render={trigger} />
        <DialogContent className="max-h-[min(90vh,46rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("bulkEdit.title", "Bulk edit records")}</DialogTitle>
            <DialogDescription>
              {t("bulkEdit.description", "Set only the fields that should change.")} {targetDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {fields.map((field, index) => {
              const operation = operations[field.name] ?? { mode: "unchanged" };
              const labelId = `${fieldIdPrefix}-label-${index}`;
              const inputId = `${fieldIdPrefix}-input-${index}`;
              return (
                <div key={field.name} className="space-y-2 rounded-lg border p-3">
                  <div className="space-y-1">
                    <Label id={labelId}>{field.label}</Label>
                    {field.description ? (
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                    ) : null}
                  </div>
                  <Select
                    value={operation.mode}
                    onValueChange={(mode) =>
                      setOperations((current) => ({
                        ...current,
                        [field.name]: {
                          ...operation,
                          mode: mode as FieldOperation["mode"],
                        },
                      }))
                    }
                  >
                    <SelectTrigger className="w-full" aria-labelledby={labelId}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unchanged">
                        {t("field.unchanged", "Keep unchanged")}
                      </SelectItem>
                      <SelectItem value="set">
                        {t("field.set", "Change to")}
                      </SelectItem>
                      <SelectItem value="clear">
                        {t("field.clear", "Clear")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {operation.mode === "set" ? (
                    <ResourceActionFieldInput
                      field={field}
                      id={inputId}
                      ariaLabelledBy={labelId}
                      value={operation.value}
                      onChange={(value) =>
                        setOperations((current) => ({
                          ...current,
                          [field.name]: { mode: "set", value },
                        }))
                      }
                    />
                  ) : null}
                </div>
              );
            })}
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
              onClick={() => handleOpenChange(false)}
            >
              {t("action.cancel", "Cancel")}
            </Button>
            <Button type="button" disabled={submitting} onClick={handleSubmit}>
              {submitting ? <LoaderCircle className="animate-spin" /> : <Edit3 />}
              {submitting
                ? t("action.updating", "Updating...")
                : t("action.update", "Update records")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CanAccess>
  );
}
