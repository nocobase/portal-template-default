import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { getFileName, triggerFileDownload } from "./file-url";
import { getPreviewType } from "./file-preview-types";
import type {
  FileFieldDescriptor,
  FilePreviewMessages,
  NocoBaseFileRecord,
} from "./types";

export type FilePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: NocoBaseFileRecord[];
  initialIndex?: number;
  descriptor?: FileFieldDescriptor;
  messages: FilePreviewMessages;
};

export function FilePreviewDialog({
  open,
  onOpenChange,
  files,
  initialIndex = 0,
  descriptor,
  messages,
}: FilePreviewDialogProps) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) setIndex(initialIndex);
  }, [initialIndex, open]);

  const file = files[index] ?? files[0];
  const previewType = useMemo(() => (file ? getPreviewType(file) : null), [file]);

  if (!file || !previewType) return null;

  const Previewer = previewType.Previewer;
  const canGoPrevious = files.length > 1 && index > 0;
  const canGoNext = files.length > 1 && index < files.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <div
          role="presentation"
          className="fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              event.preventDefault();
              onOpenChange(false);
            }
          }}
          onTouchStart={(event) => {
            if (event.target === event.currentTarget) onOpenChange(false);
          }}
        />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-popover text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            "max-h-[calc(100vh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-5xl"
          )}
        >
          <DialogHeader className="border-b px-4 py-3">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="truncate">
                  {getFileName(file)}
                </DialogTitle>
                <DialogDescription>
                  {files.length > 1
                    ? `${index + 1} / ${files.length}`
                    : messages.preview}
                </DialogDescription>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {files.length > 1 ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={messages.previous}
                      title={messages.previous}
                      disabled={!canGoPrevious}
                      onClick={() =>
                        setIndex((current) => Math.max(0, current - 1))
                      }
                    >
                      <ChevronLeft />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={messages.next}
                      title={messages.next}
                      disabled={!canGoNext}
                      onClick={() =>
                        setIndex((current) =>
                          Math.min(files.length - 1, current + 1)
                        )
                      }
                    >
                      <ChevronRight />
                    </Button>
                  </>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={messages.download}
                  title={messages.download}
                  onClick={() => triggerFileDownload(file)}
                >
                  <Download />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={messages.close}
                  title={messages.close}
                  onClick={() => onOpenChange(false)}
                >
                  <X />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="h-[min(70vh,720px)] overflow-hidden">
            <Previewer
              file={file}
              index={index}
              list={files}
              descriptor={descriptor}
              messages={messages}
              onDownload={triggerFileDownload}
            />
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
