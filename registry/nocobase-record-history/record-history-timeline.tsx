import { AlertCircle, ChevronDown, ChevronRight, History, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { CanAccess } from "@/components/access-control/can-access";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { useRecordHistoryTranslation } from "./i18n";
import {
  getRecordHistoryErrorCode,
  listRecordHistory,
  resolveRecordHistoryResult,
} from "./record-history-api";
import type { RecordFieldChange, RecordHistory, RecordHistoryTimelineProps } from "./types";

function toError(reason: unknown) {
  return reason instanceof Error ? reason : new Error(String(reason));
}

function defaultValue(value: unknown, empty: string) {
  if (value === null || value === undefined || value === "") return empty;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function RecordHistoryTimelineContent({
  collectionName,
  dataSourceKey = "main",
  recordId,
  filter,
  page: controlledPage,
  pageSize = 10,
  sort = "-createdAt",
  appendSnapshots = true,
  fieldLabels,
  fallbackRows,
  fallbackNotice,
  defaultExpanded = false,
  className,
  renderSummary,
  renderValue,
  onPageChange,
  onError,
}: RecordHistoryTimelineProps) {
  const t = useRecordHistoryTranslation();
  const [uncontrolledPage, setUncontrolledPage] = useState(1);
  const page = controlledPage ?? uncontrolledPage;
  const [rows, setRows] = useState<RecordHistory[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [usingFallback, setUsingFallback] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const serializedFilter = JSON.stringify(filter);
  const serializedFallbackRows = JSON.stringify(fallbackRows);
  const onErrorRef = useRef(onError);
  const fallbackRowsRef = useRef(fallbackRows);
  onErrorRef.current = onError;
  fallbackRowsRef.current = fallbackRows;

  useEffect(() => {
    if (controlledPage === undefined) setUncontrolledPage(1);
  }, [collectionName, controlledPage, dataSourceKey, pageSize, recordId, serializedFilter]);

  useEffect(() => {
    let canceled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    listRecordHistory({
      collectionName,
      dataSourceKey,
      recordId,
      filter,
      page,
      pageSize,
      sort,
      appendSnapshots,
      signal: controller.signal,
    })
      .then((result) => {
        if (canceled) return;
        const resolved = resolveRecordHistoryResult(
          result,
          fallbackRowsRef.current
        );
        setRows(resolved.rows);
        setCount(resolved.count);
        setUsingFallback(resolved.usingFallback);
        setExpanded(defaultExpanded ? new Set(resolved.rows.map((row) => row.uuid)) : new Set());
      })
      .catch((reason: unknown) => {
        if (canceled) return;
        const nextError = toError(reason);
        setError(nextError);
        onErrorRef.current?.(nextError);
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
      controller.abort();
    };
    // serializedFilter intentionally makes filter comparison value-based.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appendSnapshots, collectionName, dataSourceKey, defaultExpanded, page, pageSize, recordId, serializedFallbackRows, serializedFilter, sort]);

  const actionLabels = useMemo(
    () => ({
      create: t("action.create", "Created"),
      update: t("action.update", "Updated"),
      destroy: t("action.destroy", "Deleted"),
    }),
    [t]
  );
  const errorMessages = {
    pluginUnavailable: t(
      "error.pluginUnavailable",
      "Record history is unavailable. Install and enable @nocobase/plugin-record-history on the server."
    ),
    forbidden: t("error.forbidden", "You do not have permission to view record history."),
    unauthorized: t("error.unauthorized", "Your session has expired. Please sign in again."),
    network: t("error.network", "Could not connect to the NocoBase server."),
    load: t("error.load", "Unable to load record history."),
  };
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const showValue = (value: unknown, change: RecordFieldChange, side: "before" | "after") =>
    renderValue?.(value, change, side) ?? defaultValue(value, t("field.empty", "Empty"));

  const changePage = (nextPage: number) => {
    if (controlledPage === undefined) setUncontrolledPage(nextPage);
    onPageChange?.(nextPage);
  };

  return (
      <div className={className} aria-live="polite">
        {loading ? (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="animate-spin" />
            {t("state.loading", "Loading history...")}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{errorMessages[getRecordHistoryErrorCode(error)]}</AlertDescription>
          </Alert>
        ) : rows.length ? (
          <>
            {usingFallback ? (
              <Alert className="mb-6">
                <History />
                <AlertDescription>
                  {fallbackNotice ??
                    t(
                      "state.sample",
                      "Showing illustrative history because the connected server has no tracked records for this collection."
                    )}
                </AlertDescription>
              </Alert>
            ) : null}
            <ol className="relative space-y-5 border-s ps-6">
              {rows.map((history) => {
                const isExpanded = expanded.has(history.uuid);
                const actor = history.user?.nickname || history.user?.username || t("actor.system", "System");
                const action = actionLabels[history.action as keyof typeof actionLabels] ?? history.action;
                return (
                  <li key={history.uuid} className="relative">
                    <span className="absolute -start-[31px] top-1 flex size-3 rounded-full bg-primary ring-4 ring-background" />
                    <Collapsible
                      open={isExpanded}
                      onOpenChange={(open) =>
                        setExpanded((current) => {
                          const next = new Set(current);
                          if (open) next.add(history.uuid);
                          else next.delete(history.uuid);
                          return next;
                        })
                      }
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 font-medium">
                            <Badge variant={history.action === "destroy" ? "destructive" : "secondary"}>{action}</Badge>
                            <span>
                              {renderSummary?.(history) ??
                                t("summary.actor", "{{actor}} {{action}} record #{{recordId}}", {
                                  actor,
                                  action: action.toLocaleLowerCase(),
                                  recordId: history.recordId,
                                })}
                            </span>
                          </div>
                          {history.createdAt ? (
                            <time className="text-xs text-muted-foreground" dateTime={history.createdAt}>
                              {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(
                                new Date(history.createdAt)
                              )}
                            </time>
                          ) : null}
                        </div>
                        {history.recordFieldHistory.length ? (
                          <CollapsibleTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={t("history.toggle", "{{state}} {{count}} field changes", {
                                  state: isExpanded
                                    ? t("history.collapse", "Collapse")
                                    : t("history.expand", "Expand"),
                                  count: history.recordFieldHistory.length,
                                })}
                              />
                            }
                          >
                            {isExpanded ? <ChevronDown /> : <ChevronRight />}
                            {history.recordFieldHistory.length}
                          </CollapsibleTrigger>
                        ) : null}
                      </div>
                      <CollapsibleContent>
                        <div className="mt-3 overflow-x-auto rounded-lg border">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-left">
                              <tr>
                                <th className="px-3 py-2 font-medium">{t("field.name", "Field")}</th>
                                <th className="px-3 py-2 font-medium">{t("field.before", "Before")}</th>
                                <th className="px-3 py-2 font-medium">{t("field.after", "After")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {history.recordFieldHistory.map((change, index) => (
                                <tr key={change.id ?? `${change.fieldPath}-${index}`} className="border-t align-top">
                                  <th className="px-3 py-2 text-left font-medium">
                                    {fieldLabels?.[change.fieldPath] ?? change.fieldPath}
                                  </th>
                                  <td className="max-w-80 break-words px-3 py-2 text-muted-foreground">
                                    {showValue(change.before, change, "before")}
                                  </td>
                                  <td className="max-w-80 break-words px-3 py-2">
                                    {showValue(change.after, change, "after")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </li>
                );
              })}
            </ol>
            {totalPages > 1 ? (
              <nav
                className="mt-6 flex items-center justify-end gap-2"
                aria-label={t("pagination.label", "Record history pagination")}
              >
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => changePage(page - 1)}>
                  {t("pagination.previous", "Previous")}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t("pagination.page", "Page {{page}}", { page })}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => changePage(page + 1)}>
                  {t("pagination.next", "Next")}
                </Button>
              </nav>
            ) : null}
          </>
        ) : (
          <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <History />
            {t("state.empty", "No history records.")}
          </div>
        )}
      </div>
  );
}

export function RecordHistoryTimeline(props: RecordHistoryTimelineProps) {
  return (
    <CanAccess resource="recordHistories" action="list" dataSourceKey="main">
      <RecordHistoryTimelineContent {...props} />
    </CanAccess>
  );
}
