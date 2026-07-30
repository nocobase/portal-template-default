import type { PropsWithChildren, ReactNode } from "react";

import { AccessDenied } from "@/components/access-control/access-denied";
import { CanAccess } from "@/components/access-control/can-access";
import type { RouteAccessConstraint } from "@/lib/nocobase/acl";

export function RouteAccessGuard({
  access,
  children,
  fallback = <AccessDenied />,
}: PropsWithChildren<{
  access?: RouteAccessConstraint;
  fallback?: ReactNode;
}>) {
  if (!access) return children;

  return (
    <CanAccess roles={access.roles} fallback={fallback}>
      {children}
    </CanAccess>
  );
}
