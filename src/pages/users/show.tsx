import {
  useGetLocale,
  useResourceParams,
  useShow,
  useTranslate,
} from "@refinedev/core";

import { ShowView } from "@/components/resources/views/show-view";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAIPageElementHandle } from "@/extensions/nocobase-ai";
import { resolveTranslatableText } from "@/lib/i18n";
import type { UserRecord } from "./types";

export const UserShow = () => {
  const translate = useTranslate();
  const getLocale = useGetLocale();
  const locale = getLocale();
  const { id } = useResourceParams();
  const { result: record } = useShow<UserRecord>({
    meta: {
      appends: ["roles"],
    },
  });

  const displayName =
    record?.nickname ||
    record?.username ||
    record?.email ||
    translate("users.detail.unnamed", { ns: "app" }, "Unnamed user");
  const roleLabels =
    record?.roles?.map((role) =>
      resolveTranslatableText(role.title || role.name, { ns: "starter" })
    ) ?? [];
  const detailContext = useAIPageElementHandle({
    id: `users-detail-${id ?? "current"}`,
    title: `${translate(
      "users.ai.detail",
      { ns: "app" },
      "User details"
    )}: ${displayName}`,
    kind: "detail",
    getContext: () => ({
      resource: "users",
      record: {
        id: record?.id,
        nickname: record?.nickname,
        username: record?.username,
        email: record?.email,
        phone: record?.phone,
        roles: roleLabels,
        createdAt: record?.createdAt,
        updatedAt: record?.updatedAt,
      },
    }),
  });

  const formatDate = (value?: string) =>
    value
      ? new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(value))
      : "-";

  return (
    <ShowView title={displayName}>
      <Card ref={detailContext.ref} className="max-w-4xl">
        <CardHeader>
          <CardTitle>{displayName}</CardTitle>
          <CardDescription>ID: {record?.id ?? "-"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <DetailSection
            title={translate(
              "users.detail.identity",
              { ns: "app" },
              "Identity"
            )}
            items={[
              [
                translate("users.fields.nickname", { ns: "app" }, "Nickname"),
                record?.nickname || "-",
              ],
              [
                translate("users.fields.username", { ns: "app" }, "Username"),
                record?.username || "-",
              ],
            ]}
          />
          <Separator />
          <DetailSection
            title={translate("users.detail.contact", { ns: "app" }, "Contact")}
            items={[
              [
                translate("users.fields.email", { ns: "app" }, "Email"),
                record?.email || "-",
              ],
              [
                translate("users.fields.phone", { ns: "app" }, "Phone"),
                record?.phone || "-",
              ],
            ]}
          />
          <Separator />
          <section className="space-y-3">
            <h3 className="text-sm font-medium">
              {translate("users.detail.access", { ns: "app" }, "Access")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {roleLabels.length ? (
                roleLabels.map((role, index) => (
                  <Badge key={`${role}-${index}`} variant="secondary">
                    {role}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  {translate(
                    "users.detail.noRoles",
                    { ns: "app" },
                    "No assigned roles"
                  )}
                </span>
              )}
            </div>
          </section>
          <Separator />
          <DetailSection
            title={translate(
              "users.detail.timestamps",
              { ns: "app" },
              "Timestamps"
            )}
            items={[
              [
                translate(
                  "users.fields.createdAt",
                  { ns: "app" },
                  "Created at"
                ),
                formatDate(record?.createdAt),
              ],
              [
                translate(
                  "users.fields.updatedAt",
                  { ns: "app" },
                  "Updated at"
                ),
                formatDate(record?.updatedAt),
              ],
            ]}
          />
        </CardContent>
      </Card>
    </ShowView>
  );
};

function DetailSection({
  title,
  items,
}: {
  title: string;
  items: Array<[label: string, value: string | number]>;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">{title}</h3>
      <dl className="grid gap-4 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="space-y-1">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
