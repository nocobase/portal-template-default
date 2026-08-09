import { describe, expect, it } from "vitest";
import { buildTree, filterTree, normalizeServerTree } from "../tree-utils";

describe("collection tree utilities", () => {
  const tree = buildTree([
    { id: 1, title: "Products" },
    { id: 2, title: "Hardware", parentId: 1 },
    { id: 3, title: "Services" },
  ]);

  it("builds adjacency-list records without mutating the inputs", () => {
    expect(tree.map((node) => node.id)).toEqual([1, 3]);
    expect(tree[0].children.map((node) => node.id)).toEqual([2]);
  });

  it("retains ancestors when a descendant matches search", () => {
    const filtered = filterTree(tree, "hardware");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(1);
    expect(filtered[0].children[0].id).toBe(2);
  });

  it("normalizes a custom server children field without rebuilding ancestry", () => {
    const normalized = normalizeServerTree(
      [{ id: 1, title: "Products", nodes: [{ id: 2, title: "Hardware" }] }],
      "nodes"
    );
    expect(normalized[0].children[0].id).toBe(2);
  });
});
