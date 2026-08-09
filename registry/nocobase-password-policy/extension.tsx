import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import { ShieldCheck } from "lucide-react";

const extension: AppExtension = {
  id: "nocobase-password-policy",
  dev: {
    order: 250,
    resources: [
      {
        name: "password-policy-demo",
        list: "password-policy",
        meta: {
          label: "Password policy",
          icon: <ShieldCheck />,
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: defineAppRoutes([
      {
        name: "development.password-policy",
        path: "password-policy",
        lazy: () => import("./demo"),
      },
    ]),
  },
};

export default extension;
