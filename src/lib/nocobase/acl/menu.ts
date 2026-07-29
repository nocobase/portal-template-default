import type { TreeMenuItem } from "@refinedev/core";

import { evaluateAccess } from "./evaluator";
import type { AclPermissionSet } from "./types";

export const filterMenuItemsByAcl = (
  items: TreeMenuItem[],
  permissions: AclPermissionSet
): TreeMenuItem[] =>
  items.flatMap((item) => {
    const children = filterMenuItemsByAcl(item.children ?? [], permissions);
    const isContainer = Boolean(item.meta?.group || item.children?.length);
    const canAccessItem = item.route
      ? evaluateAccess(permissions, {
          resource: item.name,
          action: "list",
          resourceItem: item,
        })
      : true;

    if (isContainer && !children.length && !item.route) return [];
    if (!canAccessItem && !children.length) return [];
    return [
      {
        ...item,
        route: canAccessItem ? item.route : undefined,
        children,
      },
    ];
  });

export const findFirstAccessibleRoute = (
  items: TreeMenuItem[]
): string | undefined => {
  for (const item of items) {
    if (item.route) return item.route;
    const childRoute = findFirstAccessibleRoute(item.children ?? []);
    if (childRoute) return childRoute;
  }
  return undefined;
};
