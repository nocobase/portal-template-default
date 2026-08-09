import type { TreeKey, TreeNode } from "@/extensions/nocobase-collection-tree/types";
export type Department = TreeNode & { title?: string; roles?: Array<{ name: string; title?: string }>; owners?: DepartmentUser[] };
export type DepartmentUser = { id: TreeKey; nickname?: string; username?: string; email?: string; departmentsUsers?: { isOwner?: boolean } };
