import { Boxes } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { useMultiSpaceTranslation } from "./i18n";
import { SpaceSwitcher } from "./space-switcher";
import { SpacesManager } from "./spaces-manager";

export default function MultiSpaceDemoPage() {
  const t = useMultiSpaceTranslation();

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              <Boxes /> {t("navigation.title", "Multi-space")}
            </Badge>
            <Badge variant="outline">
              {t("demo.badge", "Workspace isolation")}
            </Badge>
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {t("demo.title", "Workspace administration")}
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            {t(
              "demo.description",
              "Create spaces, manage their members, and switch the active request context."
            )}
          </p>
        </div>
        <SpaceSwitcher className="rounded-xl border bg-card p-4 shadow-sm" />
      </header>
      <section className="min-h-[40rem] [&>div]:min-h-[38rem] [&>div>div]:min-h-[38rem]">
        <SpacesManager />
      </section>
    </div>
  );
}
