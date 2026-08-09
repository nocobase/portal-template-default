import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit2,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CanAccess } from "@/components/access-control/can-access";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import {
  createTreeRecord,
  destroyTreeRecord,
  listTreeRecordPage,
  updateTreeRecord,
} from "./tree-api";
import { flattenTree } from "./tree-utils";
import type {
  TreeCollectionManagerProps,
  TreeKey,
  TreeNode,
} from "./types";

type Editor = {
  mode: "create" | "edit";
  parentId?: TreeKey | null;
  record?: TreeNode;
};

function TreeCollectionManagerContent({
  collectionName,
  dataSourceKey = "main",
  titleField = "title",
  parentField = "parent",
  childrenField = "children",
  pageSize = 20,
  onError,
}: TreeCollectionManagerProps) {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [serverQuery, setServerQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<TreeKey>>(new Set());
  const [editor, setEditor] = useState<Editor>();
  const [title, setTitle] = useState("");
  const [parentValue, setParentValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error>();

  const report = useCallback(
    (reason: unknown) => {
      const next =
        reason instanceof Error ? reason : new Error(String(reason));
      setError(next);
      onError?.(next);
    },
    [onError]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await listTreeRecordPage(collectionName, {
        dataSourceKey,
        page,
        pageSize,
        childrenField,
        filter: serverQuery
          ? { [titleField]: { $includes: serverQuery } }
          : undefined,
      });
      setNodes(result.rows);
      setCount(result.count);
    } catch (reason) {
      report(reason);
    } finally {
      setLoading(false);
    }
  }, [
    childrenField,
    collectionName,
    dataSourceKey,
    page,
    pageSize,
    report,
    serverQuery,
    titleField,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setServerQuery(query.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const availableParents = useMemo(() => flattenTree(nodes), [nodes]);
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const openEditor = (next: Editor) => {
    const currentParent =
      next.record?.parentId ?? next.record?.parent?.id ?? next.parentId;
    setEditor(next);
    setTitle(String(next.record?.[titleField] ?? ""));
    setParentValue(currentParent == null ? "" : String(currentParent));
  };

  const selectedParentId = () => {
    if (!parentValue) return null;
    return (
      availableParents.find((node) => String(node.id) === parentValue)?.id ??
      parentValue
    );
  };

  const save = async () => {
    if (!title.trim() || !editor) return;
    setSaving(true);
    setError(undefined);
    try {
      if (editor.mode === "edit" && editor.record) {
        await updateTreeRecord(
          collectionName,
          editor.record.id,
          { [titleField]: title.trim() },
          selectedParentId(),
          parentField,
          dataSourceKey
        );
      } else {
        await createTreeRecord(
          collectionName,
          { [titleField]: title.trim() },
          selectedParentId(),
          parentField,
          dataSourceKey
        );
      }
      setEditor(undefined);
      await load();
    } catch (reason) {
      report(reason);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (node: TreeNode) => {
    if (
      !window.confirm(
        `Delete ${String(node[titleField] ?? node.id)} and its descendants?`
      )
    ) {
      return;
    }
    try {
      await destroyTreeRecord(collectionName, node.id, dataSourceKey);
      await load();
    } catch (reason) {
      report(reason);
    }
  };

  const renderNodes = (items: TreeNode[], depth = 0): React.ReactNode =>
    items.map((node) => {
      const open = expanded.has(node.id) || Boolean(serverQuery);
      const hasChildren = node.children.length > 0;
      return (
        <div key={node.id}>
          <div
            className="group flex min-h-10 items-center gap-1 rounded-md px-2 hover:bg-muted/60"
            style={{ paddingLeft: `${depth * 20 + 8}px` }}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-7"
              disabled={!hasChildren}
              onClick={() =>
                setExpanded((current) => {
                  const next = new Set(current);
                  next.has(node.id) ? next.delete(node.id) : next.add(node.id);
                  return next;
                })
              }
            >
              {hasChildren ? (
                open ? <ChevronDown /> : <ChevronRight />
              ) : (
                <span />
              )}
            </Button>
            <span className="min-w-0 flex-1 truncate text-sm">
              {String(node[titleField] ?? node.name ?? node.id)}
            </span>
            <div className="invisible flex gap-1 group-hover:visible group-focus-within:visible">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Add child to ${String(node[titleField] ?? node.id)}`}
                onClick={() =>
                  openEditor({ mode: "create", parentId: node.id })
                }
              >
                <Plus />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${String(node[titleField] ?? node.id)}`}
                onClick={() => openEditor({ mode: "edit", record: node })}
              >
                <Edit2 />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${String(node[titleField] ?? node.id)}`}
                onClick={() => void remove(node)}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
          {open ? renderNodes(node.children, depth + 1) : null}
        </div>
      );
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the server-side tree"
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw /> Refresh
        </Button>
        <Button onClick={() => openEditor({ mode: "create", parentId: null })}>
          <Plus /> Add root
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-lg border p-2">
        {loading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <LoaderCircle className="animate-spin" /> Loading server tree...
          </div>
        ) : nodes.length ? (
          renderNodes(nodes)
        ) : (
          <p className="p-4 text-sm text-muted-foreground">
            No tree records found.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <span>
          {count} root {count === 1 ? "node" : "nodes"}
          {serverQuery ? " matching the server filter" : ""}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => current - 1)}
          >
            <ChevronLeft /> Previous
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((current) => current + 1)}
          >
            Next <ChevronRight />
          </Button>
        </div>
      </div>

      <Dialog
        open={Boolean(editor)}
        onOpenChange={(open) => !open && !saving && setEditor(undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editor?.mode === "edit" ? "Edit or move node" : "Add node"}
            </DialogTitle>
            <DialogDescription>
              Parent changes are validated by the collection-tree plugin, which
              maintains paths and rejects cycles.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="grid gap-2 text-sm font-medium">
              Title
              <Input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Title"
                onKeyDown={(event) =>
                  event.key === "Enter" && void save()
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Parent node
              <select
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={parentValue}
                onChange={(event) => setParentValue(event.target.value)}
              >
                <option value="">Root node</option>
                {availableParents.map((node) => (
                  <option
                    key={node.id}
                    value={String(node.id)}
                    disabled={node.id === editor?.record?.id}
                  >
                    {String(node[titleField] ?? node.name ?? node.id)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditor(undefined)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving || !title.trim()}>
              {saving ? <LoaderCircle className="animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function TreeCollectionManager(props: TreeCollectionManagerProps) {
  return (
    <CanAccess
      resource={props.collectionName}
      action="list"
      dataSourceKey={props.dataSourceKey}
    >
      <TreeCollectionManagerContent {...props} />
    </CanAccess>
  );
}
