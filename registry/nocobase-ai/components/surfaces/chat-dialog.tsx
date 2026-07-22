import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PropsWithChildren } from "react";

export function ChatDialog({
  open,
  onOpenChange,
  children,
}: PropsWithChildren<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="h-[95svh] w-[95vw] max-w-[95vw] gap-0 overflow-hidden rounded-xl p-0 sm:max-w-[95vw]"
      >
        <DialogTitle className="sr-only">NocoBase AI employee</DialogTitle>
        <DialogDescription className="sr-only">
          Expanded AI conversation window.
        </DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
