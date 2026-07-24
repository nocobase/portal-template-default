import { useTranslate } from "@refinedev/core";
import { Check, ChevronDown, Copy, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function I18nPromptGenerator() {
  const t = useTranslate();
  const [scene, setScene] = useState("A customer support workspace");
  const [languages, setLanguages] = useState("English and Simplified Chinese");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const prompt = useMemo(
    () => `Build a complete multilingual scene in the NocoBase Admin Starter.

Application scene
- Product or page: ${scene}
- Supported languages: ${languages}
- Translate the complete visible user flow, including empty, loading, validation, and error states.

Implementation contract
- Use the installed @/extensions/nocobase-i18n runtime and the application's translation and locale hooks.
- Put application-owned React messages in src/locales and register the app namespace through registerTranslationResources from @/lib/i18n.
- Keep each Registry component's messages in its own namespace and register them with registerLocaleResources().
- Do not place application messages inside src/extensions/nocobase-i18n/locales because installed Registry files may be refreshed independently.
- Use the reusable LanguageSwitcher when the page needs an explicit language control; the signed-in user menu already includes one.
- Keep Starter and Registry UI resources local. Use app:getLang only for registered dynamic server namespaces such as lm-collections.
- Let the shared NocoBase client send the selected locale through X-Locale.
- Preserve compatibility when server metadata contains exact {{t("...")}} expressions.
- Provide complete React components, locale resource files, route/resource integration, and realistic visible content.`,
    [languages, scene]
  );

  return (
    <details open className="group rounded-xl border bg-muted/15">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium marker:hidden">
        <Sparkles className="size-4 text-primary" />
        {t("demo.prompt.title", { ns: "nocobase-i18n" }, "Prompt generator")}
        <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid items-start gap-5 border-t p-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-base">
              {t(
                "demo.prompt.settings",
                { ns: "nocobase-i18n" },
                "Scene settings"
              )}
            </CardTitle>
            <CardDescription>
              {t(
                "demo.prompt.description",
                { ns: "nocobase-i18n" },
                "Describe a complete multilingual application scene and generate an implementation prompt."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 py-5">
            <div className="space-y-2">
              <Label htmlFor="i18n-prompt-scene">
                {t(
                  "demo.prompt.scene",
                  { ns: "nocobase-i18n" },
                  "Application scene"
                )}
              </Label>
              <Input
                id="i18n-prompt-scene"
                value={scene}
                onChange={(event) => setScene(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="i18n-prompt-languages">
                {t(
                  "demo.prompt.languages",
                  { ns: "nocobase-i18n" },
                  "Languages"
                )}
              </Label>
              <Textarea
                id="i18n-prompt-languages"
                value={languages}
                onChange={(event) => setLanguages(event.target.value)}
                className="min-h-24"
              />
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0 gap-0 overflow-hidden py-0">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <div className="text-sm font-medium">
                {t(
                  "demo.prompt.output",
                  { ns: "nocobase-i18n" },
                  "Generated prompt"
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {t(
                  "demo.prompt.outputDescription",
                  { ns: "nocobase-i18n" },
                  "Updates as you change the scene and language requirements."
                )}
              </div>
            </div>
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
              {copied
                ? t("demo.prompt.copied", { ns: "nocobase-i18n" }, "Copied")
                : t("demo.prompt.copy", { ns: "nocobase-i18n" }, "Copy prompt")}
            </Button>
          </div>
          {copyError ? (
            <p className="border-b px-4 py-2 text-xs text-destructive">
              {t(
                "demo.prompt.copyError",
                { ns: "nocobase-i18n" },
                "Clipboard access failed. Select the prompt and copy it manually."
              )}
            </p>
          ) : null}
          <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap bg-muted/25 p-5 font-mono text-xs leading-5 text-muted-foreground">
            {prompt}
          </pre>
        </Card>
      </div>
    </details>
  );
}
