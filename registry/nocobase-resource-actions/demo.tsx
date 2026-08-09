import { useList } from "@refinedev/core";
import { ListChecks, PlugZap } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { BulkEditRecordsButton } from "./bulk-edit-records-button";
import { BulkUpdateRecordsButton } from "./bulk-update-records-button";
import { DuplicateRecordButton } from "./duplicate-record-button";
import { useResourceActionsTranslation } from "./i18n";
import type { ResourceActionField } from "./types";

type UserRecord = {
  id: string | number;
  nickname?: string;
  username?: string;
  email?: string;
  phone?: string;
};

export default function ResourceActionsDemoPage() {
  const t = useResourceActionsTranslation();
  const [selectedKeys, setSelectedKeys] = useState<Array<string | number>>([]);
  const { result, query } = useList<UserRecord>({
    resource: "users",
    pagination: { mode: "server", currentPage: 1, pageSize: 8 },
    sorters: [{ field: "createdAt", order: "desc" }],
    errorNotification: false,
    queryOptions: { retry: false },
  });
  const fields = useMemo<ResourceActionField[]>(
    () => [
      { name: "nickname", label: t("field.nickname", "Nickname"), input: "text" },
      { name: "username", label: t("field.username", "Username"), input: "text", required: true },
      { name: "email", label: t("field.email", "Email"), input: "email" },
      { name: "phone", label: t("field.phone", "Phone"), input: "tel" },
    ],
    [t]
  );
  const selectedTarget = { type: "selected" as const, keys: selectedKeys };
  const refresh = async () => {
    await query.refetch();
    setSelectedKeys([]);
  };
  const allVisibleSelected =
    result.data.length > 0 && result.data.every((user) => selectedKeys.includes(user.id));

  return (
    <div className="space-y-6 pb-12">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            <ListChecks />
            {t("demo.navigation", "Resource actions")}
          </Badge>
          <Badge variant="outline">main / users</Badge>
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {t("demo.title", "Reusable resource actions")}
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          {t(
            "demo.description",
            "Bulk edit, configured bulk update, and duplicate actions using the standard NocoBase collection protocol."
          )}
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>{t("demo.users", "Users")}</CardTitle>
              <CardDescription>
                {t(
                  "demo.usersDescription",
                  "Select users for bulk actions, or duplicate one user from its row action."
                )}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {t("demo.selected", "{{count}} selected", {
                  count: selectedKeys.length,
                })}
              </Badge>
              <BulkEditRecordsButton
                collectionName="users"
                target={selectedTarget}
                fields={fields.filter((field) => field.name !== "username")}
                button={{ variant: "outline", label: t("action.bulkEdit", "Bulk edit") }}
                onUpdated={refresh}
              />
              <BulkUpdateRecordsButton
                collectionName="users"
                target={selectedTarget}
                values={{ nickname: "Portal user" }}
                button={{ label: t("action.bulkUpdate", "Bulk update") }}
                onUpdated={refresh}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      aria-label={t("demo.selected", "{{count}} selected", {
                        count: selectedKeys.length,
                      })}
                      checked={allVisibleSelected}
                      onCheckedChange={(checked) =>
                        setSelectedKeys(checked === true ? result.data.map((user) => user.id) : [])
                      }
                    />
                  </TableHead>
                  <TableHead>{t("field.nickname", "Nickname")}</TableHead>
                  <TableHead>{t("field.username", "Username")}</TableHead>
                  <TableHead>{t("field.email", "Email")}</TableHead>
                  <TableHead>{t("field.phone", "Phone")}</TableHead>
                  <TableHead>{t("field.actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      {t("demo.loading", "Loading users...")}
                    </TableCell>
                  </TableRow>
                ) : result.data.length ? (
                  result.data.map((user) => (
                    <TableRow key={user.id} data-state={selectedKeys.includes(user.id) && "selected"}>
                      <TableCell>
                        <Checkbox
                          aria-label={user.username ?? String(user.id)}
                          checked={selectedKeys.includes(user.id)}
                          onCheckedChange={(checked) =>
                            setSelectedKeys((current) =>
                              checked === true
                                ? Array.from(new Set([...current, user.id]))
                                : current.filter((key) => key !== user.id)
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>{user.nickname || "-"}</TableCell>
                      <TableCell>{user.username || "-"}</TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>{user.phone || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DuplicateRecordButton
                            collectionName="users"
                            recordKey={user.id}
                            fields={[fields[0]]}
                            mode="direct"
                            transformValues={(values) => ({
                              ...values,
                              username: `portal-copy-${Date.now()}`,
                            })}
                            button={{
                              variant: "ghost",
                              size: "sm",
                              label: t("demo.directDuplicate", "Direct duplicate"),
                              "aria-label": t("demo.directDuplicate", "Direct duplicate"),
                              title: t("demo.directDuplicate", "Direct duplicate"),
                            }}
                            onDuplicated={refresh}
                          />
                          <DuplicateRecordButton
                            collectionName="users"
                            recordKey={user.id}
                            fields={fields}
                            mode="edit"
                            button={{
                              variant: "ghost",
                              size: "sm",
                              label: t("demo.editDuplicate", "Duplicate and edit"),
                              "aria-label": t("demo.editDuplicate", "Duplicate and edit"),
                              title: t("demo.editDuplicate", "Duplicate and edit"),
                            }}
                            onDuplicated={refresh}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      {t("demo.empty", "No users found.")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <PlugZap className="mt-0.5 size-4 shrink-0" />
            <p>
              {t(
                "demo.requirement",
                "Uses core collection get, create, and update APIs. The three UI action plugins do not need to be enabled on the server."
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
