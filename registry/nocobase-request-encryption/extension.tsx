import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import { LockKeyhole } from "lucide-react";

import { RequestEncryptionProvider } from "./provider";

const extension: AppExtension = {
  id: "nocobase-request-encryption",
  priority: 10,
  Provider: RequestEncryptionProvider,
  dev: {
    order: 260,
    resources: [
      {
        name: "request-encryption-demo",
        list: "request-encryption",
        meta: {
          label: "Request encoding",
          icon: <LockKeyhole />,
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: defineAppRoutes([
      {
        name: "development.request-encryption",
        path: "request-encryption",
        lazy: () => import("./demo"),
      },
    ]),
  },
};

export default extension;
