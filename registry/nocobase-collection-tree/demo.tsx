import { Network } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
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

import { TreeCollectionManager } from "./tree-collection-manager";

export default function CollectionTreeDemoPage() {
  const [collectionName, setCollectionName] = useState("");
  const [titleField, setTitleField] = useState("name");
  const [target, setTarget] = useState<{
    collectionName: string;
    titleField: string;
  }>();

  return (
    <div className="space-y-6 pb-12">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary"><Network /> Adjacency list</Badge>
          <Badge variant="outline">main / configurable</Badge>
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Server-backed tree
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Query the server-maintained hierarchy, filter with ancestor recovery,
          and create, move, rename, or remove nodes.
        </p>
      </header>

      <Card className="min-h-[36rem]">
        <CardHeader className="border-b">
          <CardTitle>Tree workspace</CardTitle>
          <CardDescription>
            Search and pagination use the plugin's tree mode. Parent changes are
            validated and persisted by its path-aware repository.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="grid gap-2">
              <Label htmlFor="tree-collection">Tree collection</Label>
              <Input
                id="tree-collection"
                value={collectionName}
                onChange={(event) => setCollectionName(event.target.value)}
                placeholder="Collection using the tree template"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tree-title-field">Title field</Label>
              <Input
                id="tree-title-field"
                value={titleField}
                onChange={(event) => setTitleField(event.target.value)}
                placeholder="name"
              />
            </div>
            <Button
              disabled={!collectionName.trim() || !titleField.trim()}
              onClick={() =>
                setTarget({
                  collectionName: collectionName.trim(),
                  titleField: titleField.trim(),
                })
              }
            >
              Open tree
            </Button>
          </div>
          {target ? (
            <TreeCollectionManager
              key={`${target.collectionName}:${target.titleField}`}
              collectionName={target.collectionName}
              titleField={target.titleField}
            />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Enter an existing collection created from NocoBase&apos;s tree
              template. The demo no longer assumes a collection named
              &quot;tree&quot; exists.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
