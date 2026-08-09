import { MapPin } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ChinaRegionDisplay } from "./china-region-display";
import { ChinaRegionPicker } from "./china-region-picker";
import { useChinaRegionTranslation } from "./i18n";
import type { ChinaRegionRecord, ChinaRegionValue } from "./types";

const displayValue: ChinaRegionRecord[] = [
  { code: "330000", name: "浙江省", level: 1 },
  { code: "330100", name: "杭州市", level: 2, parentCode: "330000" },
  { code: "330106", name: "西湖区", level: 3, parentCode: "330100" },
];

function ValuePreview({ value }: { value: ChinaRegionValue | undefined }) {
  const t = useChinaRegionTranslation();
  return (
    <div className="rounded-lg bg-muted/50 p-3 text-xs">
      <div className="mb-1 font-medium text-muted-foreground">{t("demo.currentValue", "Current value")}</div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(value, null, 2) || "null"}</pre>
    </div>
  );
}

export default function ChinaRegionDemoPage() {
  const t = useChinaRegionTranslation();
  const [addressRegion, setAddressRegion] = useState<ChinaRegionValue>();
  const [province, setProvince] = useState<ChinaRegionValue>();
  const [detailedAddress, setDetailedAddress] = useState("");

  return (
    <div className="space-y-6 pb-12">
      <header className="space-y-2">
        <Badge variant="secondary">
          <MapPin />
          {t("navigation.title", "China region")}
        </Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{t("demo.title", "China region field")}</h1>
        <p className="max-w-3xl text-muted-foreground">
          {t(
            "demo.description",
            "Use the NocoBase administrative division dataset in Portal forms and read-only views."
          )}
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("demo.address.title", "User address")}</CardTitle>
            <CardDescription>
              {t(
                "demo.address.description",
                "A complete province, city, and area selector that returns NocoBase association values."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("field.label", "China region")}</Label>
              <ChinaRegionPicker value={addressRegion} onChange={setAddressRegion} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="china-region-address">{t("demo.detailedAddress", "Detailed address")}</Label>
              <Input
                id="china-region-address"
                value={detailedAddress}
                placeholder={t("demo.detailedAddressPlaceholder", "Street, building, and room")}
                onChange={(event) => setDetailedAddress(event.target.value)}
              />
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                {t("demo.savedAddress", "Saved address")}
              </div>
              <ChinaRegionDisplay value={addressRegion} /> {detailedAddress}
            </div>
            <ValuePreview value={addressRegion} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("demo.province.title", "Province only")}</CardTitle>
              <CardDescription>
                {t("demo.province.description", "Limit the selector to the level required by the business field.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ChinaRegionPicker value={province} onChange={setProvince} maxLevel={1} />
              <ValuePreview value={province} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("demo.display.title", "Read-only value")}</CardTitle>
              <CardDescription>
                {t("demo.display.description", "Render associated region records in their administrative order.")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChinaRegionDisplay value={displayValue} className="text-lg font-medium" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
