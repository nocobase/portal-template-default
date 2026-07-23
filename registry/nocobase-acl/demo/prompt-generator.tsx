import { Check, Copy, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type AclPromptGeneratorConfig = {
  title: string;
  description: string;
  defaultScene: string;
  defaultTarget: string;
  requirements: string;
};

export function AclScenarioPromptGenerator({
  config,
}: {
  config: AclPromptGeneratorConfig;
}) {
  const [scene, setScene] = useState(config.defaultScene);
  const [target, setTarget] = useState(config.defaultTarget);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const prompt = useMemo(
    () => `Build a complete NocoBase ACL scene in the Refine Starter.

Business scene
- Page or feature: ${scene}
- Permission target: ${target}
- Use realistic fixed sample content so the permission behavior is visible immediately.
- Build the complete page section and user flow, not an isolated ACL snippet.

ACL scenario
${config.requirements}

Implementation contract
- Use the Starter's built-in NocoBase accessControlProvider and ACL store.
- NocoBase roles:check is the source of truth. Do not create a second permission store or hard-code role names.
- Keep backend ACL enforcement in place; frontend checks only control presentation and navigation.
- Import reusable components from the installed local entry point at @/extensions/nocobase-acl when page composition is needed.
- Resource actions use Refine names: list, show, create, edit, delete. Let the Starter map them to NocoBase list/get/create/update/destroy.
- Preserve dataSourceKey when the collection belongs to a non-main data source.
- Show an understandable forbidden or hidden state where appropriate.
- Deliver complete React component code, resource metadata, route integration, and the visible sample UI.`,
    [config.requirements, scene, target]
  );

  return (
    <details className="group rounded-xl border bg-muted/15">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium marker:hidden">
        <Sparkles className="size-4 text-primary" />
        Prompt generator
        <span className="ml-auto text-xs font-normal text-muted-foreground">
          {config.title}
        </span>
      </summary>
      <div className="grid gap-4 border-t p-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <p className="text-xs leading-5 text-muted-foreground">
            {config.description}
          </p>
          <div className="space-y-2">
            <Label htmlFor={`${config.title}-scene`}>Business scene</Label>
            <Input
              id={`${config.title}-scene`}
              value={scene}
              onChange={(event) => setScene(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${config.title}-target`}>Permission target</Label>
            <Textarea
              id={`${config.title}-target`}
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              className="min-h-24"
            />
          </div>
        </div>
        <div className="min-w-0 overflow-hidden rounded-lg border bg-background">
          <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
            <span className="text-xs font-medium">Generated prompt</span>
            <Button
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(prompt);
                  setCopyError(false);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                } catch {
                  setCopyError(true);
                }
              }}
            >
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy prompt"}
            </Button>
          </div>
          {copyError ? (
            <p className="border-b px-3 py-2 text-xs text-destructive">
              Clipboard access failed. Select the prompt text and copy it manually.
            </p>
          ) : null}
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-5 text-muted-foreground">
            {prompt}
          </pre>
        </div>
      </div>
    </details>
  );
}
