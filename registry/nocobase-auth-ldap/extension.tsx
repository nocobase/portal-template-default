import { lazy } from "react";
import { ContactRound } from "lucide-react";
import { Route } from "react-router";

import type { AppExtension } from "../../app/extension";
import { AuthDemoRoute } from "../../components/auth/demo";

const LdapSignInForm = lazy(() => import("./ldap-sign-in-form"));
const LdapAuthDemoPage = lazy(() =>
  import("./demo").then((module) => ({ default: module.LdapAuthDemoPage }))
);

const ldapAuthExtension: AppExtension = {
  id: "nocobase-auth-ldap",
  dev: {
    resources: [
      {
        name: "auth-ldap-demo",
        list: "auth/ldap",
        meta: {
          parent: "auth-components",
          label: "LDAP",
          icon: <ContactRound />,
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: (
      <Route
        path="auth/ldap"
        element={
          <AuthDemoRoute>
            <LdapAuthDemoPage />
          </AuthDemoRoute>
        }
      />
    ),
  },
  authAdapters: [
    {
      authType: "LDAP",
      placement: "form",
      Component: LdapSignInForm,
    },
  ],
};

export default ldapAuthExtension;
