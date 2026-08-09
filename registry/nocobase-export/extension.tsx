import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import { Download } from "lucide-react";

import "./locales";

const extension: AppExtension = {
  id: "nocobase-export",
  dev: {
    order: 200,
    resources: [
      {
        name: "export-demo",
        list: "export",
        meta: {
          label: "Export",
          i18nKey: "action.export",
          i18nOptions: { ns: "nocobase-export" },
          icon: <Download />,
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: defineAppRoutes([
      {
        name: "development.export",
        path: "export",
        lazy: () => import("./demo"),
      },
    ]),
  },
};

export default extension;
