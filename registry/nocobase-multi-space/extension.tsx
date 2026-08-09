import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import { Boxes } from "lucide-react";

import "./locales";
import { MultiSpaceProvider } from "./space-provider";
import { SpaceUserMenuItems } from "./space-switcher";

const extension: AppExtension = {
  id: "nocobase-multi-space",
  priority: 20,
  Provider: MultiSpaceProvider,
  UserMenuItems: SpaceUserMenuItems,
  dev: {
    order: 240,
    resources: [
      {
        name: "multi-space-demo",
        list: "multi-space",
        meta: {
          label: "Multi-space",
          i18nKey: "navigation.title",
          i18nOptions: { ns: "nocobase-multi-space" },
          icon: <Boxes />,
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: defineAppRoutes([
      {
        name: "development.multi-space",
        path: "multi-space",
        lazy: () => import("./demo"),
      },
    ]),
  },
};

export default extension;
