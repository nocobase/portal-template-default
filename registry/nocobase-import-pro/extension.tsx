import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import { FileCog } from "lucide-react";

import "./locales";

const importProExtension: AppExtension = {
  id: "nocobase-import-pro",
  dev: {
    resources: [
      {
        name: "import-pro-demo",
        list: "import-pro",
        meta: {
          label: "Import Pro",
          i18nKey: "action.import",
          i18nOptions: { ns: "nocobase-import-pro" },
          icon: <FileCog />,
          description: "Async import, duplicate handling, and workflow options.",
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: defineAppRoutes([
      {
        name: "development.import-pro",
        path: "import-pro",
        lazy: () => import("./demo"),
      },
    ]),
  },
};

export default importProExtension;
