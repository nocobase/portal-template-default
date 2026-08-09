import {
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  Unlock,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  clearExpiredLocks,
  DEFAULT_PASSWORD_POLICY,
  getPasswordPolicy,
  isPasswordPolicyUnavailable,
  listLockedUsers,
  lockUser,
  unlockUser,
  updatePasswordPolicy,
} from "./password-policy-api";
import type { LockedUser, PasswordPolicy } from "./types";

const toNumber = (value: string) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

function PolicyField({
  id,
  label,
  value,
  onChange,
  min = 0,
  description,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  description?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(toNumber(event.target.value))}
      />
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export function PasswordPolicyManager() {
  const [policy, setPolicy] = useState<PasswordPolicy>();
  const [locks, setLocks] = useState<LockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error>();
  const [demoMode, setDemoMode] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [nextPolicy, nextLocks] = await Promise.all([
        getPasswordPolicy(),
        listLockedUsers(),
      ]);
      setPolicy(nextPolicy);
      setLocks(nextLocks);
      setDemoMode(false);
    } catch (nextError) {
      if (isPasswordPolicyUnavailable(nextError)) {
        setPolicy({ ...DEFAULT_PASSWORD_POLICY });
        setLocks([]);
        setDemoMode(true);
      } else {
        setError(
          nextError instanceof Error
            ? nextError
            : new Error(String(nextError))
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchPolicy = <K extends keyof PasswordPolicy>(
    key: K,
    value: PasswordPolicy[K]
  ) => {
    setPolicy((current) =>
      current ? { ...current, [key]: value } : current
    );
  };

  const save = async () => {
    if (!policy) return;
    setSaving(true);
    setError(undefined);
    try {
      if (!demoMode) {
        await updatePasswordPolicy(policy);
        await load();
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError : new Error(String(nextError))
      );
    } finally {
      setSaving(false);
    }
  };

  const clearLocks = async () => {
    if (demoMode) {
      const now = Date.now();
      setLocks((current) =>
        current.filter(
          (item) => !item.unlockTs || new Date(item.unlockTs).getTime() > now
        )
      );
      return;
    }
    await clearExpiredLocks();
    await load();
  };

  const removeLock = async (id: string | number) => {
    if (demoMode) {
      setLocks((current) => current.filter((item) => item.id !== id));
      return;
    }
    await unlockUser(id);
    await load();
  };

  const submitLock = async () => {
    if (!userId) return;
    if (demoMode) {
      const next: LockedUser = {
        id: `demo-${userId}`,
        userId,
        user: { id: userId, username: `user-${userId}` },
        lockedTs: new Date().toISOString(),
        unlockTs: null,
        lockReason: reason,
      };
      setLocks((current) => [
        next,
        ...current.filter((item) => String(item.userId) !== userId),
      ]);
    } else {
      await lockUser(userId, reason);
      await load();
    }
    setDialog(false);
    setUserId("");
    setReason("");
  };

  if (loading && !policy) {
    return (
      <div className="flex items-center gap-2 p-6">
        <LoaderCircle className="animate-spin" />
        Loading password policy...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {demoMode ? (
        <Alert>
          <AlertDescription>
            <strong>Local demo mode</strong> — the password policy plugin is not
            enabled on this NocoBase server. Changes stay in this page.
          </AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      {policy ? (
        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules">Password rules</TabsTrigger>
            <TabsTrigger value="expiration">Expiration</TabsTrigger>
            <TabsTrigger value="security">Sign-in security</TabsTrigger>
            <TabsTrigger value="locked">
              Locked users ({locks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules">
            <Card>
              <CardContent className="grid gap-5 pt-6 md:grid-cols-2">
                <PolicyField
                  id="password-policy-min-length"
                  label="Minimum password length"
                  min={1}
                  value={policy.minLength}
                  onChange={(value) => patchPolicy("minLength", value)}
                />
                <div className="grid gap-2">
                  <Label htmlFor="password-policy-complexity">Complexity</Label>
                  <NativeSelect
                    id="password-policy-complexity"
                    value={policy.complexity}
                    onChange={(event) =>
                      patchPolicy(
                        "complexity",
                        event.target.value as PasswordPolicy["complexity"]
                      )
                    }
                  >
                    <NativeSelectOption value="alpha_numeric">
                      Letters and numbers
                    </NativeSelectOption>
                    <NativeSelectOption value="alpha_numeric_special">
                      Letters, numbers, special
                    </NativeSelectOption>
                    <NativeSelectOption value="numbers_upper_lower">
                      Numbers, upper and lower case
                    </NativeSelectOption>
                    <NativeSelectOption value="numbers_upper_lower_special">
                      Numbers, cases, special
                    </NativeSelectOption>
                    <NativeSelectOption value="3_of_4">
                      Any three of four groups
                    </NativeSelectOption>
                    <NativeSelectOption value="none">
                      No restriction
                    </NativeSelectOption>
                  </NativeSelect>
                </div>
                <PolicyField
                  id="password-policy-history-count"
                  label="Password history count"
                  value={policy.historyCount}
                  onChange={(value) => patchPolicy("historyCount", value)}
                />
                <Label className="flex items-center gap-3">
                  <Checkbox
                    checked={policy.cantIncludeUsername}
                    onCheckedChange={(value) =>
                      patchPolicy("cantIncludeUsername", value === true)
                    }
                  />
                  Password cannot include username
                </Label>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expiration">
            <Card>
              <CardContent className="grid gap-5 pt-6 md:grid-cols-2">
                <PolicyField
                  id="password-policy-validity-period"
                  label="Validity period (days, 0 = never)"
                  value={policy.validityPeriod}
                  onChange={(value) => patchPolicy("validityPeriod", value)}
                />
                <div className="grid gap-2">
                  <Label htmlFor="password-policy-notification-channels">
                    Notification channel names
                  </Label>
                  <Input
                    id="password-policy-notification-channels"
                    value={policy.expirationNotificationChannel.join(",")}
                    onChange={(event) =>
                      patchPolicy(
                        "expirationNotificationChannel",
                        event.target.value
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean)
                      )
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardContent className="grid gap-5 pt-6 md:grid-cols-3">
                <PolicyField
                  id="password-policy-max-attempts"
                  label="Maximum failed attempts (0 = unlimited)"
                  value={policy.maxSignInAttempts}
                  onChange={(value) => patchPolicy("maxSignInAttempts", value)}
                />
                <PolicyField
                  id="password-policy-attempt-interval"
                  label="Attempt interval (seconds)"
                  min={30}
                  value={policy.maxSignInAttemptsInterval}
                  onChange={(value) =>
                    patchPolicy("maxSignInAttemptsInterval", value)
                  }
                />
                <PolicyField
                  id="password-policy-lockout-duration"
                  label="Lockout duration (seconds, 0 = manual)"
                  value={policy.lockoutDuration}
                  onChange={(value) => patchPolicy("lockoutDuration", value)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locked">
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => (demoMode ? undefined : void load())}
                  >
                    <RefreshCw /> Refresh
                  </Button>
                  <Button variant="outline" onClick={() => void clearLocks()}>
                    Clear expired
                  </Button>
                  <Button onClick={() => setDialog(true)}>
                    <Plus /> Lock user
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Locked</TableHead>
                      <TableHead>Unlock</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locks.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.user?.nickname ||
                            item.user?.username ||
                            `#${item.userId}`}
                        </TableCell>
                        <TableCell>
                          {item.lockedTs
                            ? new Date(item.lockedTs).toLocaleString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {item.unlockTs
                            ? new Date(item.unlockTs).toLocaleString()
                            : "Manual"}
                        </TableCell>
                        <TableCell>{item.lockReason || "—"}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void removeLock(item.id)}
                          >
                            <Unlock /> Unlock
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <div className="mt-4 flex justify-end">
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
              Save policy
            </Button>
          </div>
        </Tabs>
      ) : null}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock user</DialogTitle>
            <DialogDescription>
              Create or update a lock by user primary key.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password-policy-user-id">User ID</Label>
              <Input
                id="password-policy-user-id"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password-policy-lock-reason">Reason</Label>
              <Input
                id="password-policy-lock-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>
              Cancel
            </Button>
            <Button disabled={!userId} onClick={() => void submitLock()}>
              Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
