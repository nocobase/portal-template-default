import { Suspense } from "react";

import { LoadingState } from "@/components/app-shell/loading-state";

export function AuthDemoRoute({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingState className="min-h-80" />}>
      {children}
    </Suspense>
  );
}
