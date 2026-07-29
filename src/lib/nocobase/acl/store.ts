import { nocobaseClient } from "@/lib/nocobase/client";
import { NocoBaseHttpError } from "@/lib/nocobase/error";
import type { AclStore } from "./context";
import {
  clearRecordPermissions,
  getRecordActionPermission,
  getRecordPermissions,
  subscribeRecordPermissions,
} from "./record-permissions";
import type { AclPermissionSet, AclResponse, AclState } from "./types";

const listeners = new Set<() => void>();
let activeRequest:
  | {
      id: number;
      sessionKey: string;
      promise: Promise<AclState>;
    }
  | undefined;
let requestId = 0;
let loadedSessionKey: string | undefined;
let state: AclState = { status: "idle" };

const emit = () => listeners.forEach((listener) => listener());

const setState = (next: AclState) => {
  state = next;
  emit();
  return state;
};

const getSessionKey = () => {
  const token = nocobaseClient.getToken();
  return token ? `${token}:${nocobaseClient.getRole() ?? ""}` : undefined;
};

const requestAcl = async (role?: string) =>
  nocobaseClient.request<AclResponse>("roles:check", {
    unwrap: "none",
    withAclMeta: false,
    role,
    includeRole: Boolean(role),
  });

const isStaleRoleError = (error: unknown) => {
  if (!(error instanceof NocoBaseHttpError)) return false;
  const payload = error.payload as
    | {
        code?: string;
        error?: { code?: string };
        errors?: Array<{ code?: string }>;
      }
    | undefined;
  const codes = [
    payload?.code,
    payload?.error?.code,
    ...(payload?.errors?.map((item) => item.code) ?? []),
  ];
  return codes.some((code) =>
    ["ROLE_NOT_FOUND_ERR", "ROLE_NOT_FOUND_FOR_USER"].includes(code ?? "")
  );
};

const normalizePermissions = (
  response: AclResponse,
  fallbackRole?: string
): AclPermissionSet => {
  const { role, roles, ...permissions } = response.data ?? {};
  const currentRole = role ?? fallbackRole;
  return {
    ...permissions,
    currentRole,
    roles: roles ?? (currentRole ? [currentRole] : []),
    dataSources: response.meta?.dataSources,
  };
};

export const getAclState = () => state;

export const subscribeAcl = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const clearAcl = () => {
  requestId += 1;
  activeRequest = undefined;
  loadedSessionKey = undefined;
  clearRecordPermissions();
  nocobaseClient.setRole(null);
  setState({ status: "idle" });
};

const load = async ({ force = false } = {}) => {
  const sessionKey = getSessionKey();
  if (!sessionKey) {
    clearAcl();
    return state;
  }

  if (!force && state.status === "ready" && loadedSessionKey === sessionKey) {
    return state;
  }
  if (!force && activeRequest?.sessionKey === sessionKey) {
    return activeRequest.promise;
  }

  setState({ status: "loading" });
  const currentRequestId = ++requestId;
  const requestedRole = nocobaseClient.getRole();
  const promise = (async () => {
    try {
      let response: AclResponse;
      let effectiveRole = requestedRole;
      try {
        response = await requestAcl(requestedRole);
      } catch (error) {
        if (!requestedRole || !isStaleRoleError(error)) throw error;
        effectiveRole = undefined;
        response = await requestAcl();
      }

      if (currentRequestId !== requestId) return state;

      const permissions = normalizePermissions(response, effectiveRole);
      nocobaseClient.setRole(permissions.currentRole ?? null);
      clearRecordPermissions();
      loadedSessionKey = getSessionKey();
      return setState({ status: "ready", permissions });
    } catch (error) {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error("Unable to load permissions");
      if (currentRequestId !== requestId) return state;
      loadedSessionKey = undefined;
      return setState({ status: "error", error: normalizedError });
    } finally {
      if (activeRequest?.id === currentRequestId) activeRequest = undefined;
    }
  })();
  activeRequest = { id: currentRequestId, sessionKey, promise };
  return promise;
};

export const loadAcl = () => load();

export const retryAcl = () => load({ force: true });

export const switchRole = async (roleName: string) => {
  const previousRole = nocobaseClient.getRole();
  nocobaseClient.setRole(roleName);

  try {
    await nocobaseClient.action("users", "setDefaultRole", {
      method: "POST",
      body: { roleName },
      withAclMeta: false,
    });
  } catch (error) {
    nocobaseClient.setRole(previousRole);
    throw error;
  }
};

export const aclStore: AclStore = {
  getState: getAclState,
  subscribe: subscribeAcl,
  load: loadAcl,
  retry: retryAcl,
  clear: clearAcl,
  recordPermissions: {
    getState: getRecordPermissions,
    subscribe: subscribeRecordPermissions,
    getPermission: getRecordActionPermission,
  },
};
