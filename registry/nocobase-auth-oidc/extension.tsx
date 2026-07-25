import { lazy } from "react";

import type { AppExtension } from "@/app/extension";

const OidcSignInButton = lazy(() => import("./oidc-sign-in-button"));
const OidcAutoRedirectProvider = lazy(
  () => import("./auto-redirect-provider")
);

const oidcAuthExtension: AppExtension = {
  id: "nocobase-auth-oidc",
  AuthRuntimeProvider: OidcAutoRedirectProvider,
  authRuntimePriority: 20,
  authAdapters: [
    {
      authType: "OIDC",
      placement: "button",
      Component: OidcSignInButton,
    },
  ],
};

export default oidcAuthExtension;
