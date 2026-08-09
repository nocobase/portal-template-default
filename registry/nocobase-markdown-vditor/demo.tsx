import { FilePenLine } from "lucide-react";
import { useState } from "react";

import { nocobaseClient } from "@nocobase/portal-sdk/client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uploadMultipart } from "@/extensions/nocobase-file-upload";

import { MarkdownDisplay } from "./markdown-display";
import { MarkdownVditor } from "./markdown-vditor";
import type { VditorStorageInfo } from "./types";

const initial = `# Product notes

- Rich Markdown editing
- Tables, tasks, code, and math

| Area | Status |
| --- | --- |
| Portal editor | ✅ |`;

async function uploadMarkdownFile(file: File, storage: VditorStorageInfo) {
  const record = await uploadMultipart({
    file,
    descriptor: {
      sourceCollection: "attachments",
      fieldName: "file",
      fileCollection: "attachments",
      relation: "belongsTo",
    },
    storage: {
      id: storage.id,
      name: storage.name || "vditor",
      type: storage.type || "local",
    },
  });
  if (!record.url) {
    throw new Error("The uploaded file record did not include a URL.");
  }
  return {
    filename: record.title || record.filename,
    url: nocobaseClient.resolveUrl(record.url),
  };
}

export default function MarkdownVditorDemoPage() {
  const [value, setValue] = useState(initial);

  return (
    <div className="space-y-6 pb-12">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary"><FilePenLine /> Vditor</Badge>
          <Badge variant="outline">Controlled field</Badge>
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Markdown editing workspace
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Switch editing modes from the toolbar, use fullscreen and preview, and keep a controlled Markdown value.
        </p>
      </header>

      <Card className="min-h-[42rem]">
        <CardHeader className="border-b">
          <CardTitle>Product notes</CardTitle>
          <CardDescription>
            Edit the source and switch to read-only rendering without leaving the page.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="edit">
            <TabsList>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="read">Read-only</TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="pt-4">
              <MarkdownVditor
                value={value}
                onChange={setValue}
                minHeight={480}
                uploadFile={uploadMarkdownFile}
              />
            </TabsContent>
            <TabsContent value="read" className="min-h-[30rem] rounded-xl border p-6">
              <MarkdownDisplay value={value} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
