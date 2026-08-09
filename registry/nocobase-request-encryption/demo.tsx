import { Braces, LockKeyhole } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base64EncodeUnicode, decodeRequestQuery } from "./request-encoding";

export default function RequestEncryptionDemoPage() {
  const [filter, setFilter] = useState('{\n  "status": { "$eq": "active" },\n  "keyword": "客户"\n}');
  const result = useMemo(() => {
    try {
      const query = JSON.parse(filter);
      const encoded = base64EncodeUnicode(JSON.stringify(query));
      return { encoded, decoded: JSON.stringify(decodeRequestQuery(encoded), null, 2) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }, [filter]);

  return (
    <div className="space-y-6 pb-12">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary"><LockKeyhole /> Request middleware</Badge>
          <Badge variant="outline">__encoded__</Badge>
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Encoded query parameters</h1>
        <p className="max-w-3xl text-muted-foreground">
          Inspect the server-compatible query payload produced by the same
          encoder that the global Portal SDK transformer uses. Request bodies
          remain unchanged.
        </p>
      </header>
      <Card className="min-h-[36rem]">
        <CardHeader className="border-b">
          <CardTitle>Encoding inspector</CardTitle>
          <CardDescription>
            Edit the input JSON to compare the transmitted value with a local
            decoded preview of the server middleware contract.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 p-6 xl:grid-cols-2">
          <section className="grid content-start gap-2">
            <Label htmlFor="request-query">Query JSON</Label>
            <Textarea id="request-query" value={filter} onChange={(event) => setFilter(event.target.value)} className="min-h-80 resize-y font-mono text-sm" spellCheck={false} />
          </section>
          <section className="grid content-start gap-5">
            {"error" in result ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{result.error}</p>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2"><LockKeyhole className="size-4" /> Encoded value</Label>
                  <code className="min-h-32 break-all rounded-xl border bg-muted/40 p-4 text-xs leading-5">{result.encoded}</code>
                </div>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2"><Braces className="size-4" /> Decoded contract preview</Label>
                  <pre className="min-h-40 overflow-auto rounded-xl border bg-muted/40 p-4 text-xs leading-5">{result.decoded}</pre>
                </div>
              </>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
