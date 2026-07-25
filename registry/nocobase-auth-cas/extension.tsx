import { lazy } from "react";

import type { AppExtension } from "@/app/extension";

const CasSignInButton = lazy(() => import("./cas-sign-in-button"));

const casAuthExtension: AppExtension = {
  id: "nocobase-auth-cas",
  authAdapters: [
    {
      authType: "CAS",
      placement: "button",
      Component: CasSignInButton,
    },
  ],
};

export default casAuthExtension;
