import { lazy } from "react";

import type { AppExtension } from "@/app/extension";

const WecomSignInButton = lazy(() => import("./wecom-sign-in-button"));
const WecomAutoLoginProvider = lazy(() => import("./auto-login-provider"));

const wecomAuthExtension: AppExtension = {
  id: "nocobase-auth-wecom",
  AuthRuntimeProvider: WecomAutoLoginProvider,
  authRuntimePriority: 10,
  authAdapters: [
    {
      authType: "wecom",
      placement: "button",
      Component: WecomSignInButton,
    },
  ],
};

export default wecomAuthExtension;
