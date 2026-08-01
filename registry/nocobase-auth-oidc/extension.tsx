import { lazy } from "react";
import { LogIn } from "lucide-react";
import { Route } from "react-router";

import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { AuthDemoRoute } from "@/components/auth/demo";

const OidcSignInButton = lazy(() => import("./oidc-sign-in-button"));
const OidcAutoRedirectProvider = lazy(() => import("./auto-redirect-provider"));
const OidcAuthDemoPage = lazy(() =>
  import("./demo").then((module) => ({ default: module.OidcAuthDemoPage }))
);

const oidcAuthExtension: AppExtension = {
  id: "nocobase-auth-oidc",
  AuthRuntimeProvider: OidcAutoRedirectProvider,
  authRuntimePriority: 20,
  dev: {
    resources: [
      {
        name: "auth-oidc-demo",
        list: "auth/oidc",
        meta: {
          parent: "auth-components",
          label: "OIDC",
          icon: <LogIn />,
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: (
      <Route
        path="auth/oidc"
        element={
          <AuthDemoRoute>
            <OidcAuthDemoPage />
          </AuthDemoRoute>
        }
      />
    ),
  },
  authAdapters: [
    {
      authType: "OIDC",
      placement: "button",
      Component: OidcSignInButton,
    },
  ],
};

export default oidcAuthExtension;
