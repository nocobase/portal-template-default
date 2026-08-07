import { MapPinned } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useMapTranslation } from "./i18n";
import { NocoBaseMap } from "./nocobase-map";
import type { MapFeature, MapProvider } from "./types";

const features: MapFeature[] = [
  { id: "beijing", label: "Beijing", geometry: { type: "point", coordinates: [116.397428, 39.90923] } },
  { id: "park", label: "Demo area", geometry: { type: "circle", coordinates: [116.42, 39.92, 1200] } },
  {
    id: "route",
    label: "Demo route",
    geometry: { type: "lineString", coordinates: [[116.37, 39.9], [116.397428, 39.90923], [116.43, 39.93]] },
  },
];

export default function MapDemoPage() {
  const t = useMapTranslation();
  const [provider, setProvider] = useState<MapProvider>("amap");
  return (
    <div className="space-y-6 pb-12">
      <header className="space-y-2">
        <Badge variant="secondary">
          <MapPinned />
          {t("navigation.title", "Map")}
        </Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{t("demo.title", "Map")}</h1>
        <p className="max-w-3xl text-muted-foreground">
          {t("demo.description", "Render NocoBase point, line, polygon, and circle values with the configured map provider.")}
        </p>
      </header>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>{t("demo.title", "Map")}</CardTitle>
              <CardDescription>map-configuration:get</CardDescription>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="map-provider">{t("demo.provider", "Map provider")}</Label>
              <Select value={provider} onValueChange={(value) => setProvider(value as MapProvider)}>
                <SelectTrigger id="map-provider" className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="amap">{t("provider.amap", "AMap")}</SelectItem>
                  <SelectItem value="google">{t("provider.google", "Google Maps")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <NocoBaseMap provider={provider} features={features} ariaLabel={t("demo.title", "Map")} />
        </CardContent>
      </Card>
    </div>
  );
}
