import { Download, FileWarning } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { getPreviewFileUrl } from "../file-url";
import type { FilePreviewerProps } from "../file-preview-types";

const MAX_IFRAME_PDF_SIZE = 50 * 1024 * 1024;

export function PdfPreviewer({
  file,
  messages,
  onDownload,
}: FilePreviewerProps) {
  const [failed, setFailed] = useState(false);
  const tooLarge = file.size !== undefined && file.size > MAX_IFRAME_PDF_SIZE;

  if (failed || tooLarge) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center p-6">
        <Alert className="max-w-md">
          <FileWarning className="size-4" />
          <AlertDescription className="space-y-4">
            <div>
              <p className="font-medium text-foreground">
                {messages.unsupportedTitle}
              </p>
              <p className="mt-1 text-muted-foreground">
                {messages.unsupportedDescription}
              </p>
            </div>
            <Button type="button" onClick={() => onDownload(file)}>
              <Download />
              {messages.download}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <iframe
      src={getPreviewFileUrl(file)}
      title={messages.pdfTitle}
      className="h-full min-h-[520px] w-full bg-background"
      onError={() => setFailed(true)}
    />
  );
}
