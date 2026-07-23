import { CanAccess } from "@refinedev/core";
import type { PropsWithChildren, ReactNode } from "react";

import { AccessDenied } from "./access-denied";

export function ResourceAccessGuard({
  resource,
  action,
  children,
  fallback = <AccessDenied />,
}: PropsWithChildren<{
  resource: string;
  action: string;
  fallback?: ReactNode;
}>) {
  return (
    <CanAccess resource={resource} action={action} fallback={fallback}>
      {children}
    </CanAccess>
  );
}
