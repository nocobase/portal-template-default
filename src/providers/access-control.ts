import type { AccessControlProvider } from "@refinedev/core";

import {
  canAccessWithSnapshot,
  getNocoBaseAclSnapshot,
  loadNocoBaseAcl,
} from "@/lib/nocobase/acl";

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action, params }) => {
    const snapshot = await loadNocoBaseAcl();
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

export const canAccessCurrentNocoBaseAcl = (
  params: Parameters<typeof canAccessWithSnapshot>[1]
) => canAccessWithSnapshot(getNocoBaseAclSnapshot(), params);
