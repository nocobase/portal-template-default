import { useGetLocale, useTranslate } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { DataTable } from "@/components/data-table/data-table";
import { DeleteButton } from "@/components/resources/buttons/delete";
import { EditButton } from "@/components/resources/buttons/edit";
import { ShowButton } from "@/components/resources/buttons/show";
import { ListView } from "@/components/resources/views/list-view";
import { Badge } from "@/components/ui/badge";
import { useAIPageElementHandle } from "@/extensions/nocobase-ai";
import { resolveTranslatableText } from "@/lib/i18n";
import type { Role } from "@/lib/nocobase/acl";
import type { UserRecord } from "./types";

const getRoleLabel = (role: Role) =>
  resolveTranslatableText(role.title || role.name, { ns: "starter" });

const isRootUser = (record: UserRecord) =>
  record.roles?.some((role) => role.name === "root") ?? false;

export const UserList = () => {
  const translate = useTranslate();
  const getLocale = useGetLocale();
  const locale = getLocale();

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<UserRecord>();

    return [
      columnHelper.accessor("nickname", {
        id: "nickname",
        header: translate("users.fields.nickname", { ns: "app" }, "Nickname"),
        enableSorting: true,
        cell: ({ row, getValue }) =>
          getValue() || row.original.username || row.original.email || "-",
      }),
      columnHelper.accessor("username", {
        id: "username",
        header: translate("users.fields.username", { ns: "app" }, "Username"),
        enableSorting: true,
        cell: ({ getValue }) => getValue() || "-",
      }),
      columnHelper.accessor("email", {
        id: "email",
        header: translate("users.fields.email", { ns: "app" }, "Email"),
        enableSorting: true,
        cell: ({ getValue }) => getValue() || "-",
      }),
      columnHelper.accessor("phone", {
        id: "phone",
        header: translate("users.fields.phone", { ns: "app" }, "Phone"),
        enableSorting: true,
        cell: ({ getValue }) => getValue() || "-",
      }),
      columnHelper.accessor("roles", {
        id: "roles",
        header: translate("users.fields.roles", { ns: "app" }, "Roles"),
        enableSorting: false,
        cell: ({ getValue }) => {
          const roles = getValue() ?? [];
          return roles.length ? (
            <div className="flex flex-wrap gap-1">
              {roles.map((role) => (
                <Badge key={role.name} variant="secondary">
                  {getRoleLabel(role)}
                </Badge>
              ))}
            </div>
          ) : (
            "-"
          );
        },
      }),
      columnHelper.accessor("createdAt", {
        id: "createdAt",
        header: translate(
          "users.fields.createdAt",
          { ns: "app" },
          "Created at"
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const value = getValue();
          return value
            ? new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
              }).format(new Date(value))
            : "-";
        },
      }),
      columnHelper.display({
        id: "actions",
        header: translate("users.fields.actions", { ns: "app" }, "Actions"),
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <EditButton
              recordItemId={row.original.id}
              variant="ghost"
              size="icon"
              aria-label={translate(
                "users.actions.edit",
                { ns: "app" },
                "Edit user"
              )}
              title={translate(
                "users.actions.edit",
                { ns: "app" },
                "Edit user"
              )}
            >
              <Pencil />
            </EditButton>
            <ShowButton
              recordItemId={row.original.id}
              variant="ghost"
              size="icon"
              aria-label={translate(
                "users.actions.view",
                { ns: "app" },
                "View user"
              )}
              title={translate(
                "users.actions.view",
                { ns: "app" },
                "View user"
              )}
            >
              <Eye />
            </ShowButton>
            {isRootUser(row.original) ? null : (
              <DeleteButton
                recordItemId={row.original.id}
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                aria-label={translate(
                  "users.actions.delete",
                  { ns: "app" },
                  "Delete user"
                )}
                title={translate(
                  "users.actions.delete",
                  { ns: "app" },
                  "Delete user"
                )}
              >
                <Trash2 />
              </DeleteButton>
            )}
          </div>
        ),
        enableSorting: false,
        size: 144,
      }),
    ];
  }, [locale, translate]);

  const table = useTable<UserRecord>({
    columns,
    refineCoreProps: {
      syncWithLocation: true,
      meta: {
        appends: ["roles"],
      },
      sorters: {
        initial: [{ field: "createdAt", order: "desc" }],
      },
    },
  });

  const tableContext = useAIPageElementHandle({
    id: "users-table",
    title: translate("users.ai.table", { ns: "app" }, "Users table"),
    kind: "table",
    getContext: () => ({
      resource: "users",
      page: table.refineCore.currentPage,
      pageSize: table.refineCore.pageSize,
      total: table.refineCore.tableQuery.data?.total ?? 0,
      rows: (table.refineCore.tableQuery.data?.data ?? []).map((record) => ({
        id: record.id,
        nickname: record.nickname,
        username: record.username,
        email: record.email,
        phone: record.phone,
        roles: record.roles?.map((role) => ({
          name: role.name,
          title: getRoleLabel(role),
        })),
        createdAt: record.createdAt,
      })),
    }),
  });

  return (
    <ListView>
      <div ref={tableContext.ref}>
        <DataTable table={table} />
      </div>
    </ListView>
  );
};
