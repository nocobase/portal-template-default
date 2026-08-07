import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import { Bell } from "lucide-react";
import "./locales";

const nocobaseInAppMessageExtension: AppExtension = {
  id: "nocobase-in-app-message",
  dev: {
    resources: [
      {
        name: "in-app-message-demo",
        list: "in-app-message",
        meta: {
          label: "In-app messages",
          icon: <Bell />,
          description: "Composable notification bell and message inbox.",
        },
      },
    ],
    routes: defineAppRoutes([
      {
        name: "development.in-app-message",
        path: "in-app-message",
        lazy: () => import("./demo"),
      },
    ]),
  },
};

export default nocobaseInAppMessageExtension;
