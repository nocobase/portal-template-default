import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import { MapPinned } from "lucide-react";

import "./locales";

const mapExtension: AppExtension = {
  id: "nocobase-map",
  dev: {
    resources: [
      {
        name: "map-demo",
        list: "map",
        meta: {
          label: "Map",
          i18nKey: "navigation.title",
          i18nOptions: { ns: "nocobase-map" },
          icon: <MapPinned />,
          description: "AMap and Google Maps rendering for NocoBase geometry values.",
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: defineAppRoutes([{ name: "development.map", path: "map", lazy: () => import("./demo") }]),
  },
};

export default mapExtension;
