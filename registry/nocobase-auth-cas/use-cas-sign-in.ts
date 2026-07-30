import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

import type { Authenticator } from "@/components/auth/types";
import { nocobaseClient } from "@/lib/nocobase/client";
import { resolvePortalUrl } from "@/providers/runtime-config";

export function useCasSignIn(authenticator: Authenticator) {
  const [searchParams] = useSearchParams();
  const callbackError = useMemo(() => {
    if (searchParams.get("authenticator") !== authenticator.name) {
      return undefined;
    }
    const message = searchParams.get("error");
    return message ? new Error(message) : undefined;
  }, [authenticator.name, searchParams]);

  const signIn = useCallback(() => {
    const redirect = resolvePortalUrl(
      searchParams.get("to") || searchParams.get("redirect") || "/"
    );
    const url = nocobaseClient.buildUrl("cas:login", {
      authenticator: authenticator.name,
      __appName: nocobaseClient.getAppName(),
      redirect,
    });
    window.location.replace(url.toString());
  }, [authenticator.name, searchParams]);

  return { signIn, error: callbackError };
}
