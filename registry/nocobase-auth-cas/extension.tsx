import { lazy } from "react";
import { KeyRound } from "lucide-react";
import { Route } from "react-router";

import type { AppExtension } from "../../app/extension";
import { AuthDemoRoute } from "../../components/auth/demo";

const CasSignInButton = lazy(() => import("./cas-sign-in-button"));
const CasAuthDemoPage = lazy(() =>
  import("./demo").then((module) => ({ default: module.CasAuthDemoPage }))
);

const casAuthExtension: AppExtension = {
  id: "nocobase-auth-cas",
  dev: {
    resources: [
      {
        name: "auth-cas-demo",
        list: "auth/cas",
        meta: {
          parent: "auth-components",
          label: "CAS",
          icon: <KeyRound />,
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: (
      <Route
        path="auth/cas"
        element={
          <AuthDemoRoute>
            <CasAuthDemoPage />
          </AuthDemoRoute>
        }
      />
    ),
  },
  authAdapters: [
    {
      authType: "CAS",
      placement: "button",
      Component: CasSignInButton,
    },
  ],
};

export default casAuthExtension;
