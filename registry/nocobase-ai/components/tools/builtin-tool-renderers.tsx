import { AIEmployeeAvatar } from "../chat/ai-employee-avatar";
import { MarkdownMessage } from "../chat/markdown-message";
import type {
  AIToolRendererMap,
  AIToolRendererProps,
} from "./tool-renderer-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  FileCode2,
  FileText,
  GitBranch,
  LoaderCircle,
  Printer,
} from "lucide-react";
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAI } from "../../providers";
import { getNocoBaseToolCallMetadata } from "../chat/tool-call-card";
import {
  buildBusinessReportHtml,
  buildBusinessReportMarkdown,
  downloadBusinessReportFile,
  getBusinessReportFileName,
  normalizeBusinessReportCharts,
  printBusinessReport,
  splitBusinessReportMarkdown,
  type BusinessReportData,
} from "./business-report-utils";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown) => (typeof value === "string" ? value : "");

const parseArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const EChartsPreview = lazy(() => import("./echarts-preview"));

function SuggestionsRenderer({ part, disabled, onEdit }: AIToolRendererProps) {
  const input = asRecord(part.input);
  const metadata = getNocoBaseToolCallMetadata(part);
  const options = parseArray(input.options).filter(
    (option): option is string => typeof option === "string"
  );
  const [selected, setSelected] = useState<string>();
  const persistedSelection = metadata?.selectedSuggestion;
  const hasSelected =
    selected !== undefined || persistedSelection !== undefined;
  const canSelect =
    metadata?.invokeStatus === undefined ||
    metadata.invokeStatus === "interrupted";

  if (!options.length) {
    return (
      <p className="text-xs text-muted-foreground">Generating suggestions…</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button
          key={option}
          variant="outline"
          size="sm"
          className={cn(
            "h-auto min-h-8 whitespace-normal text-left",
            (selected === option || persistedSelection === option) &&
              "border-2 border-dashed bg-muted"
          )}
          disabled={disabled || hasSelected || !canSelect}
          onClick={() => {
            setSelected(option);
            void Promise.resolve(onEdit({ ...input, option })).catch(() => {
              setSelected((current) =>
                current === option ? undefined : current
              );
            });
          }}
        >
          {option}
        </Button>
      ))}
    </div>
  );
}

function BusinessReportRenderer({ part }: AIToolRendererProps) {
  const report = asRecord(part.input);
  const title = asString(report.title) || "Business analysis report";
  const reportSummary = asString(report.summary);
  const summary =
    reportSummary || "Open the report to review the generated analysis.";
  const markdown = asString(report.markdown);
  const charts = useMemo(
    () => normalizeBusinessReportCharts(report.charts),
    [report.charts]
  );
  const metadata = getNocoBaseToolCallMetadata(part);
  const ready =
    part.state === "output-available" ||
    (metadata?.status === "success" &&
      ["done", "confirmed"].includes(metadata.invokeStatus ?? ""));
  const generating = !ready && part.state !== "output-error";
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const wasGenerating = useRef(false);
  const reportData = useMemo<BusinessReportData>(
    () => ({
      title,
      summary: reportSummary || undefined,
      markdown,
      charts,
      fileName: asString(report.fileName) || undefined,
    }),
    [charts, markdown, report.fileName, reportSummary, title]
  );
  const reportSignature = useMemo(
    () => (ready ? JSON.stringify(reportData) : ""),
    [ready, reportData]
  );
  const reportMarkdown = useMemo(
    () => (open && ready ? buildBusinessReportMarkdown(reportData) : ""),
    [open, ready, reportData]
  );
  const previewParts = useMemo(
    () =>
      activeTab === "preview" && reportMarkdown
        ? splitBusinessReportMarkdown(reportMarkdown)
        : [],
    [activeTab, reportMarkdown]
  );
  const [htmlPreview, setHtmlPreview] = useState("");
  const [htmlPreviewSignature, setHtmlPreviewSignature] = useState("");
  const [htmlLoading, setHtmlLoading] = useState(false);
  const [exporting, setExporting] = useState<"html" | "pdf">();
  const [exportError, setExportError] = useState<string>();

  useEffect(() => {
    if (generating) {
      wasGenerating.current = true;
      return;
    }
    if (wasGenerating.current && ready) {
      wasGenerating.current = false;
      setOpen(true);
    }
  }, [generating, ready]);

  useEffect(() => {
    if (
      !open ||
      activeTab !== "html" ||
      !ready ||
      !markdown ||
      (htmlPreview && htmlPreviewSignature === reportSignature)
    ) {
      return;
    }
    let active = true;
    setHtmlLoading(true);
    setHtmlPreview("");
    void buildBusinessReportHtml(reportData)
      .then((html) => {
        if (active) {
          setHtmlPreview(html);
          setHtmlPreviewSignature(reportSignature);
        }
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
    markdown,
    open,
    ready,
    reportData,
    reportSignature,
  ]);

  const fileName = getBusinessReportFileName(reportData);

  return (
    <>
      <button
        type="button"
        className={cn(
          "w-full rounded-lg border bg-background p-3 text-left transition-colors",
          ready && "hover:bg-muted/40"
        )}
        disabled={!ready}
        onClick={() => setOpen(true)}
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="h-[86svh] w-[min(980px,calc(100vw-2rem))] max-w-[980px] grid-rows-[auto_1fr_auto] overflow-hidden p-0 sm:max-w-[980px]">
          <div className="border-b px-5 py-4">
            <DialogTitle>{title}</DialogTitle>
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
                  title={`${title} HTML preview`}
                  srcDoc={htmlPreview}
                  className="size-full min-h-[480px] border-0 bg-white"
                />
              ) : (
                <div className="flex h-full min-h-[480px] items-center justify-center gap-2 text-sm text-muted-foreground">
                  {htmlLoading ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : null}
                  {htmlLoading
                    ? "Preparing HTML preview…"
                    : "HTML is unavailable"}
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
              disabled={!markdown}
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
              disabled={!markdown || exporting !== undefined}
              onClick={async () => {
                setExportError(undefined);
                setExporting("html");
                try {
                  const html = await buildBusinessReportHtml(reportData, {
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
              disabled={!markdown || exporting !== undefined}
              onClick={async () => {
                setExportError(undefined);
                setExporting("pdf");
                try {
                  const opened = await printBusinessReport(reportData);
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
    </>
  );
}

class ChartErrorBoundary extends Component<
  {
    children: ReactNode;
    fallback: (error: Error) => ReactNode;
    resetKey: unknown;
  },
  { error: Error | null; resetKey: unknown }
> {
  state = { error: null, resetKey: this.props.resetKey } as {
    error: Error | null;
    resetKey: unknown;
  };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  static getDerivedStateFromProps(
    props: { resetKey: unknown },
    state: { error: Error | null; resetKey: unknown }
  ) {
    return props.resetKey !== state.resetKey
      ? { error: null, resetKey: props.resetKey }
      : null;
  }

  render() {
    return this.state.error
      ? this.props.fallback(this.state.error)
      : this.props.children;
  }
}

function ChartError({ error }: { error: Error }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
      <div className="font-medium">Invalid chart options</div>
      <div className="mt-1 flex items-start justify-between gap-3">
        <span className="break-all leading-5">{error.message}</span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Copy chart error"
          onClick={async () => {
            await navigator.clipboard.writeText(error.message);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? <CheckCircle2 /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}

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

function ChartRenderer({ part }: AIToolRendererProps) {
  const input = asRecord(part.input);
  const options = asRecord(input.options);

  if (!Object.keys(options).length) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" /> Generating chart…
      </div>
    );
  }

  return (
    <ChartErrorBoundary
      resetKey={part.input}
      fallback={(error) => <ChartError error={error} />}
    >
      <div className="rounded-lg border bg-background p-3">
        <ChartPreview options={options} />
      </div>
    </ChartErrorBoundary>
  );
}

function SubAgentRenderer({ part }: AIToolRendererProps) {
  const { employees } = useAI();
  const input = asRecord(part.input);
  const username = asString(input.username);
  const employee = employees.find((item) => item.username === username);
  const fallbackName = username
    ? `${username.charAt(0).toUpperCase()}${username.slice(1)}`
    : "AI employee";
  const [expanded, setExpanded] = useState(false);
  const question = asString(input.question);
  const metadata = getNocoBaseToolCallMetadata(part);
  const generating =
    part.state !== "output-available" &&
    part.state !== "output-error" &&
    !["done", "confirmed"].includes(metadata?.invokeStatus ?? "");

  return (
    <button
      type="button"
      className="w-full rounded-lg bg-muted/50 p-2.5 text-left"
      onClick={() => question && setExpanded((value) => !value)}
    >
      <div className="flex items-center gap-2.5">
        {employee ? (
          <AIEmployeeAvatar employee={employee} className="size-8" />
        ) : (
          <span className="flex size-8 items-center justify-center rounded-full border bg-background">
            <Bot className="size-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">
            @{employee?.nickname || fallbackName}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {employee?.position || "Working on a delegated task"}
          </div>
        </div>
        {question ? (
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        ) : null}
        {generating ? (
          <LoaderCircle className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : null}
      </div>
      {expanded ? (
        <p className="mt-2 border-t pt-2 text-xs leading-5 text-muted-foreground">
          {question}
        </p>
      ) : null}
    </button>
  );
}

function WorkflowRenderer({
  part,
  disabled,
  onApprove,
  onReject,
  onRevise,
}: AIToolRendererProps) {
  const input = asRecord(part.input);
  const metadata = getNocoBaseToolCallMetadata(part);
  const result = asRecord(input.result);
  const entries = Object.entries(result);
  const [action, setAction] = useState<"approve" | "reject" | "revise">();
  const [decided, setDecided] = useState(false);
  const canDecide =
    metadata?.invokeStatus === undefined ||
    metadata.invokeStatus === "interrupted";
  const actionDisabled =
    disabled || action !== undefined || decided || !canDecide;

  const runAction = async (
    nextAction: "approve" | "reject",
    callback: () => void | Promise<void>
  ) => {
    setAction(nextAction);
    try {
      await callback();
      setDecided(true);
    } finally {
      setAction(undefined);
    }
  };

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <GitBranch className="size-4" />
        {asString(input.workflowTitle) || "Workflow task"}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-md bg-muted/40 px-2.5 py-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {key}
            </div>
            <div className="mt-0.5 overflow-x-auto text-xs font-medium">
              {typeof value === "string" ||
              typeof value === "number" ||
              typeof value === "boolean" ? (
                <MarkdownMessage>{String(value)}</MarkdownMessage>
              ) : (
                <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-5">
                  {JSON.stringify(value, null, 2)}
                </pre>
              )}
            </div>
          </div>
        ))}
      </div>
      {!entries.length ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5" /> Ready for review
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap justify-end gap-2 border-t pt-3">
        <Button
          variant="ghost"
          size="sm"
          disabled={actionDisabled}
          onClick={() =>
            void runAction("reject", () =>
              onReject(
                "The user rejected this workflow node. Stop. Do not continue, do not reply about the task result, and do not call this tool again. Only state that you understand."
              )
            )
          }
        >
          {action === "reject" ? "Rejecting…" : "Reject"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={actionDisabled}
          onClick={() => {
            setAction("revise");
            onRevise();
            setAction(undefined);
          }}
        >
          Revise
        </Button>
        <Button
          size="sm"
          disabled={actionDisabled}
          onClick={() => void runAction("approve", onApprove)}
        >
          {action === "approve" ? "Approving…" : "Approve"}
        </Button>
      </div>
    </div>
  );
}

export const builtInToolRenderers: AIToolRendererMap = {
  suggestions: {
    component: SuggestionsRenderer,
    handlesApproval: true,
    standalone: true,
  },
  businessReportGenerator: {
    component: BusinessReportRenderer,
    standalone: true,
  },
  chartGenerator: {
    component: ChartRenderer,
    standalone: true,
  },
  "dispatch-sub-agent-task": {
    component: SubAgentRenderer,
    standalone: true,
  },
  aiEmployeeWorkflowTaskOutput: {
    component: WorkflowRenderer,
    handlesApproval: true,
    standalone: true,
  },
};
