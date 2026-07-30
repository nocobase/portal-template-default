import { lazy } from "react";
import { BadgeCheck } from "lucide-react";
import { Route } from "react-router";

import type { AppExtension } from "@/app/extension";
import { AuthDemoRoute } from "@/components/auth/demo";

const SamlSignInButton = lazy(() => import("./saml-sign-in-button"));
const SamlAutoRedirectProvider = lazy(() => import("./auto-redirect-provider"));
const SamlAuthDemoPage = lazy(() =>
  import("./demo").then((module) => ({ default: module.SamlAuthDemoPage }))
);

const samlAuthExtension: AppExtension = {
  id: "nocobase-auth-saml",
  AuthRuntimeProvider: SamlAutoRedirectProvider,
  authRuntimePriority: 20,
  dev: {
    resources: [
      {
        name: "auth-saml-demo",
        list: "auth/saml",
        meta: {
          parent: "auth-components",
          label: "SAML",
          icon: <BadgeCheck />,
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: (
      <Route
        path="auth/saml"
        element={
          <AuthDemoRoute>
            <SamlAuthDemoPage />
          </AuthDemoRoute>
        }
      />
    ),
  },
  authAdapters: [
    {
      authType: "SAML",
      placement: "button",
      Component: SamlSignInButton,
    },
  ],
};

export default samlAuthExtension;
