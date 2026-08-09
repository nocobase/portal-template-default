import { lazy, Suspense } from "react";
import { Download, FileSpreadsheet, ListFilter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ExportRecordsButton } from "./export-records-button";
import { getExportProDemoSectionLoader } from "./demo-contributions";
import { useExportTranslation } from "./i18n";

const exportColumns = [
  { dataIndex: ["nickname"], defaultTitle: "Nickname" },
  { dataIndex: ["username"], defaultTitle: "Username" },
  { dataIndex: ["email"], defaultTitle: "Email" },
  { dataIndex: ["roles", "title"], defaultTitle: "Roles" },
];

const exportProDemoSectionLoader = getExportProDemoSectionLoader();
const ExportProDemoSection = exportProDemoSectionLoader
  ? lazy(exportProDemoSectionLoader)
  : undefined;

export default function ExportDemoPage() {
  const t = useExportTranslation();

  return (
    <div className="space-y-6 pb-12">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            <FileSpreadsheet /> Base export
          </Badge>
          {ExportProDemoSection ? <Badge>Pro enabled</Badge> : null}
          <Badge variant="outline">main / users</Badge>
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {t("demo.title", "Export workflows")}
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          {t(
            "demo.description",
            "Export selected or filtered users, with advanced processing and attachment packaging when Export Pro is installed."
          )}
        </p>
      </header>

      <Card className="min-h-[28rem]">
        <CardHeader className="border-b">
          <CardTitle>Prepare an export</CardTitle>
          <CardDescription>
            Review the configured columns, then open the export dialog to choose the final field set.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ListFilter className="size-4" /> Exportable columns
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {exportColumns.map((column) => (
                <div
                  key={column.dataIndex.join(".")}
                  className="rounded-xl border bg-muted/20 p-4"
                >
                  <p className="font-medium">{column.defaultTitle}</p>
                  <code className="mt-1 block text-xs text-muted-foreground">
                    {column.dataIndex.join(" → ")}
                  </code>
                </div>
              ))}
            </div>
          </section>
          <aside className="flex flex-col justify-between gap-6 rounded-xl border bg-muted/30 p-5">
            <div className="space-y-2">
              <Download className="size-6 text-primary" />
              <h2 className="font-semibold">Download from the server</h2>
              <p className="text-sm text-muted-foreground">
                The connected NocoBase application applies ACL, queries the records, and generates the workbook.
              </p>
            </div>
            <ExportRecordsButton
              collectionName="users"
              title="users"
              columns={exportColumns}
            />
          </aside>
        </CardContent>
      </Card>

      {ExportProDemoSection ? (
        <Suspense
          fallback={
            <div className="rounded-xl border p-6 text-sm text-muted-foreground">
              Loading Export Pro workflows...
            </div>
          }
        >
          <ExportProDemoSection />
        </Suspense>
      ) : null}

      <p className="text-sm text-muted-foreground">
        {t(
          "demo.requirement",
          "Requires @nocobase/plugin-action-export on the connected server."
        )}
      </p>
    </div>
  );
}
