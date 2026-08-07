import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import { BarChart3 } from "lucide-react";

import "./locales";

const dataVisualizationExtension: AppExtension = {
  id: "nocobase-data-visualization",
  dev: {
    resources: [
      {
        name: "data-visualization-demo",
        list: "data-visualization",
        meta: {
          label: "Data visualization",
          i18nKey: "navigation.title",
          i18nOptions: { ns: "nocobase-data-visualization" },
          icon: <BarChart3 />,
          description: "Charts backed by the NocoBase aggregation API.",
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: defineAppRoutes([
      {
        name: "development.data-visualization",
        path: "data-visualization",
        lazy: () => import("./demo"),
      },
    ]),
  },
};

export default dataVisualizationExtension;
