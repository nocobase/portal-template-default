import type { PropsWithChildren } from "react";

import { AclGate } from "./acl-gate";
import { useAclRuntime } from "./use-acl-runtime";

export function AclBootstrap({ children }: PropsWithChildren) {
  useAclRuntime();
  return <AclGate>{children}</AclGate>;
}
