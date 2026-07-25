import { Building2 } from "lucide-react";

import type { AuthenticatorComponentProps } from "@/components/auth/types";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { resolveTranslatableText } from "@/lib/i18n";

import { useWecomSignIn } from "./use-wecom-sign-in";

function plainText(value: unknown) {
  return typeof value === "string"
    ? value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    : "";
}

export default function WecomSignInButton({
  authenticator,
}: AuthenticatorComponentProps) {
  const { signIn, isPending, error } = useWecomSignIn(authenticator);
  const tooltip = plainText(authenticator.options?.btnTooltip);
  const button = (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={isPending}
      onClick={signIn}
    >
      <Building2 />
      {isPending
        ? "Redirecting…"
        : resolveTranslatableText(
            authenticator.title ||
              authenticator.authTypeTitle ||
              "Sign in via WeCom"
          )}
    </Button>
  );

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>WeCom sign-in failed</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger render={button} />
          <TooltipContent side="right" className="max-w-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
    </div>
  );
}
