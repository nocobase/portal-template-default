import {
  Building2,
  Crown,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { CanAccess } from "@/components/access-control/can-access";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { flattenTree } from "@/extensions/nocobase-collection-tree/tree-utils";
import type { TreeKey } from "@/extensions/nocobase-collection-tree/types";

import {
  addDepartmentMembers,
  createDepartment,
  destroyDepartment,
  listDepartmentMembers,
  listDepartments,
  removeDepartmentMembers,
  setDepartmentOwner,
} from "./departments-api";
import type { Department, DepartmentUser } from "./types";

function toError(reason: unknown) {
  return reason instanceof Error ? reason : new Error(String(reason));
}

function findDepartment(items: Department[], id: TreeKey | undefined) {
  if (id === undefined) return undefined;
  return (flattenTree(items) as Department[]).find((item) => item.id === id);
}

function DepartmentsManagerContent() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selected, setSelected] = useState<Department>();
  const [members, setMembers] = useState<DepartmentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [dialog, setDialog] = useState<"root" | "child" | "members">();
  const [title, setTitle] = useState("");
  const [ids, setIds] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const tree = await listDepartments();
      const active = findDepartment(tree, selected?.id) ?? tree[0];
      setDepartments(tree);
      setSelected(active);
      setMembers(active ? await listDepartmentMembers(active.id) : []);
    } catch (reason) {
      setError(toError(reason));
    } finally {
      setLoading(false);
    }
  }, [selected?.id]);

  useEffect(() => {
    void load();
    // Initial load only; explicit actions preserve and reload the current node.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = async (department: Department) => {
    setSelected(department);
    setError(undefined);
    try {
      setMembers(await listDepartmentMembers(department.id));
    } catch (reason) {
      setError(toError(reason));
    }
  };

  const runMutation = async (mutation: () => Promise<unknown>) => {
    setError(undefined);
    try {
      await mutation();
    } catch (reason) {
      setError(toError(reason));
    }
  };

  const renderTree = (items: Department[], depth = 0): React.ReactNode =>
    items.map((item) => (
      <div key={item.id}>
        <button
          className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
            selected?.id === item.id
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          }`}
          style={{ paddingLeft: depth * 18 + 12 }}
          onClick={() => void choose(item)}
        >
          <Building2 className="size-4" />
          {item.title || `#${item.id}`}
        </button>
        {item.children?.length
          ? renderTree(item.children as Department[], depth + 1)
          : null}
      </div>
    ));

  const saveDialog = () =>
    runMutation(async () => {
      if (dialog === "members" && selected) {
        const userIds = ids
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean) as TreeKey[];
        if (!userIds.length) return;
        await addDepartmentMembers(selected.id, userIds);
      } else if (dialog === "root" || dialog === "child") {
        const nextTitle = title.trim();
        if (!nextTitle) return;
        await createDepartment(
          nextTitle,
          dialog === "child" ? selected?.id : null
        );
      } else {
        return;
      }
      setDialog(undefined);
      setTitle("");
      setIds("");
      await load();
    });

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      {error ? (
        <Alert variant="destructive" className="lg:col-span-2">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Department hierarchy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <CanAccess resource="departments" action="create">
              <Button size="sm" onClick={() => setDialog("root")}>
                <Plus /> Root
              </Button>
            </CanAccess>
            <CanAccess resource="departments" action="create">
              <Button
                size="sm"
                variant="outline"
                disabled={!selected}
                onClick={() => setDialog("child")}
              >
                <Plus /> Child
              </Button>
            </CanAccess>
            <Button size="sm" variant="outline" onClick={() => void load()}>
              <RefreshCw />
            </Button>
          </div>
          {loading ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            renderTree(departments)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{selected?.title || "Members"}</CardTitle>
          <CardDescription>
            Membership and department-owner responsibility.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <CanAccess resource="departments.members" action="add">
              <Button
                disabled={!selected}
                onClick={() => setDialog("members")}
              >
                <UserPlus /> Add members
              </Button>
            </CanAccess>
            <CanAccess resource="departments" action="destroy">
              <Button
                variant="destructive"
                disabled={!selected}
                onClick={() =>
                  void runMutation(async () => {
                    if (
                      selected &&
                      window.confirm(`Delete ${selected.title}?`)
                    ) {
                      await destroyDepartment(selected.id);
                      setSelected(undefined);
                      await load();
                    }
                  })
                }
              >
                <Trash2 /> Delete department
              </Button>
            </CanAccess>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((user) => {
                const owner = user.departmentsUsers?.isOwner === true;
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      {user.nickname || user.username || `#${user.id}`}
                    </TableCell>
                    <TableCell>{user.email || "—"}</TableCell>
                    <TableCell>
                      {owner ? (
                        <Badge>
                          <Crown /> Owner
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Member</Badge>
                      )}
                    </TableCell>
                    <TableCell className="space-x-1">
                      <CanAccess resource="departments" action="setOwner">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            void runMutation(async () => {
                              if (!selected) return;
                              await setDepartmentOwner(
                                selected.id,
                                user.id,
                                !owner
                              );
                              await choose(selected);
                            })
                          }
                        >
                          <Crown /> {owner ? "Unset owner" : "Set owner"}
                        </Button>
                      </CanAccess>
                      <CanAccess resource="departments.members" action="remove">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            void runMutation(async () => {
                              if (!selected) return;
                              await removeDepartmentMembers(selected.id, [
                                user.id,
                              ]);
                              await choose(selected);
                            })
                          }
                        >
                          <Trash2 /> Remove
                        </Button>
                      </CanAccess>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(dialog)}
        onOpenChange={(open) => !open && setDialog(undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "members"
                ? "Add members"
                : dialog === "child"
                  ? "Add child department"
                  : "Add root department"}
            </DialogTitle>
            <DialogDescription>
              {dialog === "members"
                ? "Enter comma-separated user primary keys."
                : "The parent relationship determines the organization tree."}
            </DialogDescription>
          </DialogHeader>
          {dialog === "members" ? (
            <Input
              value={ids}
              onChange={(event) => setIds(event.target.value)}
              placeholder="1, 2, 3"
            />
          ) : (
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(undefined)}>
              Cancel
            </Button>
            <Button onClick={() => void saveDialog()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DepartmentsManager() {
  return (
    <CanAccess resource="departments" action="list">
      <DepartmentsManagerContent />
    </CanAccess>
  );
}
