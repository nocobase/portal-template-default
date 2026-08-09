import { LoaderCircle, WandSparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CanAccess } from "@/components/access-control/can-access";
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
  describeUpdateTarget,
  hasSelectedRecords,
  normalizeResourceActionError,
  runPostMutationCallback,
} from "./action-utils";
import { useResourceActionsTranslation } from "./i18n";
import { updateResourceRecords } from "./resource-actions-api";
import type { BulkUpdateRecordsButtonProps } from "./types";

export function BulkUpdateRecordsButton({
  collectionName,
  dataSourceKey,
  target,
  values,
  confirm = true,
  confirmTitle,
  confirmDescription,
  button,
  onUpdated,
  onError,
}: BulkUpdateRecordsButtonProps) {
  const t = useResourceActionsTranslation();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { label: buttonLabel, ...buttonProps } = button ?? {};
  const targetDescription = useMemo(
    () => describeUpdateTarget(target, t),
    [t, target]
  );
  const disabled = button?.disabled || !hasSelectedRecords(target);

  const performUpdate = async () => {
    setSubmitting(true);
    try {
      const resolvedValues = typeof values === "function" ? await values() : values;
      if (!Object.keys(resolvedValues).length) {
        throw new Error(t("error.noAssignedValues", "No assigned fields configured."));
      }
      const result = await updateResourceRecords({
        collectionName,
        dataSourceKey,
        target,
        values: resolvedValues,
      });
      toast.success(t("success.updated", "Records updated successfully."));
      setOpen(false);
      const callbackError = await runPostMutationCallback(
        onUpdated,
        result,
        onError
      );
      if (callbackError) toast.error(callbackError.message);
    } catch (reason) {
      const normalized = normalizeResourceActionError(reason, t);
      toast.error(normalized.message);
      onError?.(normalized);
    } finally {
      setSubmitting(false);
    }
  };

  const trigger = (
    <Button
      {...buttonProps}
      type="button"
      disabled={disabled || submitting}
      onClick={confirm ? undefined : performUpdate}
    >
      {submitting ? <LoaderCircle className="animate-spin" /> : <WandSparkles />}
      {buttonLabel ?? t("action.bulkUpdate", "Bulk update")}
    </Button>
  );

  return (
    <CanAccess resource={collectionName} action="update" dataSourceKey={dataSourceKey}>
      {confirm ? (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger render={trigger} />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmTitle ?? t("bulkUpdate.title", "Bulk update")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDescription ??
                  t(
                    "bulkUpdate.description",
                    "Apply the configured values to {{target}}?",
                    { target: targetDescription }
                  )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>
                {t("action.cancel", "Cancel")}
              </AlertDialogCancel>
              <AlertDialogAction disabled={submitting} onClick={performUpdate}>
                {submitting ? <LoaderCircle className="animate-spin" /> : null}
                {t("action.confirm", "Confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        trigger
      )}
    </CanAccess>
  );
}
