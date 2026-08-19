import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import { Users } from "lucide-react";

// Set this to false when the application no longer needs the example routes
// contributed by installed Registry extensions. Providers, adapters, and the
// development showcase under /dev remain available.
export const registryRoutesEnabled = true;

// Add application-owned business routes here. Installed Registry extensions
// contribute their own route definitions through the same runtime. Add a
// resource entry when a route should also appear in navigation.
export const appRoutes = defineAppRoutes([
  {
    name: "bff-test",
    path: "/bff-test",
    lazy: () => import("./pages/bff-test"),
    resource: {
      meta: {
        label: "Portal Data BFF",
        priority: 0,
        singularLabel: "Portal Data BFF",
        description: "Verify custom BFF APIs backed by ctx.portalData.",
        icon: <Users />,
      },
    },
  },
]);
