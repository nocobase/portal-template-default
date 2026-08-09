import { useGetIdentity, useTranslate } from "@refinedev/core";
import { Loader2, ShieldCheck } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  switchRole,
  useAclState,
  type AclIdentity,
  type Role,
} from "@nocobase/portal-sdk/acl";
import { nocobaseClient } from "@nocobase/portal-sdk/client";
import { cn } from "@/lib/utils";
import { getRoleOptions, resolveRoleTitle, UNION_ROLE } from "./role-options";
import { resolveRoleSwitcherContext } from "./role-switcher-context";

export type RoleSwitcherProps = {
  className?: string;
  triggerClassName?: string;
  label?: ReactNode | false;
  showWhenUnavailable?: boolean;
};

export function RoleSwitcher({
  className,
  triggerClassName,
  label,
  showWhenUnavailable = false,
}: RoleSwitcherProps) {
  const translate = useTranslate();
  const { data: identity, isLoading } = useGetIdentity<AclIdentity>();
  const acl = useAclState();
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string>();
  const context = resolveRoleSwitcherContext(acl, nocobaseClient.getRole());

  const roles = useMemo(
    () =>
      getRoleOptions({
        roles: identity?.roles ?? [],
        roleMode: context.roleMode,
        allowAnonymous: context.allowAnonymous,
      }),
    [context.allowAnonymous, context.roleMode, identity?.roles]
  );

  const currentRole =
    context.roleMode === "only-use-union"
      ? UNION_ROLE
      : context.currentRole ?? roles[0]?.name;
  const canSwitch =
    roles.length > 1 && context.roleMode !== "only-use-union";

  const handleRoleChange = async (value: string | null) => {
    if (!value || value === currentRole) return;
    setSwitching(true);
    setError(undefined);
    try {
      await switchRole(value);
      window.location.reload();
    } catch {
      setError(
        translate(
          "acl.roleSwitcher.switchFailed",
          "Unable to switch role"
        )
      );
      setSwitching(false);
    }
  };

  if (isLoading || acl.status === "idle" || acl.status === "loading") {
    return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  }
  if (!canSwitch && !showWhenUnavailable) return null;

  if (!canSwitch) {
    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        <ShieldCheck className="size-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          {translate("acl.roleSwitcher.currentRole", "Current role")}
        </span>
        <Badge variant="secondary">{getRoleTitle(roles, currentRole)}</Badge>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label === false ? null : (
        <p className="text-xs font-medium text-muted-foreground">
          {label ?? translate("acl.roleSwitcher.switchRole", "Switch role")}
        </p>
      )}
      <Select
        value={currentRole}
        disabled={switching}
        onValueChange={handleRoleChange}
      >
        <SelectTrigger
          className={cn("w-full min-w-52", triggerClassName)}
          aria-label={translate(
            "acl.roleSwitcher.switchRole",
            "Switch role"
          )}
        >
          {switching ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
          <SelectValue>{getRoleTitle(roles, currentRole)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {roles.map((role, index) => (
            <RoleOption
              key={role.name}
              role={role}
              showSeparator={index === 1 && roles[0]?.name === UNION_ROLE}
            />
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function RoleOption({
  role,
  showSeparator,
}: {
  role: Role;
  showSeparator: boolean;
}) {
  return (
    <>
      {showSeparator ? <SelectSeparator /> : null}
      <SelectItem value={role.name}>{resolveRoleTitle(role)}</SelectItem>
    </>
  );
}

function getRoleTitle(roles: Role[], roleName?: string) {
  return resolveRoleTitle(
    roles.find((role) => role.name === roleName) ??
      (roleName ? { name: roleName } : undefined)
  );
}
