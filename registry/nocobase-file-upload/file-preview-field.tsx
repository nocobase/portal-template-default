import { useMemo, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { FilePreviewDialog } from "./file-preview-dialog";
import { defaultFilePreviewMessages } from "./file-preview-messages";
import { getFileName } from "./file-url";
import { FileThumbnail } from "./file-thumbnail";
import { normalizeFileFieldValue } from "./form-value";
import type { FilePreviewFieldProps } from "./file-preview-types";

export function FilePreviewField({
  value,
  descriptor,
  size = 80,
  showFileName,
  className,
  messages: messageOverrides,
}: FilePreviewFieldProps) {
  const [open, setOpen] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);
  const messages = useMemo(
    () => ({ ...defaultFilePreviewMessages, ...messageOverrides }),
    [messageOverrides]
  );
  const files = normalizeFileFieldValue(value);

  if (!files.length) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        {messages.noFiles}
      </p>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("flex flex-wrap gap-3", className)}>
      {files.map((file, index) => {
        const filename = getFileName(file);

        return (
          <button
            key={String(file.id)}
            type="button"
            className="group min-w-0 text-left"
            style={{ width: size }}
            title={filename}
            onClick={() => {
              setInitialIndex(index);
              setOpen(true);
            }}
          >
            <span
              className="flex items-center justify-center overflow-hidden rounded-lg border bg-card text-muted-foreground transition-colors group-hover:border-primary"
              style={{ width: size, height: size }}
            >
              <FileThumbnail file={file} alt={messages.imageAlt(filename)} />
            </span>
            {showFileName ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className="mt-1 block truncate text-center text-xs text-muted-foreground"
                      style={{ width: size }}
                    />
                  }
                >
                  {filename}
                </TooltipTrigger>
                <TooltipContent>{filename}</TooltipContent>
              </Tooltip>
            ) : null}
          </button>
        );
      })}

      <FilePreviewDialog
        open={open}
        onOpenChange={setOpen}
        files={files}
        initialIndex={initialIndex}
        descriptor={descriptor}
        messages={messages}
      />
      </div>
    </TooltipProvider>
  );
}
