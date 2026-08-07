import { useList } from "@refinedev/core";
import { Eye, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { TemplatePrintButton } from "./template-print-button";
import type {
  PrintingTemplate,
  TemplatePrintRecordKey,
  TemplatePrintResult,
} from "./types";

const DATA_SOURCE_KEY = "main";
const COLLECTION_NAME = "users";
const USER_LIST_TEMPLATE = "users-directory";
const USER_DETAIL_TEMPLATE = "user-profile";

type UserRecord = {
  id: TemplatePrintRecordKey;
  nickname?: string;
  username?: string;
  email?: string;
  phone?: string;
  roles?: Array<{ name: string; title?: string }>;
  createdAt?: string;
};

function getUserName(user: UserRecord) {
  return user.nickname || user.username || user.email || `User #${user.id}`;
}

function getUserInitials(user: UserRecord) {
  return getUserName(user)
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function DetailItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{value || "-"}</dd>
    </div>
  );
}

export function TemplatePrintDemoPage() {
  const [selectedUserIds, setSelectedUserIds] = useState<
    TemplatePrintRecordKey[]
  >([]);
  const [detailUserId, setDetailUserId] = useState<TemplatePrintRecordKey>();
  const { result: usersResult, query: usersQuery } = useList<UserRecord>({
    resource: COLLECTION_NAME,
    pagination: { mode: "server", currentPage: 1, pageSize: 8 },
    sorters: [{ field: "createdAt", order: "desc" }],
    meta: { appends: ["roles"] },
    errorNotification: false,
    queryOptions: { retry: false },
  });
  const users = usersResult.data;
  const selectedUserIdSet = useMemo(
    () => new Set(selectedUserIds),
    [selectedUserIds]
  );
  const detailUser =
    users.find((user) => user.id === detailUserId) || users[0];
  const allVisibleUsersSelected =
    users.length > 0 && users.every((user) => selectedUserIdSet.has(user.id));

  const onError = (error: Error) => toast.error(error.message);
  const onPrinted = (
    _: TemplatePrintResult,
    template: PrintingTemplate
  ) => toast.success(`Generated with ${template.title}`);

  const toggleUser = (userId: TemplatePrintRecordKey, checked: boolean) => {
    setSelectedUserIds((current) =>
      checked
        ? current.includes(userId)
          ? current
          : [...current, userId]
        : current.filter((id) => id !== userId)
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
            Template print
          </h1>
          <Badge variant="outline">main / users</Badge>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Print selected users from a table toolbar or print the current user
          from the bottom of a detail block. Each location demonstrates a
          preconfigured template and a template selected when clicked.
        </p>
      </header>

      <section aria-labelledby="template-print-users-table">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="size-5" />
              </span>
              <div className="space-y-1">
                <CardTitle id="template-print-users-table">Users</CardTitle>
                <CardDescription>
                  Select one or more users, then print from the table toolbar.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
              <p className="text-sm text-muted-foreground">
                {selectedUserIds.length
                  ? `${selectedUserIds.length} selected`
                  : "Select users to enable list printing"}
              </p>
              <div className="flex flex-wrap gap-2">
                <TemplatePrintButton
                  collectionName={COLLECTION_NAME}
                  dataSourceKey={DATA_SOURCE_KEY}
                  templateName={USER_LIST_TEMPLATE}
                  templateTitle="Users directory"
                  selection={{
                    type: "selected",
                    recordKeys: selectedUserIds,
                  }}
                  label="Print selected"
                  disabled={!selectedUserIds.length}
                  onError={onError}
                  onPrinted={onPrinted}
                />
                <TemplatePrintButton
                  collectionName={COLLECTION_NAME}
                  dataSourceKey={DATA_SOURCE_KEY}
                  selection={{
                    type: "selected",
                    recordKeys: selectedUserIds,
                  }}
                  label="Choose list template"
                  variant="outline"
                  disabled={!selectedUserIds.length}
                  messages={{ selectTemplate: "Choose a list template" }}
                  onError={onError}
                  onPrinted={onPrinted}
                />
                <TemplatePrintButton
                  collectionName={COLLECTION_NAME}
                  dataSourceKey={DATA_SOURCE_KEY}
                  templateName={USER_LIST_TEMPLATE}
                  templateTitle="Users directory"
                  selection={{
                    type: "selected",
                    recordKeys: selectedUserIds,
                  }}
                  convertedToPDF
                  label="Print selected PDF"
                  variant="outline"
                  disabled={!selectedUserIds.length}
                  onError={onError}
                  onPrinted={onPrinted}
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allVisibleUsersSelected}
                        onCheckedChange={(checked) =>
                          setSelectedUserIds(
                            checked ? users.map((user) => user.id) : []
                          )
                        }
                        aria-label="Select all visible users"
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead className="w-36 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersQuery.isLoading
                    ? Array.from({ length: 4 }, (_, index) => (
                        <TableRow key={index}>
                          <TableCell colSpan={5}>
                            <Skeleton className="h-8 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    : users.map((user) => (
                        <TableRow
                          key={user.id}
                          data-state={
                            detailUser?.id === user.id ? "selected" : undefined
                          }
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedUserIdSet.has(user.id)}
                              onCheckedChange={(checked) =>
                                toggleUser(user.id, Boolean(checked))
                              }
                              aria-label={`Select ${getUserName(user)}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar size="sm">
                                <AvatarFallback>
                                  {getUserInitials(user)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate font-medium">
                                  {getUserName(user)}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {user.username || `ID: ${user.id}`}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.email || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex max-w-60 flex-wrap gap-1">
                              {user.roles?.length ? (
                                user.roles.map((role) => (
                                  <Badge key={role.name} variant="secondary">
                                    {role.title || role.name}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setDetailUserId(user.id)}
                            >
                              <Eye />
                              View details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  {!usersQuery.isLoading && !users.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {usersQuery.isError
                          ? "Unable to load users"
                          : "No users found"}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="template-print-user-detail">
        <Card>
          <CardHeader>
            <CardTitle id="template-print-user-detail">User details</CardTitle>
            <CardDescription>
              The print actions sit below the record detail block and always
              use the current user.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersQuery.isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-48" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : detailUser ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <Avatar size="lg">
                    <AvatarFallback>
                      {getUserInitials(detailUser)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{getUserName(detailUser)}</p>
                    <p className="text-sm text-muted-foreground">
                      User #{detailUser.id}
                    </p>
                  </div>
                </div>

                <dl className="grid gap-4 rounded-lg border bg-muted/10 p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <DetailItem label="Username" value={detailUser.username} />
                  <DetailItem label="Email" value={detailUser.email} />
                  <DetailItem label="Phone" value={detailUser.phone} />
                  <DetailItem
                    label="Created at"
                    value={
                      detailUser.createdAt
                        ? new Intl.DateTimeFormat(undefined, {
                            dateStyle: "medium",
                          }).format(new Date(detailUser.createdAt))
                        : undefined
                    }
                  />
                </dl>

                <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                  <TemplatePrintButton
                    collectionName={COLLECTION_NAME}
                    dataSourceKey={DATA_SOURCE_KEY}
                    templateName={USER_DETAIL_TEMPLATE}
                    templateTitle="User profile"
                    selection={{
                      type: "single",
                      filterByTk: detailUser.id,
                    }}
                    label="Print user"
                    onError={onError}
                    onPrinted={onPrinted}
                  />
                  <TemplatePrintButton
                    collectionName={COLLECTION_NAME}
                    dataSourceKey={DATA_SOURCE_KEY}
                    selection={{
                      type: "single",
                      filterByTk: detailUser.id,
                    }}
                    label="Choose detail template"
                    variant="outline"
                    messages={{ selectTemplate: "Choose a detail template" }}
                    onError={onError}
                    onPrinted={onPrinted}
                  />
                  <TemplatePrintButton
                    collectionName={COLLECTION_NAME}
                    dataSourceKey={DATA_SOURCE_KEY}
                    templateName={USER_DETAIL_TEMPLATE}
                    templateTitle="User profile"
                    selection={{
                      type: "single",
                      filterByTk: detailUser.id,
                    }}
                    convertedToPDF
                    label="Print user PDF"
                    variant="outline"
                    onError={onError}
                    onPrinted={onPrinted}
                  />
                </div>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Select a user from the table to view details.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
