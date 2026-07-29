import { useAuthenticatorSignIn } from "@/components/auth";

export function useLdapSignIn(authenticator: string) {
  return useAuthenticatorSignIn(authenticator);
}
