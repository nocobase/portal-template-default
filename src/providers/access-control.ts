import type { AccessControlProvider } from "@refinedev/core";

import {
  canAccessWithSnapshot,
  getAclSnapshot,
  loadAcl,
} from "@/lib/nocobase/acl";

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action, params }) => {
    const snapshot = await loadAcl();
    const can = canAccessWithSnapshot(snapshot, { resource, action, params });

    return {
      can,
      reason: can
        ? undefined
        : "You don't have permission to perform this action.",
    };
  },
  options: {
    buttons: {
      enableAccessControl: true,
      hideIfUnauthorized: true,
    },
    queryOptions: {
      staleTime: 30_000,
    },
  },
};

export const canAccessCurrentAcl = (
  params: Parameters<typeof canAccessWithSnapshot>[1]
) => canAccessWithSnapshot(getAclSnapshot(), params);
