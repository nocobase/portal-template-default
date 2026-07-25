import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type AuthIntegrationPattern = "dynamic" | "method" | "page";

const patternLabels: Record<AuthIntegrationPattern, string> = {
  dynamic: "Use the default dynamic login",
  method: "Replace one authentication method",
  page: "Replace the complete login page",
};

export function AuthDemoPromptGenerator({
  value,
  onValueChange,
  patterns,
}: {
  value?: AuthIntegrationPattern;
  onValueChange?: (value: AuthIntegrationPattern) => void;
  patterns?: AuthIntegrationPattern[];
}) {
  const [localPattern, setLocalPattern] = useState<AuthIntegrationPattern>(
    value ?? patterns?.[0] ?? "method"
  );
  const [copied, setCopied] = useState(false);
  const pattern = value ?? localPattern;
  const availablePatterns = patterns ??
    (Object.keys(patternLabels) as AuthIntegrationPattern[]);
  const setPattern = (next: AuthIntegrationPattern) => {
    setLocalPattern(next);
    onValueChange?.(next);
  };
  const prompt = useMemo(() => {
    if (pattern === "method") {
      return "Customize the Starter login page by replacing only one configured authenticator. Keep the default dynamic authenticator discovery and default UI for every other method. Reuse that Registry's headless sign-in hook so token callbacks, the X-Authenticator header, logout, and redirect behavior remain unchanged.";
    }
    if (pattern === "page") {
      return "Create a fully custom login page for this Starter. Preserve the built-in authentication runtime, callback token capture, current authenticator storage, X-Authenticator request header, role reset, and SSO logout redirect. Keep installed authentication hooks available to the custom page.";
    }
    return "Keep the Starter's default dynamic login page unchanged.";
  }, [pattern]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prompt generator</CardTitle>
        <CardDescription>
          Generate an implementation prompt for an application-owned login UI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Integration pattern</Label>
          <Select
            value={pattern}
            onValueChange={(next) =>
              setPattern(next as AuthIntegrationPattern)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue>{patternLabels[pattern]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availablePatterns.map((key) => (
                <SelectItem key={key} value={key}>
                  {patternLabels[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea
          value={prompt}
          readOnly
          className="min-h-36 font-mono text-xs"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void navigator.clipboard.writeText(prompt).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1_500);
            });
          }}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy prompt"}
        </Button>
      </CardContent>
    </Card>
  );
}
