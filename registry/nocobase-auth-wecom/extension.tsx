import { lazy } from "react";
import { Building2 } from "lucide-react";
import { Route } from "react-router";

import type { AppExtension } from "../../app/extension";
import { AuthDemoRoute } from "../../components/auth/demo";

const WecomSignInButton = lazy(() => import("./wecom-sign-in-button"));
const WecomAutoLoginProvider = lazy(() => import("./auto-login-provider"));
const WecomAuthDemoPage = lazy(() =>
  import("./demo").then((module) => ({ default: module.WecomAuthDemoPage }))
);

const wecomAuthExtension: AppExtension = {
  id: "nocobase-auth-wecom",
  AuthRuntimeProvider: WecomAutoLoginProvider,
  authRuntimePriority: 10,
  dev: {
    resources: [
      {
        name: "auth-wecom-demo",
        list: "auth/wecom",
        meta: {
          parent: "auth-components",
          label: "WeCom",
          icon: <Building2 />,
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: (
      <Route
        path="auth/wecom"
        element={
          <AuthDemoRoute>
            <WecomAuthDemoPage />
          </AuthDemoRoute>
        }
      />
    ),
  },
  authAdapters: [
    {
      authType: "wecom",
      placement: "button",
      Component: WecomSignInButton,
    },
  ],
};

export default wecomAuthExtension;
