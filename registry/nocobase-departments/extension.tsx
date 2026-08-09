import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import { Building2 } from "lucide-react";

const extension: AppExtension = {
  id: "nocobase-departments",
  dev: {
    order: 230,
    resources: [
      {
        name: "departments-demo",
        list: "departments",
        meta: {
          label: "Departments",
          icon: <Building2 />,
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: defineAppRoutes([
      {
        name: "development.departments",
        path: "departments",
        lazy: () => import("./demo"),
      },
    ]),
  },
};

export default extension;
