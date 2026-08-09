import { nocobaseClient } from "@nocobase/portal-sdk/client";

import {
  buildTree,
  flattenTree,
} from "@/extensions/nocobase-collection-tree/tree-utils";
import type {
  TreeKey,
  TreeRecord,
} from "@/extensions/nocobase-collection-tree/types";

import type { Department, DepartmentUser } from "./types";

function rows(payload: any): any[] {
  const value =
    payload?.data?.data ??
    payload?.data?.rows ??
    payload?.data ??
    payload?.rows ??
    [];
  return Array.isArray(value) ? value : [];
}

function requiredKey(value: TreeKey | undefined, label: string) {
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new Error(`${label} must be selected first.`);
  }
  return value;
}

function associatedEndpoint(
  resource: string,
  sourceKey: TreeKey | undefined,
  association: string,
  action: "list" | "add" | "remove"
) {
  const key = requiredKey(
    sourceKey,
    resource === "departments" ? "A department" : "A role"
  );
  return `${resource}/${encodeURIComponent(String(key))}/${association}:${action}`;
}

export async function listDepartments(): Promise<Department[]> {
  const payload = await nocobaseClient.action<any>("departments", "list", {
    query: {
      pageSize: 1000,
      appends: ["parent", "roles", "owners"],
    },
    unwrap: "none",
  });
  const records = rows(payload).filter(
    (record): record is TreeRecord =>
      record &&
      typeof record === "object" &&
      record.id !== undefined &&
      record.id !== null
  );
  const flattened = records.some((item) => item.children?.length)
    ? flattenTree(records)
    : records;
  return buildTree(flattened) as Department[];
}

export async function createDepartment(
  title: string,
  parentId?: TreeKey | null
) {
  return nocobaseClient.action("departments", "create", {
    method: "POST",
    body: {
      title,
      parent: parentId == null ? null : { id: parentId },
    },
  });
}

export async function updateDepartment(
  id: TreeKey,
  title: string,
  parentId?: TreeKey | null
) {
  return nocobaseClient.action("departments", "update", {
    method: "POST",
    query: { filterByTk: requiredKey(id, "A department") },
    body: {
      title,
      parent: parentId == null ? null : { id: parentId },
    },
  });
}

export async function destroyDepartment(id: TreeKey) {
  return nocobaseClient.action("departments", "destroy", {
    method: "POST",
    query: { filterByTk: requiredKey(id, "A department") },
  });
}

export async function listDepartmentMembers(
  id: TreeKey
): Promise<DepartmentUser[]> {
  const payload = await nocobaseClient.request<any>(
    associatedEndpoint("departments", id, "members", "list"),
    {
      method: "GET",
      query: { pageSize: 200 },
      unwrap: "none",
    }
  );
  return rows(payload) as DepartmentUser[];
}

export async function addDepartmentMembers(
  id: TreeKey,
  userIds: TreeKey[]
) {
  return nocobaseClient.request(
    associatedEndpoint("departments", id, "members", "add"),
    { method: "POST", body: userIds }
  );
}

export async function removeDepartmentMembers(
  id: TreeKey,
  userIds: TreeKey[]
) {
  return nocobaseClient.request(
    associatedEndpoint("departments", id, "members", "remove"),
    { method: "POST", body: userIds }
  );
}

export async function setDepartmentOwner(
  departmentId: TreeKey,
  userId: TreeKey,
  owner: boolean
) {
  return nocobaseClient.action(
    "departments",
    owner ? "setOwner" : "removeOwner",
    {
      method: "POST",
      body: {
        departmentId: requiredKey(departmentId, "A department"),
        userId: requiredKey(userId, "A user"),
      },
    }
  );
}

export async function setUserDepartments(
  userId: TreeKey,
  departments: Array<{
    id: TreeKey;
    isMain?: boolean;
    isOwner?: boolean;
  }>
) {
  return nocobaseClient.action("users", "setDepartments", {
    method: "POST",
    body: { userId: requiredKey(userId, "A user"), departments },
  });
}

export async function addRoleDepartments(
  roleName: string,
  departmentIds: TreeKey[]
) {
  return nocobaseClient.request(
    associatedEndpoint("roles", roleName, "departments", "add"),
    { method: "POST", body: departmentIds }
  );
}

export async function removeRoleDepartments(
  roleName: string,
  departmentIds: TreeKey[]
) {
  return nocobaseClient.request(
    associatedEndpoint("roles", roleName, "departments", "remove"),
    { method: "POST", body: departmentIds }
  );
}
