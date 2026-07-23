import { Suspense, type ReactNode } from "react";

export function LazyAclRoute({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-80 items-center justify-center text-sm text-muted-foreground">
          Loading access control demo…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
