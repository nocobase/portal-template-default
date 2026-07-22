import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PanelLeftClose, PanelRightClose } from "lucide-react";
import { useEffect, type CSSProperties, type PropsWithChildren } from "react";

export type ChatSidePanelProps = PropsWithChildren<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "left" | "right";
  width?: number | string;
  closeOnEscape?: boolean;
  showCloseHandle?: boolean;
}>;

export function ChatSidePanel({
  open,
  onOpenChange,
  side = "right",
  width = 450,
  closeOnEscape = true,
  showCloseHandle = true,
  children,
}: ChatSidePanelProps) {
  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const openDialog = document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
      );
      if (openDialog) return;
      onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeOnEscape, onOpenChange, open]);

  if (!open) return null;

  const panelWidth = typeof width === "number" ? `${width}px` : width;

  return (
    <aside
      role="complementary"
      aria-label="NocoBase AI employee"
      data-side={side}
      className={cn(
        "fixed inset-y-0 z-50 max-w-full overscroll-contain bg-background shadow-2xl animate-in duration-200",
        side === "right"
          ? "right-0 border-l slide-in-from-right"
          : "left-0 border-r slide-in-from-left"
      )}
      style={{ width: panelWidth } as CSSProperties}
    >
      {showCloseHandle ? (
        <Button
          variant="outline"
          size="icon-sm"
          className={cn(
            "absolute top-1/2 z-40 size-9 -translate-y-1/2 rounded-full bg-background shadow-md before:absolute before:-inset-2",
            side === "right"
              ? "left-0 -translate-x-1/2"
              : "right-0 translate-x-1/2"
          )}
          aria-label="Close side panel"
          onClick={() => onOpenChange(false)}
        >
          {side === "right" ? <PanelRightClose /> : <PanelLeftClose />}
        </Button>
      ) : null}
      {children}
    </aside>
  );
}
