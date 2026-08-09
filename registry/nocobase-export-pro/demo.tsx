import { Archive, FileSpreadsheet } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ExportAttachmentsButton } from "./export-attachments-button";
import { ExportProRecordsButton } from "./export-pro-records-button";

export default function ExportProDemoPage() {
  return (
    <div className="pb-12">
      <ExportProDemoSection />
    </div>
  );
}

export function ExportProDemoSection() {
  const [attachmentCollection, setAttachmentCollection] = useState("");
  const [attachmentField, setAttachmentField] = useState("");
  const attachmentReady =
    Boolean(attachmentCollection.trim()) && Boolean(attachmentField.trim());

  return (
    <section className="space-y-4" aria-labelledby="export-pro-heading">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge><Archive /> Pro export</Badge>
          <Badge variant="outline">sync · async · auto</Badge>
        </div>
        <h2 id="export-pro-heading" className="font-heading text-2xl font-semibold tracking-tight">
          Advanced export workflows
        </h2>
        <p className="max-w-3xl text-muted-foreground">
          Choose immediate or background processing, export workbook data, and package attachment fields as ZIP.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-h-[26rem]">
          <CardHeader className="border-b">
            <FileSpreadsheet className="size-7 text-primary" />
            <CardTitle>Workbook export</CardTitle>
            <CardDescription>
              Automatic mode chooses between direct download and a background task based on server thresholds.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex h-full flex-col justify-between gap-8 p-6">
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              {[
                ["Auto", "Server decides"],
                ["Sync", "Download now"],
                ["Async", "Background task"],
              ].map(([title, description]) => (
                <div key={title} className="rounded-xl border bg-muted/20 p-4">
                  <p className="font-medium">{title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
            <ExportProRecordsButton
              collectionName="users"
              title="users"
              mode="auto"
              columns={[
                { dataIndex: ["nickname"], defaultTitle: "Nickname" },
                { dataIndex: ["email"], defaultTitle: "Email" },
              ]}
            />
          </CardContent>
        </Card>

        <Card className="min-h-[26rem]">
          <CardHeader className="border-b">
            <Archive className="size-7 text-primary" />
            <CardTitle>Attachment package</CardTitle>
            <CardDescription>
              Select file fields, choose processing mode, and optionally create one folder per record.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex h-full flex-col justify-between gap-8 p-6">
            <div className="grid gap-4 rounded-xl border bg-muted/20 p-5">
              <p className="font-medium">Business attachment field</p>
              <p className="text-xs text-muted-foreground">
                Export Pro operates on attachment-interface fields belonging to
                a business collection, not directly on the system attachments
                collection.
              </p>
              <div className="grid gap-2">
                <Label htmlFor="attachment-collection">Collection name</Label>
                <Input
                  id="attachment-collection"
                  value={attachmentCollection}
                  onChange={(event) =>
                    setAttachmentCollection(event.target.value)
                  }
                  placeholder="e.g. documents"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="attachment-field">Attachment field</Label>
                <Input
                  id="attachment-field"
                  value={attachmentField}
                  onChange={(event) => setAttachmentField(event.target.value)}
                  placeholder="e.g. files"
                />
              </div>
            </div>
            {attachmentReady ? (
              <ExportAttachmentsButton
                collectionName={attachmentCollection.trim()}
                title={attachmentCollection.trim()}
                fields={[attachmentField.trim()]}
                availableFields={[
                  {
                    name: attachmentField.trim(),
                    title: attachmentField.trim(),
                  },
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Enter an existing business collection and one of its attachment
                fields to enable the ZIP export action.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
