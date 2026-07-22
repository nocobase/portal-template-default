import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAI } from "../providers";
import { CircleAlert, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

export function AIConversationModeToggle({
  className,
}: {
  className?: string;
}) {
  const { mode, setMode, configurationStatus, hasEnabledModels } = useAI();
  const mock = mode === "mock";

  return (
    <label
      className={cn(
        "flex shrink-0 cursor-pointer items-center gap-3 rounded-xl border bg-card px-3 py-2 shadow-sm",
        className
      )}
    >
      <span className="text-right">
        <span className="block text-xs font-medium">Mock conversation</span>
        <span className="block text-[11px] text-muted-foreground">
          {mock
            ? "Local responses · live configuration"
            : configurationStatus === "loading"
            ? "Connecting to NocoBase…"
            : hasEnabledModels
            ? "Using the live NocoBase API"
            : "Live API · no enabled model"}
        </span>
      </span>
      <Switch
        checked={mock}
        onCheckedChange={(checked) => setMode(checked ? "mock" : "nocobase")}
        aria-label="Enable mock conversation"
      />
    </label>
  );
}

export function AIConfigurationGate({ children }: { children: ReactNode }) {
  const { configurationStatus, configurationError } = useAI();

  if (configurationStatus === "ready") return children;

  const loading = configurationStatus === "loading";

  return (
    <div className="space-y-6 pb-12">
      <section className="flex flex-wrap items-start justify-between gap-5 border-b pb-8">
        <div>
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
        </div>
        <AIConversationModeToggle />
      </section>

      <Alert variant={loading ? "default" : "destructive"}>
        {loading ? <LoaderCircle className="animate-spin" /> : <CircleAlert />}
        <AlertTitle>
          {loading
            ? "Loading NocoBase AI configuration"
            : "NocoBase AI is not available"}
        </AlertTitle>
        <AlertDescription>
          {loading
            ? "Fetching the AI employees and enabled models available to the current user."
            : configurationError?.message ??
              "Check the NocoBase connection and the AI employees available to the current user."}
        </AlertDescription>
      </Alert>
    </div>
  );
}
