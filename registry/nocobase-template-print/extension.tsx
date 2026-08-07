import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import { Printer } from "lucide-react";

const templatePrintExtension: AppExtension = {
  id: "nocobase-template-print",
  dev: {
    resources: [
      {
        name: "template-print-demo",
        list: "template-print",
        meta: {
          label: "Template print",
          icon: <Printer />,
          description: "Generate documents with server-managed printing templates.",
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: defineAppRoutes([
      {
        name: "development.template-print",
        path: "template-print",
        lazy: () =>
          import("./demo").then((module) => ({
            default: module.TemplatePrintDemoPage,
          })),
      },
    ]),
  },
};

export default templatePrintExtension;
