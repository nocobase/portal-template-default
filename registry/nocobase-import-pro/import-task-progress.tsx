import { AlertCircle, CheckCircle2, LoaderCircle, OctagonX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  normalizeCompletedImportPayload,
  type ImportCompletedResult,
} from "@/extensions/nocobase-import";

import {
  cancelAsyncImportTask,
  getAsyncImportTask,
} from "./import-task-api";
import { useImportProTranslation } from "./i18n";
import type { AsyncImportTask } from "./types";

const TASK_STATUS = {
  PENDING: null,
  RUNNING: 0,
  SUCCEEDED: 1,
  FAILED: -1,
  CANCELED: -2,
} as const;

function getTaskError(task: AsyncImportTask) {
  if (typeof task.result === "string") return task.result;
  if (typeof task.result === "object" && task.result !== null) {
    const message = (task.result as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }
  return undefined;
}

export function ImportTaskProgress({
  taskId,
  onCompleted,
  onError,
  pollInterval = 1500,
}: {
  taskId: string;
  onCompleted: (result: ImportCompletedResult) => Promise<void>;
  onError: (error: Error) => void;
  pollInterval?: number;
}) {
  const t = useImportProTranslation();
  const [task, setTask] = useState<AsyncImportTask>();
  const [canceling, setCanceling] = useState(false);
  const [pollError, setPollError] = useState<Error>();

  useEffect(() => {
    const controller = new AbortController();
    let timer: number | undefined;
    let settled = false;

    const poll = async () => {
      try {
        const nextTask = await getAsyncImportTask(taskId, controller.signal);
        if (controller.signal.aborted) return;
        setTask(nextTask);
        setPollError(undefined);

        if (nextTask.status === TASK_STATUS.SUCCEEDED) {
          if (!settled) {
            settled = true;
            await onCompleted(normalizeCompletedImportPayload(nextTask.result));
          }
          return;
        }
        if (nextTask.status === TASK_STATUS.FAILED) {
          if (!settled) {
            settled = true;
            onError(
              new Error(
                getTaskError(nextTask) ||
                  t("task.failed", "Background import failed")
              )
            );
          }
          return;
        }
        if (nextTask.status === TASK_STATUS.CANCELED) return;
        timer = window.setTimeout(poll, pollInterval);
      } catch (reason) {
        if (controller.signal.aborted) return;
        const error = reason instanceof Error ? reason : new Error(String(reason));
        setPollError(error);
        timer = window.setTimeout(poll, pollInterval);
      }
    };

    poll();
    return () => {
      controller.abort();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [onCompleted, onError, pollInterval, t, taskId]);

  const progress = useMemo(() => {
    if (!task?.progressTotal) return 0;
    return Math.min(100, (task.progressCurrent / task.progressTotal) * 100);
  }, [task]);

  const handleCancel = useCallback(async () => {
    setCanceling(true);
    try {
      await cancelAsyncImportTask(taskId);
      setTask((current) =>
        current ? { ...current, status: TASK_STATUS.CANCELED } : current
      );
    } catch (reason) {
      onError(reason instanceof Error ? reason : new Error(String(reason)));
    } finally {
      setCanceling(false);
    }
  }, [onError, taskId]);

  if (task?.status === TASK_STATUS.CANCELED) {
    return (
      <Alert>
        <OctagonX />
        <AlertTitle>{t("task.canceled", "Background import canceled")}</AlertTitle>
      </Alert>
    );
  }

  if (task?.status === TASK_STATUS.SUCCEEDED) {
    return (
      <Alert>
        <CheckCircle2 />
        <AlertTitle>{t("task.completed", "Background import completed")}</AlertTitle>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <LoaderCircle className="mt-0.5 size-4 animate-spin text-primary" />
          <div>
            <p className="font-medium">
              {task?.status === TASK_STATUS.RUNNING
                ? t("task.running", "Importing in background")
                : t("task.pending", "Waiting")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{taskId}</p>
          </div>
        </div>
        {task?.cancelable ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={canceling}
            onClick={handleCancel}
          >
            {canceling
              ? t("task.canceling", "Canceling...")
              : t("task.cancel", "Cancel task")}
          </Button>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">
          {t("task.progress", "{{current}} of {{total}} records processed", {
            current: task?.progressCurrent ?? 0,
            total: task?.progressTotal ?? 0,
          })}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {progress.toFixed(1)}%
        </span>
      </div>
      <Progress value={progress} />

      {pollError ? (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{pollError.message}</p>
        </div>
      ) : null}
    </div>
  );
}
