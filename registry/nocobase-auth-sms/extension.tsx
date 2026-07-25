import { lazy } from "react";

import type { AppExtension } from "@/app/extension";

const SmsSignInForm = lazy(() => import("./sms-sign-in-form"));

const smsAuthExtension: AppExtension = {
  id: "nocobase-auth-sms",
  authAdapters: [
    {
      authType: "SMS",
      placement: "form",
      Component: SmsSignInForm,
    },
  ],
};

export default smsAuthExtension;
