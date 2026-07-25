import { LogIn } from "lucide-react";

import type { AuthenticatorComponentProps } from "@/components/auth/types";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { resolveTranslatableText } from "@/lib/i18n";

import { useOidcSignIn } from "./use-oidc-sign-in";

export default function OidcSignInButton({
  authenticator,
}: AuthenticatorComponentProps) {
  const { signIn, isPending, error } = useOidcSignIn(authenticator);

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>OIDC sign-in failed</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isPending}
        onClick={signIn}
      >
        <LogIn />
        {isPending
          ? "Redirecting…"
          : resolveTranslatableText(
              authenticator.title || authenticator.authTypeTitle || "OIDC"
            )}
      </Button>
    </div>
  );
}
