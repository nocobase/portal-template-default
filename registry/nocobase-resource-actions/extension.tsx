import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import { ListChecks } from "lucide-react";

import "./locales";

const resourceActionsExtension: AppExtension = {
  id: "nocobase-resource-actions",
  dev: {
    resources: [
      {
        name: "resource-actions-demo",
        list: "resource-actions",
        meta: {
          label: "Resource actions",
          i18nKey: "demo.navigation",
          i18nOptions: { ns: "nocobase-resource-actions" },
          icon: <ListChecks />,
          description: "Reusable bulk edit, bulk update, and duplicate actions.",
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: defineAppRoutes([
      {
        name: "development.resource-actions",
        path: "resource-actions",
        lazy: () => import("./demo"),
      },
    ]),
  },
};

export default resourceActionsExtension;
