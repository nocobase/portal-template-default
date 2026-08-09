import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import { FilePenLine } from "lucide-react";

const extension: AppExtension = {
  id: "nocobase-markdown-vditor",
  dev: {
    order: 220,
    resources: [
      {
        name: "markdown-vditor-demo",
        list: "markdown-vditor",
        meta: {
          label: "Markdown Vditor",
          icon: <FilePenLine />,
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: defineAppRoutes([
      {
        name: "development.markdown-vditor",
        path: "markdown-vditor",
        lazy: () => import("./demo"),
      },
    ]),
  },
};

export default extension;
