export type TreeKey = string | number;
export type TreeRecord = { id: TreeKey; title?: string; name?: string; parentId?: TreeKey | null; parent?: { id: TreeKey } | null; children?: TreeRecord[]; [key: string]: unknown };
export type TreeNode = TreeRecord & { children: TreeNode[] };
export type TreeListOptions = {
  dataSourceKey?: string;
  page?: number;
  pageSize?: number;
  filter?: Record<string, unknown>;
  sort?: string[];
  fields?: string[];
  childrenField?: string;
};
export type TreeListResult = { rows: TreeNode[]; count: number };
export type TreeCollectionManagerProps = { collectionName: string; dataSourceKey?: string; titleField?: string; parentField?: string; childrenField?: string; pageSize?: number; onError?: (error: Error) => void };
