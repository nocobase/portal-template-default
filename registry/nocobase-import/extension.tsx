import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import { FileUp } from "lucide-react";

import "./locales";

const importExtension: AppExtension = {
  id: "nocobase-import",
  dev: {
    resources: [
      {
        name: "import-demo",
        list: "import",
        meta: {
          label: "Import",
          i18nKey: "action.import",
          i18nOptions: { ns: "nocobase-import" },
          icon: <FileUp />,
          description: "Import records with a server-generated XLSX template.",
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: defineAppRoutes([
      {
        name: "development.import",
        path: "import",
        lazy: () => import("./demo"),
      },
    ]),
  },
};

export default importExtension;
