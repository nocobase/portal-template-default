import ReactECharts from "echarts-for-react";
import { AlertCircle, BarChart3, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { CanAccess } from "@/components/access-control/can-access";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useDataVisualizationTranslation } from "./i18n";
import type { NocoBaseChartProps } from "./types";
import { useChartData } from "./use-chart-data";

function NocoBaseChartContent({
  query,
  option,
  height = 360,
  className,
  ariaLabel,
  emptyContent,
  loadingContent,
  onLoaded,
  onError,
}: NocoBaseChartProps) {
  const t = useDataVisualizationTranslation();
  const { rows, loading, error } = useChartData(query);
  const onLoadedRef = useRef(onLoaded);
  const onErrorRef = useRef(onError);
  onLoadedRef.current = onLoaded;
  onErrorRef.current = onError;
  const resolvedOption = useMemo(
    () => ({
      aria: { enabled: true },
      ...(typeof option === "function" ? option(rows, query) : option),
    }),
    [option, query, rows]
  );

  useEffect(() => {
    if (!loading && !error) onLoadedRef.current?.(rows);
  }, [error, loading, rows]);

  useEffect(() => {
    if (error) onErrorRef.current?.(error);
  }, [error]);

  return (
      <div
        className={className}
        style={{ minHeight: height }}
        aria-live="polite"
        aria-label={ariaLabel ?? t("chart.label", "Chart")}
        role="figure"
      >
        {loading ? (
          loadingContent ?? (
            <div className="flex h-full min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="animate-spin" />
              {t("state.loading", "Loading chart data...")}
            </div>
          )
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{t("error.load", "Unable to load chart data.")}</AlertDescription>
          </Alert>
        ) : rows.length ? (
          <ReactECharts option={resolvedOption} style={{ height }} notMerge lazyUpdate />
        ) : (
          emptyContent ?? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <BarChart3 />
              {t("state.empty", "No chart data.")}
            </div>
          )
        )}
        {!loading && !error && rows.length ? <span className="sr-only">{JSON.stringify(rows)}</span> : null}
      </div>
  );
}

export function NocoBaseChart(props: NocoBaseChartProps) {
  const t = useDataVisualizationTranslation();
  return (
    <CanAccess
      resource="charts"
      action="queryData"
      fallback={
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{t("error.load", "Unable to load chart data.")}</AlertDescription>
        </Alert>
      }
    >
      <NocoBaseChartContent {...props} />
    </CanAccess>
  );
}
