import {
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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

import { useMultiSpaceTranslation } from "./i18n";
import { resolveSpaceLabel } from "./space-label";
import {
  addSpaceUsers,
  createSpace,
  destroySpace,
  listSpaces,
  listSpaceUsers,
  removeSpaceUsers,
} from "./space-api";
import type { SpaceRecord, SpaceUser } from "./types";

export function SpacesManager() {
  const t = useMultiSpaceTranslation();
  const unassignedLabel = t("space.unassigned", "(Unassigned Space)");
  const [spaces, setSpaces] = useState<SpaceRecord[]>([]);
  const [selected, setSelected] = useState<SpaceRecord>();
  const [users, setUsers] = useState<SpaceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [dialog, setDialog] = useState<"space" | "users">();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [ids, setIds] = useState("");

  const load = useCallback(async (preferredName?: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const next = await listSpaces();
      const active =
        next.find((item) => item.name === preferredName) ?? next[0];
      setSpaces(next);
      setSelected(active);
      setUsers(active ? await listSpaceUsers(active.name) : []);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError : new Error(String(nextError))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const choose = async (space: SpaceRecord) => {
    setSelected(space);
    setError(undefined);
    try {
      setUsers(await listSpaceUsers(space.name));
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError : new Error(String(nextError))
      );
    }
  };

  const closeDialog = () => {
    setDialog(undefined);
    setName("");
    setTitle("");
    setIds("");
  };

  const saveDialog = async () => {
    if (dialog === "space") {
      const spaceName = name.trim();
      if (!spaceName) return;
      await createSpace({ name: spaceName, title: title.trim() });
      closeDialog();
      await load(spaceName);
      return;
    }
    if (dialog === "users" && selected) {
      const userIds = ids
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      if (!userIds.length) return;
      await addSpaceUsers(selected.name, userIds);
      closeDialog();
      await choose(selected);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      {error ? (
        <Alert variant="destructive" className="lg:col-span-2">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("manager.spaces", "Spaces")}</CardTitle>
          <CardDescription>
            {t(
              "manager.spacesDescription",
              "Isolation contexts available to users."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setDialog("space")}>
              <Plus /> {t("action.add", "Add")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              aria-label={t("action.refresh", "Refresh")}
              onClick={() => void load(selected?.name)}
            >
              <RefreshCw />
            </Button>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <LoaderCircle className="animate-spin" />
              {t("state.loading", "Loading spaces...")}
            </div>
          ) : spaces.length ? (
            spaces.map((space) => (
              <button
                key={space.name}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                  selected?.name === space.name
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => void choose(space)}
              >
                <span>{resolveSpaceLabel(space, unassignedLabel)}</span>
                {space.default ? (
                  <span className="text-xs">
                    {t("manager.default", "Default")}
                  </span>
                ) : null}
              </button>
            ))
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              {t("manager.noSpaces", "No spaces found.")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selected
              ? resolveSpaceLabel(selected, unassignedLabel)
              : t("manager.members", "Members")}
          </CardTitle>
          <CardDescription>
            {t(
              "manager.membersDescription",
              "Add and remove users in the selected space."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Button disabled={!selected} onClick={() => setDialog("users")}>
              <Users /> {t("action.addUsers", "Add users")}
            </Button>
            <Button
              variant="destructive"
              disabled={!selected}
              onClick={async () => {
                if (
                  selected &&
                  window.confirm(
                    t("confirm.delete", `Delete ${selected.name}?`, {
                      name: resolveSpaceLabel(selected, unassignedLabel),
                    })
                  )
                ) {
                  await destroySpace(selected.name);
                  await load();
                }
              }}
            >
              <Trash2 /> {t("action.deleteSpace", "Delete space")}
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("field.user", "User")}</TableHead>
                <TableHead>{t("field.email", "Email")}</TableHead>
                <TableHead>
                  <span className="sr-only">
                    {t("field.actions", "Actions")}
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    {user.nickname || user.username || `#${user.id}`}
                  </TableCell>
                  <TableCell>{user.email || "—"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (!selected) return;
                        await removeSpaceUsers(selected.name, [user.id]);
                        await choose(selected);
                      }}
                    >
                      <Trash2 /> {t("action.remove", "Remove")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!users.length && selected ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {t("manager.noMembers", "No members in this space.")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(dialog)}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "space"
                ? t("dialog.createSpace", "Create space")
                : t("dialog.addUsers", "Add users")}
            </DialogTitle>
            <DialogDescription>
              {dialog === "space"
                ? t(
                    "dialog.createDescription",
                    "Names are stable identifiers used by request headers."
                  )
                : t(
                    "dialog.usersDescription",
                    "Enter comma-separated user primary keys."
                  )}
            </DialogDescription>
          </DialogHeader>
          {dialog === "space" ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="multi-space-name">
                  {t("field.name", "Name")}
                </Label>
                <Input
                  id="multi-space-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="multi-space-title">
                  {t("field.title", "Title")}
                </Label>
                <Input
                  id="multi-space-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
            </div>
          ) : (
            <Input
              value={ids}
              onChange={(event) => setIds(event.target.value)}
              placeholder={t("dialog.userIdsPlaceholder", "1, 2, 3")}
              aria-label={t("dialog.addUsers", "Add users")}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t("action.cancel", "Cancel")}
            </Button>
            <Button onClick={() => void saveDialog()}>
              {t("action.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
