import { nocobaseClient } from "@nocobase/portal-sdk/client";

import type { LockedUser, PasswordPolicy } from "./types";

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 6,
  complexity: "alpha_numeric",
  cantIncludeUsername: true,
  historyCount: 3,
  validityPeriod: 90,
  expirationNotificationChannel: ["password-expiration-in-app-message"],
  maxSignInAttempts: 5,
  maxSignInAttemptsInterval: 600,
  lockoutDuration: 0,
};

export function isPasswordPolicyUnavailable(error: unknown) {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? error.status
      : undefined;
  return (
    status === 404 ||
    (error instanceof Error &&
      error.message.trim().toLowerCase() === "not found")
  );
}

export async function getPasswordPolicy() {
  const value = await nocobaseClient.action<Partial<PasswordPolicy>>(
    "passwordPolicy",
    "get",
    { query: { filterByTk: 1 } }
  );
  return { ...DEFAULT_PASSWORD_POLICY, ...value };
}

export async function updatePasswordPolicy(values: Partial<PasswordPolicy>) {
  return nocobaseClient.action("passwordPolicy", "update", {
    method: "POST",
    query: { filterByTk: 1 },
    body: values,
  });
}

export async function listLockedUsers(): Promise<LockedUser[]> {
  const payload = await nocobaseClient.action<unknown>("lockedUsers", "list", {
    query: { pageSize: 200, appends: ["user"] },
    unwrap: "none",
  });
  return ((payload as any)?.data?.data ??
    (payload as any)?.data ??
    []) as LockedUser[];
}

export async function lockUser(
  userId: string | number,
  lockReason?: string,
  unlockTs?: string | null
) {
  return nocobaseClient.action("lockedUsers", "updateOrCreate", {
    method: "POST",
    body: {
      userId,
      lockedTs: new Date().toISOString(),
      unlockTs: unlockTs || null,
      lockReason,
    },
    query: { filterKeys: ["userId"] },
  });
}

export async function unlockUser(id: string | number) {
  return nocobaseClient.action("lockedUsers", "destroy", {
    method: "POST",
    query: { filterByTk: id },
  });
}

export async function clearExpiredLocks() {
  return nocobaseClient.action("lockedUsers", "destroy", {
    method: "POST",
    query: {
      filter: JSON.stringify({
        unlockTs: { $dateNotAfter: new Date().toISOString() },
      }),
    },
  });
}
