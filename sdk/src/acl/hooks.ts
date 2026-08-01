import { useSyncExternalStore } from "react";

import { useAclState, useAclStore } from "./context.js";
import { evaluateAccess } from "./evaluator.js";
import type { AclAccessRequest } from "./types.js";

export const useAclEvaluator = () => {
  const store = useAclStore();
  const state = useAclState();
  useSyncExternalStore(
    store.recordPermissions.subscribe,
    store.recordPermissions.getState,
    store.recordPermissions.getState
  );

  return (request: AclAccessRequest) =>
    state.status === "ready" &&
    evaluateAccess(
      state.permissions,
      request,
      store.recordPermissions.getPermission
    );
};

export const useCanAccess = (request: AclAccessRequest) =>
  useAclEvaluator()(request);

export const useGetRoles = () => {
  const state = useAclState();
  const isLoading = state.status === "idle" || state.status === "loading";
  const isError = state.status === "error";

  return {
    data: state.status === "ready" ? state.permissions.roles : undefined,
    error: isError ? state.error : undefined,
    isError,
    isLoading,
    isPending: isLoading,
  };
};
