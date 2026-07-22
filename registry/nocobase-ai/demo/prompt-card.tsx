import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function PromptCard({
  title,
  description,
  prompt,
}: {
  title: string;
  description: string;
  prompt: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
        <Button
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy prompt"}
        </Button>
      </div>
      <pre className="max-h-[620px] overflow-auto whitespace-pre-wrap bg-muted/25 p-5 font-mono text-xs leading-5 text-muted-foreground">
        {prompt}
      </pre>
    </Card>
  );
}
