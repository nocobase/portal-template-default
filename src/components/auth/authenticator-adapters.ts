import { extensionAuthAdapters } from "@/app/extensions";
import { BasicSignInForm } from "@/components/auth/basic-sign-in-form";
import type { AuthenticatorAdapter } from "@/components/auth/types";

const coreAuthAdapters: AuthenticatorAdapter[] = [
  {
    authType: "Email/Password",
    placement: "form",
    Component: BasicSignInForm,
  },
];

export const authenticatorAdapters = [
  ...coreAuthAdapters,
  ...extensionAuthAdapters,
];

export const authenticatorAdapterMap = new Map(
  authenticatorAdapters.map((adapter) => [adapter.authType, adapter])
);
