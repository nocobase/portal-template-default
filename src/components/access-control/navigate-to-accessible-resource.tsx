import { useMenu } from "@refinedev/core";
import { Navigate } from "react-router";

import {
  filterMenuItemsByAcl,
  findFirstAccessibleRoute,
  useNocoBaseAclSnapshot,
} from "@/lib/nocobase/acl";
import { AccessDenied } from "./access-denied";

export function NavigateToAccessibleResource() {
  const { menuItems } = useMenu();
  const acl = useNocoBaseAclSnapshot();
  const route = findFirstAccessibleRoute(filterMenuItemsByAcl(menuItems, acl));

  return route ? <Navigate to={route} replace /> : <AccessDenied />;
}
