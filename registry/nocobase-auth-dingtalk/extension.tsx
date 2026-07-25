import { lazy } from "react";

import type { AppExtension } from "@/app/extension";

const DingtalkSignInButton = lazy(
  () => import("./dingtalk-sign-in-button")
);
const DingtalkAutoLoginProvider = lazy(
  () => import("./auto-login-provider")
);

const dingtalkAuthExtension: AppExtension = {
  id: "nocobase-auth-dingtalk",
  AuthRuntimeProvider: DingtalkAutoLoginProvider,
  authRuntimePriority: 10,
  authAdapters: [
    {
      authType: "dingtalk",
      placement: "button",
      Component: DingtalkSignInButton,
    },
  ],
};

export default dingtalkAuthExtension;
