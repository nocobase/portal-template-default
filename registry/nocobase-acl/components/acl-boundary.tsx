import type { BaseKey } from "@refinedev/core";
import type { PropsWithChildren, ReactNode } from "react";

import { AccessDenied } from "@/components/access-control/access-denied";
import {
  canAccessWithSnapshot,
  useNocoBaseAclSnapshot,
} from "@/lib/nocobase/acl";

export type AclPermission = {
  resource: string;
  action: string;
  id?: BaseKey;
  field?: string;
  dataSourceKey?: string;
};

const canAccess = (
  snapshot: ReturnType<typeof useNocoBaseAclSnapshot>,
  permission: AclPermission
) =>
  canAccessWithSnapshot(snapshot, {
    resource: permission.resource,
    action: permission.action,
    params: {
      id: permission.id,
      field: permission.field,
      dataSourceKey: permission.dataSourceKey,
    },
  });

export function AclPage({
  children,
  anyOf,
  allOf,
  fallback = <AccessDenied />,
}: PropsWithChildren<{
  anyOf?: AclPermission[];
  allOf?: AclPermission[];
  fallback?: ReactNode;
}>) {
  const snapshot = useNocoBaseAclSnapshot();
  const anyAllowed = !anyOf?.length || anyOf.some((item) => canAccess(snapshot, item));
  const allAllowed = !allOf?.length || allOf.every((item) => canAccess(snapshot, item));

  return anyAllowed && allAllowed ? children : fallback;
}

export function AclRegion({
  children,
  resource,
  action,
  id,
  dataSourceKey,
  fallback = "hidden",
}: PropsWithChildren<AclPermission & {
  fallback?: "hidden" | "forbidden" | ReactNode;
}>) {
  const snapshot = useNocoBaseAclSnapshot();
  const allowed = canAccess(snapshot, {
    resource,
    action,
    id,
    dataSourceKey,
  });

  if (allowed) return children;
  if (fallback === "hidden") return null;
  if (fallback === "forbidden") {
    return <AccessDenied className="min-h-40" />;
  }
  return fallback;
}

export function AclField({
  children,
  resource,
  action,
  field,
  dataSourceKey,
  fallback = null,
}: PropsWithChildren<{
  resource: string;
  action: string;
  field: string;
  dataSourceKey?: string;
  fallback?: ReactNode;
}>) {
  const snapshot = useNocoBaseAclSnapshot();
  return canAccess(snapshot, {
    resource,
    action,
    field,
    dataSourceKey,
  })
    ? children
    : fallback;
}
