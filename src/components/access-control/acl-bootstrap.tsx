import { Loader2, RotateCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, type PropsWithChildren } from "react";

import { Button } from "@/components/ui/button";
import {
  loadNocoBaseAcl,
  useNocoBaseAclSnapshot,
} from "@/lib/nocobase/acl";

export function NocoBaseAclBootstrap({ children }: PropsWithChildren) {
  const snapshot = useNocoBaseAclSnapshot();
  const queryClient = useQueryClient();
  const lastReadyVersion = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (snapshot.status === "idle") {
      void loadNocoBaseAcl().catch(() => undefined);
    }
  }, [snapshot.status]);

  useEffect(() => {
    if (snapshot.status !== "ready") return;
    if (lastReadyVersion.current === undefined) {
      lastReadyVersion.current = snapshot.version;
      return;
    }
    if (lastReadyVersion.current === snapshot.version) return;

    lastReadyVersion.current = snapshot.version;
    void queryClient.invalidateQueries({ queryKey: ["access"] });
  }, [queryClient, snapshot.status, snapshot.version]);

  if (snapshot.status === "ready") return children;

  if (snapshot.status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Unable to load permissions</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {snapshot.error?.message ??
              "The current role permissions could not be loaded."}
          </p>
          <Button
            className="mt-5"
            variant="outline"
            onClick={() =>
              void loadNocoBaseAcl({ force: true }).catch(() => undefined)
            }
          >
            <RotateCcw />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="size-7 animate-spin text-muted-foreground" />
      <span className="sr-only">Loading permissions…</span>
    </div>
  );
}
