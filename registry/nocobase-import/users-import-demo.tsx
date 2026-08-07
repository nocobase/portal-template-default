import { useList } from "@refinedev/core";
import { Database, PlugZap } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
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

import { useImportTranslation } from "./i18n";

type UserRecord = {
  id: string | number;
  nickname?: string;
  username?: string;
  email?: string;
  phone?: string;
};

export type UsersImportDemoProps = {
  badge: ReactNode;
  title: string;
  description: string;
  requirement: string;
  renderAction: (refresh: () => Promise<void>) => ReactNode;
};

export function UsersImportDemo({
  badge,
  title,
  description,
  requirement,
  renderAction,
}: UsersImportDemoProps) {
  const t = useImportTranslation();
  const { result, query } = useList<UserRecord>({
    resource: "users",
    pagination: { mode: "server", currentPage: 1, pageSize: 8 },
    sorters: [{ field: "createdAt", order: "desc" }],
    errorNotification: false,
    queryOptions: { retry: false },
  });
  const refresh = async () => {
    await query.refetch();
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{badge}</Badge>
          <Badge variant="outline">main / users</Badge>
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-3xl text-muted-foreground">{description}</p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Database />
              </span>
              <div className="space-y-1">
                <CardTitle>{t("demo.users", "Users")}</CardTitle>
                <CardDescription>
                  {t(
                    "demo.usersDescription",
                    "The list refreshes after a synchronous import completes."
                  )}
                </CardDescription>
              </div>
            </div>
            {renderAction(refresh)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("field.nickname", "Nickname")}</TableHead>
                  <TableHead>{t("field.username", "Username")}</TableHead>
                  <TableHead>{t("field.email", "Email")}</TableHead>
                  <TableHead>{t("field.phone", "Phone")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      {t("demo.loading", "Loading users...")}
                    </TableCell>
                  </TableRow>
                ) : result.data.length ? (
                  result.data.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.nickname || "-"}</TableCell>
                      <TableCell>{user.username || "-"}</TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>{user.phone || "-"}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      {t("demo.empty", "No users found.")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <PlugZap className="mt-0.5 size-4 shrink-0" />
            <p>{requirement}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
