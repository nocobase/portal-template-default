import { Bell, Braces, PlugZap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useInAppMessageTranslation } from "./i18n";
import { InAppMessageWidget } from "./widget";

const usageExample = `import { InAppMessageWidget } from "@/extensions/nocobase-in-app-message";

export function Toolbar() {
  return <InAppMessageWidget />;
}`;

export default function InAppMessageDemoPage() {
  const t = useInAppMessageTranslation();

  return (
    <div className="space-y-6 pb-12">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {t("demo.badge", "Component example")}
          </Badge>
          <Badge variant="outline">in-app-message</Badge>
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {t("demo.title", "In-app message widget")}
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          {t(
            "demo.description",
            "Place the notification bell wherever the application needs it. The Registry item does not modify the application header automatically."
          )}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bell />
              </span>
              <div className="space-y-1">
                <CardTitle>{t("demo.preview.title", "Live preview")}</CardTitle>
                <CardDescription>
                  {t(
                    "demo.preview.description",
                    "This preview uses the connected NocoBase application's current-user notification resources."
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-32 items-center justify-between rounded-xl border bg-muted/30 px-5">
              <div className="space-y-1">
                <p className="font-medium">
                  {t("demo.preview.toolbar", "Application toolbar")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "demo.preview.hint",
                    "Open the bell to inspect channels and messages."
                  )}
                </p>
              </div>
              <InAppMessageWidget />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Braces />
              </span>
              <div className="space-y-1">
                <CardTitle>{t("demo.usage.title", "Compose it explicitly")}</CardTitle>
                <CardDescription>
                  {t(
                    "demo.usage.description",
                    "Import the widget from the installed extension and render it in an application-owned surface."
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="overflow-x-auto rounded-xl border bg-muted/40 p-4 text-xs leading-5">
              <code>{usageExample}</code>
            </pre>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <PlugZap className="mt-0.5 size-4 shrink-0" />
              <p>
                {t(
                  "demo.requirements",
                  "Requires the notification manager and in-app message plugins on the connected NocoBase application."
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
