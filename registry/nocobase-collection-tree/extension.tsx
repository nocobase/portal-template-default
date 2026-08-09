import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import { Network } from "lucide-react";

const extension: AppExtension = {
  id: "nocobase-collection-tree",
  dev: {
    order: 210,
    resources: [
      {
        name: "collection-tree-demo",
        list: "collection-tree",
        meta: {
          label: "Collection tree",
          icon: <Network />,
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: defineAppRoutes([
      {
        name: "development.collection-tree",
        path: "collection-tree",
        lazy: () => import("./demo"),
      },
    ]),
  },
};

export default extension;
