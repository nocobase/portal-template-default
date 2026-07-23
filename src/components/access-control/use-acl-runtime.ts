import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { loadAcl, useAclSnapshot } from "@/lib/nocobase/acl";

export function useAclRuntime() {
  const snapshot = useAclSnapshot();
  const queryClient = useQueryClient();
  const lastReadyVersion = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (snapshot.status === "idle") {
      void loadAcl().catch(() => undefined);
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
}
