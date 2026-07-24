import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function LoadingState({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn("flex items-center justify-center", className)}
    >
      <Loader2 className="size-7 animate-spin text-primary" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
