import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import { History } from "lucide-react";

import "./locales";

const recordHistoryExtension: AppExtension = {
  id: "nocobase-record-history",
  dev: {
    resources: [
      {
        name: "record-history-demo",
        list: "record-history",
        meta: {
          label: "Record history",
          i18nKey: "navigation.title",
          i18nOptions: { ns: "nocobase-record-history" },
          icon: <History />,
          description: "Timeline for tracked NocoBase record changes.",
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: defineAppRoutes([{ name: "development.record-history", path: "record-history", lazy: () => import("./demo") }]),
  },
};

export default recordHistoryExtension;
