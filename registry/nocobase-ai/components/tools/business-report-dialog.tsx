import { MarkdownMessage } from "../chat/markdown-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileCode2, LoaderCircle, Printer } from "lucide-react";
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  buildBusinessReportHtml,
  buildBusinessReportMarkdown,
  downloadBusinessReportFile,
  getBusinessReportFileName,
  printBusinessReport,
  splitBusinessReportMarkdown,
  type BusinessReportData,
} from "./business-report-utils";

type BusinessReportDialogSnapshot = {
  open: boolean;
  toolCallId?: string;
  report?: BusinessReportData;
  ready: boolean;
};

const closedSnapshot: BusinessReportDialogSnapshot = {
  open: false,
  ready: false,
};
let snapshot = closedSnapshot;
const listeners = new Set<() => void>();
const EChartsPreview = lazy(() => import("./echarts-preview"));

const emit = () => listeners.forEach((listener) => listener());

const sameCharts = (
  left: BusinessReportData["charts"],
  right: BusinessReportData["charts"]
) => left === right || JSON.stringify(left) === JSON.stringify(right);

const sameReport = (
  left: BusinessReportData | undefined,
  right: BusinessReportData
) =>
  left?.title === right.title &&
  left.summary === right.summary &&
  left.markdown === right.markdown &&
  left.fileName === right.fileName &&
  sameCharts(left.charts, right.charts);

export const openBusinessReportDialog = (
  toolCallId: string,
  report: BusinessReportData,
  ready: boolean
) => {
  snapshot = { open: true, toolCallId, report, ready };
  emit();
};

export const updateBusinessReportDialog = (
  toolCallId: string,
  report: BusinessReportData,
  ready: boolean
) => {
  if (snapshot.toolCallId !== toolCallId) return;
  if (snapshot.ready === ready && sameReport(snapshot.report, report)) return;
  snapshot = { ...snapshot, report, ready };
  emit();
};

const setOpen = (open: boolean) => {
  if (snapshot.open === open) return;
  snapshot = { ...snapshot, open };
  emit();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => snapshot;

function ChartPreview({ options }: { options: Record<string, unknown> }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-[280px] items-center justify-center text-xs text-muted-foreground">
          <LoaderCircle className="mr-2 size-4 animate-spin" /> Loading chart…
        </div>
      }
    >
      <EChartsPreview options={options} />
    </Suspense>
  );
}

export function BusinessReportDialogHost() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const report = state.report;
  const [activeTab, setActiveTab] = useState("preview");
  const [htmlPreview, setHtmlPreview] = useState("");
  const [htmlPreviewSignature, setHtmlPreviewSignature] = useState("");
  const [htmlLoading, setHtmlLoading] = useState(false);
  const [exporting, setExporting] = useState<"html" | "pdf">();
  const [exportError, setExportError] = useState<string>();
  const reportSignature = useMemo(
    () => (state.ready && report ? JSON.stringify(report) : ""),
    [report, state.ready]
  );
  const reportMarkdown = useMemo(
    () => (state.open && state.ready && report ? buildBusinessReportMarkdown(report) : ""),
    [report, state.open, state.ready]
  );
  const previewParts = useMemo(
    () =>
      activeTab === "preview" && reportMarkdown
        ? splitBusinessReportMarkdown(reportMarkdown)
        : [],
    [activeTab, reportMarkdown]
  );

  useEffect(() => {
    setActiveTab("preview");
    setHtmlPreview("");
    setHtmlPreviewSignature("");
    setExportError(undefined);
  }, [state.toolCallId]);

  useEffect(() => {
    if (
      !state.open ||
      activeTab !== "html" ||
      !state.ready ||
      !report?.markdown ||
      (htmlPreview && htmlPreviewSignature === reportSignature)
    ) {
      return;
    }
    let active = true;
    setHtmlLoading(true);
    setHtmlPreview("");
    void buildBusinessReportHtml(report)
      .then((html) => {
        if (!active) return;
        setHtmlPreview(html);
        setHtmlPreviewSignature(reportSignature);
      })
      .catch((error: unknown) => {
        if (active) {
          setExportError(
            error instanceof Error ? error.message : "Unable to build HTML"
          );
        }
      })
      .finally(() => {
        if (active) setHtmlLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    activeTab,
    htmlPreview,
    htmlPreviewSignature,
    report,
    reportSignature,
    state.open,
    state.ready,
  ]);

  if (!report) return null;
  const summary =
    report.summary || "Open the report to review the generated analysis.";
  const fileName = getBusinessReportFileName(report);

  return (
    <Dialog open={state.open} onOpenChange={setOpen}>
      <DialogContent className="h-[86svh] w-[min(980px,calc(100vw-2rem))] max-w-[980px] grid-rows-[auto_1fr_auto] overflow-hidden p-0 sm:max-w-[980px]">
        <div className="border-b px-5 py-4">
          <DialogTitle>{report.title}</DialogTitle>
          <DialogDescription className="mt-1">{summary}</DialogDescription>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(String(value))}
          className="min-h-0 overflow-hidden px-5 py-4"
        >
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="markdown">Markdown</TabsTrigger>
            <TabsTrigger value="html">HTML</TabsTrigger>
          </TabsList>
          <TabsContent
            value="preview"
            className="mt-3 min-h-0 overflow-auto rounded-lg border bg-background p-5"
          >
            <div className="space-y-4">
              {previewParts.map((item, index) =>
                item.type === "markdown" ? (
                  <div key={index} className="ai-markdown">
                    <MarkdownMessage>{item.content}</MarkdownMessage>
                  </div>
                ) : (
                  <div key={index} className="rounded-lg border p-3">
                    <ChartPreview options={item.options} />
                  </div>
                )
              )}
            </div>
          </TabsContent>
          <TabsContent
            value="markdown"
            className="mt-3 min-h-0 overflow-auto rounded-lg bg-muted p-4"
          >
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5">
              {reportMarkdown}
            </pre>
          </TabsContent>
          <TabsContent
            value="html"
            className="mt-3 min-h-0 overflow-hidden rounded-lg border bg-background"
          >
            {htmlPreview ? (
              <iframe
                title={`${report.title} HTML preview`}
                srcDoc={htmlPreview}
                className="size-full min-h-[480px] border-0 bg-white"
              />
            ) : (
              <div className="flex h-full min-h-[480px] items-center justify-center gap-2 text-sm text-muted-foreground">
                {htmlLoading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : null}
                {htmlLoading ? "Preparing HTML preview…" : "HTML is unavailable"}
              </div>
            )}
          </TabsContent>
        </Tabs>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t px-5 py-3">
          {exportError ? (
            <p className="mr-auto text-xs text-destructive">{exportError}</p>
          ) : null}
          <Button
            variant="outline"
            disabled={!report.markdown}
            onClick={() =>
              downloadBusinessReportFile(
                `${fileName}.md`,
                reportMarkdown,
                "text/markdown;charset=utf-8"
              )
            }
          >
            <Download /> Download Markdown
          </Button>
          <Button
            variant="outline"
            disabled={!report.markdown || exporting !== undefined}
            onClick={async () => {
              setExportError(undefined);
              setExporting("html");
              try {
                const html = await buildBusinessReportHtml(report, {
                  printMode: true,
                });
                downloadBusinessReportFile(
                  `${fileName}.html`,
                  html,
                  "text/html;charset=utf-8"
                );
              } catch (error) {
                setExportError(
                  error instanceof Error
                    ? error.message
                    : "Unable to export HTML"
                );
              } finally {
                setExporting(undefined);
              }
            }}
          >
            {exporting === "html" ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <FileCode2 />
            )}
            Download HTML
          </Button>
          <Button
            disabled={!report.markdown || exporting !== undefined}
            onClick={async () => {
              setExportError(undefined);
              setExporting("pdf");
              try {
                const opened = await printBusinessReport(report);
                if (!opened) {
                  setExportError(
                    "Popup blocked. Allow popups and try printing again."
                  );
                }
              } catch (error) {
                setExportError(
                  error instanceof Error
                    ? error.message
                    : "Unable to print report"
                );
              } finally {
                setExporting(undefined);
              }
            }}
          >
            {exporting === "pdf" ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Printer />
            )}
            Print PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
