import { History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { useRecordHistoryTranslation } from "./i18n";
import { RecordHistoryTimeline } from "./record-history-timeline";

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
            fieldLabels={{ nickname: "Nickname", username: "Username", email: "Email", phone: "Phone" }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
