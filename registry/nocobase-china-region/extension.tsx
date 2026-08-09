import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import { MapPin } from "lucide-react";

import "./locales";

const chinaRegionExtension: AppExtension = {
  id: "nocobase-china-region",
  dev: {
    resources: [
      {
        name: "china-region-demo",
        list: "china-region",
        meta: {
          label: "China region",
          i18nKey: "navigation.title",
          i18nOptions: { ns: "nocobase-china-region" },
          icon: <MapPin />,
          description: "China administrative division fields backed by chinaRegions:list.",
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: defineAppRoutes([
      { name: "development.china-region", path: "china-region", lazy: () => import("./demo") },
    ]),
  },
};

export default chinaRegionExtension;
