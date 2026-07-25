import { lazy } from "react";

import type { AppExtension } from "@/app/extension";

const LdapSignInForm = lazy(() => import("./ldap-sign-in-form"));

const ldapAuthExtension: AppExtension = {
  id: "nocobase-auth-ldap",
  authAdapters: [
    {
      authType: "LDAP",
      placement: "form",
      Component: LdapSignInForm,
    },
  ],
};

export default ldapAuthExtension;
