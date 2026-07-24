import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/app-shell/loading-state";
import { useAI } from "../providers";
import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

export function AIConfigurationGate({ children }: { children: ReactNode }) {
  const {
    configurationStatus,
    configurationError,
    modelConfigurationError,
    hasEnabledModels,
  } = useAI();

  if (configurationStatus === "ready" && hasEnabledModels) return children;

  const loading = configurationStatus === "loading";
  const error = configurationError ?? modelConfigurationError;

  if (loading) return <LoadingState className="min-h-80" />;

  return (
    <div className="space-y-6 pb-12">
      <section className="border-b pb-8">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">AI Components</Badge>
          <Badge variant="outline">Live API</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em]">
          NocoBase AI
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Conversations use the AI employees and enabled models configured in
          the connected NocoBase application.
        </p>
      </section>

      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>NocoBase AI is not available</AlertTitle>
        <AlertDescription>
          {error?.message ??
            "Check the NocoBase connection and the AI employees available to the current user."}
        </AlertDescription>
      </Alert>
    </div>
  );
}
