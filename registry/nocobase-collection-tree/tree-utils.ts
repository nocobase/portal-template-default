import type { TreeKey, TreeNode, TreeRecord } from "./types";
export function buildTree(records: TreeRecord[]): TreeNode[] {
  const nodes = new Map<TreeKey, TreeNode>();
  records.forEach((record) => nodes.set(record.id, { ...record, children: [] }));
  const roots: TreeNode[] = [];
  nodes.forEach((node) => { const parentId = node.parentId ?? node.parent?.id; const parent = parentId == null ? undefined : nodes.get(parentId); if (parent && parent.id !== node.id) parent.children.push(node); else roots.push(node); });
  return roots;
}
export function flattenTree(records: TreeRecord[]): TreeRecord[] { const result: TreeRecord[] = []; const visit = (items: TreeRecord[]) => items.forEach((item) => { result.push(item); if (item.children?.length) visit(item.children); }); visit(records); return result; }
export function filterTree(nodes: TreeNode[], query: string, titleField = "title"): TreeNode[] { const needle = query.trim().toLowerCase(); if (!needle) return nodes; return nodes.flatMap((node) => { const children = filterTree(node.children, query, titleField); const label = String(node[titleField] ?? node.name ?? node.id).toLowerCase(); return label.includes(needle) || children.length ? [{ ...node, children }] : []; }); }

export function normalizeServerTree(
  records: TreeRecord[],
  childrenField = "children"
): TreeNode[] {
  return records.map((record) => {
    const sourceChildren = record[childrenField];
    const children = Array.isArray(sourceChildren)
      ? normalizeServerTree(sourceChildren as TreeRecord[], childrenField)
      : [];
    return { ...record, children };
  });
}
