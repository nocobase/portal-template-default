import { lazy } from "react";

import type { AppExtension } from "@/app/extension";

const SamlSignInButton = lazy(() => import("./saml-sign-in-button"));
const SamlAutoRedirectProvider = lazy(
  () => import("./auto-redirect-provider")
);

const samlAuthExtension: AppExtension = {
  id: "nocobase-auth-saml",
  AuthRuntimeProvider: SamlAutoRedirectProvider,
  authRuntimePriority: 20,
  authAdapters: [
    {
      authType: "SAML",
      placement: "button",
      Component: SamlSignInButton,
    },
  ],
};

export default samlAuthExtension;
