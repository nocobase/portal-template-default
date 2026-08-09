import { Download, LoaderCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { CanAccess } from "@/components/access-control/can-access";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { downloadExportResult, exportRecords } from "./export-api";
import { useExportTranslation } from "./i18n";
import type { ExportRecordsButtonProps } from "./types";

export function ExportRecordsButton({ selectedFilter, ...props }: ExportRecordsButtonProps) {
  const t = useExportTranslation();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<Error>();
  const [taskId, setTaskId] = useState<string>();
  const [selected, setSelected] = useState(() => props.columns.map((_, index) => index));
  const available = useMemo(() => props.columns.map((column, index) => ({ column, index })), [props.columns]);
  const run = async () => {
    if (!selected.length) return setError(new Error(t("fields.empty", "Select at least one field.")));
    setRunning(true); setError(undefined); setTaskId(undefined);
    try {
      const result = await exportRecords({ ...props, filter: selectedFilter ?? props.filter, columns: selected.map((i) => props.columns[i]) });
      if (result.type === "download") { downloadExportResult(result); setOpen(false); }
      else { setTaskId(result.taskId); props.onQueued?.(result.taskId); }
      props.onExported?.(result);
    } catch (reason) {
      const next = reason instanceof Error ? reason : new Error(String(reason));
      setError(next); props.onError?.(next);
    } finally { setRunning(false); }
  };
  const trigger = <Button type="button" variant={props.variant} size={props.size} className={props.className} disabled={props.disabled}><Download />{props.label ?? t("action.export", "Export")}</Button>;
  return <CanAccess resource={props.collectionName} action="export" dataSourceKey={props.dataSourceKey}>
    <Dialog open={open} onOpenChange={(value) => !running && setOpen(value)}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader><DialogTitle>{t("dialog.title", "Export records")}</DialogTitle><DialogDescription>{t("dialog.description", "Choose the fields and records to include in the XLSX file.")}</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">{selectedFilter ? t("scope.selected", "Export selected records") : t("scope.filtered", "Export records matching the current filter")}</p>
          <fieldset className="grid gap-3 rounded-lg border p-4"><legend className="px-1 text-sm font-medium">{t("fields", "Export fields")}</legend>
            {available.map(({ column, index }) => <Label key={column.dataIndex.join(".")} className="flex items-center gap-3 font-normal"><Checkbox checked={selected.includes(index)} onCheckedChange={(checked) => setSelected((value) => checked ? [...value, index] : value.filter((item) => item !== index))} />{column.title || column.defaultTitle}</Label>)}
          </fieldset>
          {taskId ? <Alert><AlertTitle>{t("action.export", "Export")}</AlertTitle><AlertDescription>{t("queued", "Background export task {{taskId}} was created.", { taskId })}</AlertDescription></Alert> : null}
          {error ? <Alert variant="destructive"><AlertTitle>{t("error", "Export failed")}</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert> : null}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={running}>{t("action.cancel", "Cancel")}</Button><Button onClick={run} disabled={running || !selected.length}>{running ? <LoaderCircle className="animate-spin" /> : <Download />}{running ? t("action.exporting", "Exporting...") : t("action.start", "Export XLSX")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </CanAccess>;
}
