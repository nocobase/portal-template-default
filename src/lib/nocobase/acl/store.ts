import { useSyncExternalStore } from "react";

import { nocobaseClient } from "@/lib/nocobase/client";
import { NocoBaseHttpError } from "@/lib/nocobase/error";
import { clearRecordPermissions } from "./record-permissions";
import type {
  AclResponse,
  AclSnapshot,
} from "./types";

const listeners = new Set<() => void>();
let request:
  | {
      id: number;
      identity: string;
      promise: Promise<AclSnapshot>;
    }
  | undefined;
let requestId = 0;
let snapshot: AclSnapshot = {
  status: "idle",
  data: {},
  meta: {},
  version: 0,
};

const emit = () => listeners.forEach((listener) => listener());

const setSnapshot = (next: Partial<AclSnapshot>) => {
  snapshot = {
    ...snapshot,
    ...next,
    version: snapshot.version + 1,
  };
  emit();
  return snapshot;
};

const getIdentity = () => {
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

export const getAclSnapshot = () => snapshot;

export const subscribeAcl = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useAclSnapshot = () =>
  useSyncExternalStore(
    subscribeAcl,
    getAclSnapshot,
    getAclSnapshot
  );

export const clearAcl = ({ keepRole = false } = {}) => {
  requestId += 1;
  request = undefined;
  clearRecordPermissions();
  if (!keepRole) nocobaseClient.setRole(null);
  setSnapshot({
    status: "idle",
    identity: undefined,
    data: {},
    meta: {},
    error: undefined,
  });
};

export const notifyRecordPermissionsChanged = () => {
  setSnapshot({});
};

export const loadAcl = async ({ force = false } = {}) => {
  const identity = getIdentity();
  if (!identity) {
    clearAcl();
    return snapshot;
  }

  if (!force && snapshot.status === "ready" && snapshot.identity === identity) {
    return snapshot;
  }
  if (!force && request?.identity === identity) return request.promise;

  setSnapshot({ status: "loading", identity, error: undefined });
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

      if (currentRequestId !== requestId) return snapshot;

      const data = response.data ?? {};
      nocobaseClient.setRole(data.role ?? effectiveRole ?? null);
      clearRecordPermissions();
      return setSnapshot({
        status: "ready",
        identity: getIdentity(),
        data,
        meta: response.meta ?? {},
        error: undefined,
      });
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error("Unable to load permissions");
      if (currentRequestId !== requestId) return snapshot;
      setSnapshot({ status: "error", error: normalizedError });
      throw normalizedError;
    } finally {
      if (request?.id === currentRequestId) request = undefined;
    }
  })();
  request = { id: currentRequestId, identity, promise };

  return promise;
};

export const switchRole = async (
  roleName: string,
  { reloadAcl = true } = {}
) => {
  const previousRole = nocobaseClient.getRole();
  nocobaseClient.setRole(roleName);

  try {
    await nocobaseClient.action("users", "setDefaultRole", {
      method: "POST",
      body: { roleName },
      withAclMeta: false,
    });
    if (!reloadAcl) {
      clearRecordPermissions();
      return snapshot;
    }
    return await loadAcl({ force: true });
  } catch (error) {
    nocobaseClient.setRole(previousRole);
    if (reloadAcl) {
      await loadAcl({ force: true }).catch(() => undefined);
    }
    throw error;
  }
};
