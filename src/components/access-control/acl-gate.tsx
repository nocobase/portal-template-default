import { RotateCcw } from "lucide-react";
import type { PropsWithChildren } from "react";

import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/app-shell/loading-state";
import { useAclState, useAclStore } from "@/lib/nocobase/acl";

export function AclGate({ children }: PropsWithChildren) {
  const store = useAclStore();
  const state = useAclState();

  if (state.status === "ready") return children;

  if (state.status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Unable to load permissions</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {state.error.message ??
              "The current role permissions could not be loaded."}
          </p>
          <Button
            className="mt-5"
            variant="outline"
            onClick={() => store.retry()}
          >
            <RotateCcw />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return <LoadingState className="min-h-screen bg-background" />;
}
