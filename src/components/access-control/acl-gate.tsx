import { useTranslate } from "@refinedev/core";
import { RotateCcw } from "lucide-react";
import type { PropsWithChildren } from "react";
import { useAclState, useAclStore } from "@nocobase/portal-sdk/acl";

import { RoleSwitcher } from "@/extensions/nocobase-acl";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/app-shell/loading-state";
import { AccessDenied } from "./access-denied";

export function AclGate({ children }: PropsWithChildren) {
  const translate = useTranslate();
  const store = useAclStore();
  const state = useAclState();

  if (state.status === "ready") return children;

  if (state.status === "error") {
    if (state.portalAccessDenied) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="w-full max-w-lg text-center">
            <p className="text-6xl font-semibold tracking-tight text-foreground">
              403
            </p>
            <AccessDenied
              className="mt-5 min-h-0 border-0 bg-transparent p-0"
              title={translate(
                "acl.portalAccessDenied.title",
                "You do not have access to this Portal"
              )}
              description={translate(
                "acl.portalAccessDenied.description",
                "Your current role cannot access this Portal. Select another role to try again."
              )}
            />
            <RoleSwitcher
              className="mx-auto mt-6 max-w-xs text-left"
              showWhenUnavailable
            />
          </div>
        </main>
      );
    }

    const errorMessage = state.error.message.trim();
    const description =
      errorMessage && errorMessage !== "Unable to load permissions"
        ? errorMessage
        : translate(
            "acl.permissionsLoad.description",
            "Permissions for the current role could not be loaded."
          );

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">
            {translate(
              "acl.permissionsLoad.title",
              "Unable to load permissions"
            )}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          <Button
            className="mt-5"
            variant="outline"
            onClick={() => store.retry()}
          >
            <RotateCcw />
            {translate("acl.permissionsLoad.retry", "Retry")}
          </Button>
        </div>
      </div>
    );
  }

  return <LoadingState className="min-h-screen bg-background" />;
}
