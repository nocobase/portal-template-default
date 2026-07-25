import { useState } from "react";

import type { AuthenticatorComponentProps } from "@/components/auth/types";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useSmsSignIn } from "./use-sms-sign-in";

export default function SmsSignInForm({
  authenticator,
}: AuthenticatorComponentProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const sms = useSmsSignIn(authenticator);
  const autoSignup = authenticator.options?.autoSignup === true;

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void sms.signIn(phone, code);
      }}
    >
      {sms.error && (
        <Alert variant="destructive">
          <AlertTitle>SMS sign-in failed</AlertTitle>
          <AlertDescription>{sms.error.message}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor={`${authenticator.name}-phone`}>Phone</Label>
        <Input
          id={`${authenticator.name}-phone`}
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          autoComplete="tel"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${authenticator.name}-code`}>
          Verification code
        </Label>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <Input
            id={`${authenticator.name}-code`}
            inputMode="numeric"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="one-time-code"
            required
          />
          <Button
            type="button"
            variant="outline"
            disabled={sms.isSendingCode || sms.retryAfter > 0 || !phone}
            onClick={() => void sms.sendCode(phone).catch(() => undefined)}
          >
            {sms.isSendingCode
              ? "Sending…"
              : sms.retryAfter > 0
                ? `Retry in ${sms.retryAfter}s`
                : "Send code"}
          </Button>
        </div>
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={sms.isSigningIn}
      >
        {sms.isSigningIn ? "Signing in…" : "Sign in"}
      </Button>
      {autoSignup && (
        <p className="text-xs leading-5 text-muted-foreground">
          An account will be created automatically if this phone number is new.
        </p>
      )}
    </form>
  );
}
