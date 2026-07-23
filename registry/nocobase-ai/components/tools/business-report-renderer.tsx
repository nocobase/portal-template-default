import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { FileText, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { getNocoBaseToolCallMetadata } from "../chat/tool-call-card";
import type { AIToolRendererProps } from "./tool-renderer-provider";
import {
  normalizeBusinessReportCharts,
  type BusinessReportData,
} from "./business-report-utils";
import {
  openBusinessReportDialog,
  updateBusinessReportDialog,
} from "./business-report-dialog";
import { asRecord, asString } from "./tool-renderer-utils";

export function BusinessReportRenderer({ part }: AIToolRendererProps) {
  const input = asRecord(part.input);
  const title = asString(input.title) || "Business analysis report";
  const reportSummary = asString(input.summary);
  const summary =
    reportSummary || "Open the report to review the generated analysis.";
  const charts = useMemo(
    () => normalizeBusinessReportCharts(input.charts),
    [input.charts]
  );
  const report = useMemo<BusinessReportData>(
    () => ({
      title,
      summary: reportSummary || undefined,
      markdown: asString(input.markdown),
      charts,
      fileName: asString(input.fileName) || undefined,
    }),
    [charts, input.fileName, input.markdown, reportSummary, title]
  );
  const metadata = getNocoBaseToolCallMetadata(part);
  const ready =
    part.state === "output-available" ||
    (metadata?.status === "success" &&
      ["done", "confirmed"].includes(metadata.invokeStatus ?? ""));
  const generating = !ready && part.state !== "output-error";
  const wasGenerating = useRef(false);

  useEffect(() => {
    updateBusinessReportDialog(part.toolCallId, report, ready);
  }, [part.toolCallId, ready, report]);

  useEffect(() => {
    if (generating) {
      wasGenerating.current = true;
      return;
    }
    if (wasGenerating.current && ready) {
      wasGenerating.current = false;
      openBusinessReportDialog(part.toolCallId, report, ready);
    }
  }, [generating, part.toolCallId, ready, report]);

  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-lg border bg-background p-3 text-left transition-colors",
        ready && "hover:bg-muted/40"
      )}
      disabled={!ready}
      onClick={() => openBusinessReportDialog(part.toolCallId, report, ready)}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
          {generating ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <FileText className="size-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium">{title}</div>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {summary}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary">
              {generating ? "Generating" : "Markdown"}
            </Badge>
            <Badge variant="outline">{charts.length} charts</Badge>
            <Badge variant="outline">Preview and export</Badge>
          </div>
          {generating ? <Progress className="mt-3" value={62} /> : null}
        </div>
      </div>
    </button>
  );
}
