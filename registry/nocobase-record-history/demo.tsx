import { History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { useRecordHistoryTranslation } from "./i18n";
import { RecordHistoryTimeline } from "./record-history-timeline";
import type { RecordHistory } from "./types";

const demoHistory: RecordHistory[] = [
  {
    uuid: "portal-demo-user-updated",
    requestId: "portal-demo-request-2",
    recordId: "2",
    collectionName: "users",
    dataSourceKey: "main",
    action: "update",
    createdAt: "2026-08-09T06:18:00.000Z",
    user: { id: 1, nickname: "Administrator", username: "admin" },
    recordFieldHistory: [
      { fieldPath: "nickname", before: "Alex", after: "Alex Chen" },
      { fieldPath: "email", before: "alex@example.test", after: "alex.chen@example.test" },
    ],
  },
  {
    uuid: "portal-demo-user-created",
    requestId: "portal-demo-request-1",
    recordId: "2",
    collectionName: "users",
    dataSourceKey: "main",
    action: "create",
    createdAt: "2026-08-09T05:42:00.000Z",
    user: { id: 1, nickname: "Administrator", username: "admin" },
    recordFieldHistory: [
      { fieldPath: "nickname", before: null, after: "Alex" },
      { fieldPath: "username", before: null, after: "alex" },
      { fieldPath: "email", before: null, after: "alex@example.test" },
    ],
  },
];

export default function RecordHistoryDemoPage() {
  const t = useRecordHistoryTranslation();
  return (
    <div className="space-y-6 pb-12">
      <header className="space-y-2">
        <Badge variant="secondary">
          <History />
          {t("navigation.title", "Record history")}
        </Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{t("demo.title", "Record history")}</h1>
        <p className="max-w-3xl text-muted-foreground">
          {t("demo.description", "Review create, update, and delete history captured for user records.")}
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>{t("demo.title", "Record history")}</CardTitle>
          <CardDescription>main.users · recordHistories:list</CardDescription>
        </CardHeader>
        <CardContent>
          <RecordHistoryTimeline
            collectionName="users"
            fallbackRows={demoHistory}
            defaultExpanded
            fieldLabels={{ nickname: "Nickname", username: "Username", email: "Email", phone: "Phone" }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
