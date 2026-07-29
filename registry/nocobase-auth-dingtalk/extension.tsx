import { lazy } from "react";
import { MessageSquare } from "lucide-react";
import { Route } from "react-router";

import type { AppExtension } from "../../app/extension";
import { AuthDemoRoute } from "../../components/auth/demo";

const DingtalkSignInButton = lazy(() => import("./dingtalk-sign-in-button"));
const DingtalkAutoLoginProvider = lazy(() => import("./auto-login-provider"));
const DingtalkAuthDemoPage = lazy(() =>
  import("./demo").then((module) => ({
    default: module.DingtalkAuthDemoPage,
  }))
);

const dingtalkAuthExtension: AppExtension = {
  id: "nocobase-auth-dingtalk",
  AuthRuntimeProvider: DingtalkAutoLoginProvider,
  authRuntimePriority: 10,
  dev: {
    resources: [
      {
        name: "auth-dingtalk-demo",
        list: "auth/dingtalk",
        meta: {
          parent: "auth-components",
          label: "DingTalk",
          icon: <MessageSquare />,
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: (
      <Route
        path="auth/dingtalk"
        element={
          <AuthDemoRoute>
            <DingtalkAuthDemoPage />
          </AuthDemoRoute>
        }
      />
    ),
  },
  authAdapters: [
    {
      authType: "dingtalk",
      placement: "button",
      Component: DingtalkSignInButton,
    },
  ],
};

export default dingtalkAuthExtension;
