import type { NocoBaseRole, NocoBaseRoleMode } from "@/lib/nocobase/acl";

export const UNION_ROLE = "__union__";
export const ANONYMOUS_ROLE = "anonymous";

export function getNocoBaseRoleOptions({
  roles,
  roleMode,
  allowAnonymous = false,
}: {
  roles: NocoBaseRole[];
  roleMode?: NocoBaseRoleMode;
  allowAnonymous?: boolean;
}) {
  if (roleMode === "only-use-union") {
    return [{ name: UNION_ROLE, title: "Full permissions" }];
  }

  const options = roles.filter(
    (role) => role.name !== UNION_ROLE && role.name !== ANONYMOUS_ROLE
  );
  if (allowAnonymous) {
    options.push({ name: ANONYMOUS_ROLE, title: "Anonymous" });
  }
  if (roleMode === "allow-use-union") {
    options.unshift({ name: UNION_ROLE, title: "Full permissions" });
  }
  return options;
}
