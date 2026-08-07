import { AlertCircle, LoaderCircle, MapPinned } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CanAccess } from "@/components/access-control/can-access";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { useMapTranslation } from "./i18n";
import { getMapConfiguration } from "./map-api";
import { renderMap } from "./map-runtime";
import type {
  MapConfiguration,
  MapCoordinate,
  MapFeature,
  NocoBaseMapProps,
} from "./types";

function toError(reason: unknown) {
  return reason instanceof Error ? reason : new Error(String(reason));
}

type RemoteConfigurationState = {
  provider: NocoBaseMapProps["provider"];
  status: "loading" | "ready";
  configuration?: MapConfiguration;
};

function NocoBaseMapContent<TRecord>({
  provider,
  features,
  accessKey,
  securityJsCode,
  center = [116.397428, 39.90923],
  zoom = 12,
  height = 420,
  className,
  ariaLabel,
  onFeatureClick,
  onError,
}: NocoBaseMapProps<TRecord>) {
  const t = useMapTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const onFeatureClickRef = useRef(onFeatureClick);
  const onErrorRef = useRef(onError);
  onFeatureClickRef.current = onFeatureClick;
  onErrorRef.current = onError;
  const [remoteState, setRemoteState] = useState<RemoteConfigurationState>({
    provider,
    status: "loading",
  });
  const [runtimeLoading, setRuntimeLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [centerLongitude, centerLatitude] = center;
  const resolvedCenter = useMemo<MapCoordinate>(
    () => [centerLongitude, centerLatitude],
    [centerLatitude, centerLongitude]
  );
  const explicitConfiguration = useMemo<MapConfiguration | undefined>(
    () =>
      accessKey
        ? { type: provider, accessKey, securityJsCode }
        : undefined,
    [accessKey, provider, securityJsCode]
  );
  const configuration =
    explicitConfiguration ??
    (remoteState.provider === provider ? remoteState.configuration : undefined);
  const configurationLoading =
    !accessKey &&
    (remoteState.provider !== provider || remoteState.status === "loading");
  const handleFeatureClick = useCallback(
    (feature: MapFeature<TRecord>) => onFeatureClickRef.current?.(feature),
    []
  );

  useEffect(() => {
    if (accessKey) {
      return;
    }
    const controller = new AbortController();
    setRemoteState({ provider, status: "loading" });
    setError(undefined);
    getMapConfiguration(provider, controller.signal)
      .then((nextConfiguration) => {
        if (!controller.signal.aborted) {
          setRemoteState({
            provider,
            status: "ready",
            configuration: nextConfiguration,
          });
        }
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const nextError = toError(reason);
        setError(nextError);
        onErrorRef.current?.(nextError);
      })
    return () => controller.abort();
  }, [accessKey, provider]);

  useEffect(() => {
    if (configurationLoading) return;
    if (!containerRef.current || !configuration?.accessKey) {
      setRuntimeLoading(false);
      return;
    }
    let canceled = false;
    let cleanup: (() => void) | undefined;
    setRuntimeLoading(true);
    setError(undefined);
    renderMap(
      provider,
      {
        container: containerRef.current,
        features,
        center: resolvedCenter,
        zoom,
        onFeatureClick: handleFeatureClick,
      },
      configuration.accessKey,
      configuration.securityJsCode
    )
      .then((dispose) => {
        if (canceled) dispose();
        else cleanup = dispose;
      })
      .catch((reason: unknown) => {
        if (canceled) return;
        const nextError = toError(reason);
        setError(nextError);
        onErrorRef.current?.(nextError);
      })
      .finally(() => {
        if (!canceled) setRuntimeLoading(false);
      });
    return () => {
      canceled = true;
      cleanup?.();
    };
  }, [configuration, configurationLoading, features, handleFeatureClick, provider, resolvedCenter, zoom]);

  const providerLabel =
    provider === "amap"
      ? t("provider.amap", "AMap")
      : t("provider.google", "Google Maps");
  const loading = configurationLoading || runtimeLoading;

  return (
    <div className={className}>
      <div className="relative" style={{ height }}>
        <div
          ref={containerRef}
          className="h-full w-full overflow-hidden rounded-lg bg-muted"
          role="region"
          aria-label={ariaLabel ?? providerLabel}
        />
        {loading ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-background/70 text-sm text-muted-foreground">
            <LoaderCircle className="animate-spin" />
            {t("state.loading", "Loading map...")}
          </div>
        ) : error ? (
          <Alert variant="destructive" className="absolute inset-x-4 top-4">
            <AlertCircle />
            <AlertDescription>{t("error.load", "Unable to load the map.")}</AlertDescription>
          </Alert>
        ) : !configuration?.accessKey ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-muted text-sm text-muted-foreground">
            <MapPinned />
            {t(
              "state.emptyConfiguration",
              "No access key is configured for {{provider}}.",
              { provider: providerLabel }
            )}
          </div>
        ) : null}
      </div>
      {features.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-2" aria-label={t("features.label", "Map features")}>
          {features.map((feature) => (
            <Button
              key={feature.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleFeatureClick(feature)}
            >
              <MapPinned />
              {feature.label ?? String(feature.id)}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function NocoBaseMap<TRecord>(props: NocoBaseMapProps<TRecord>) {
  if (props.accessKey) return <NocoBaseMapContent {...props} />;
  return (
    <CanAccess resource="map-configuration" action="get" dataSourceKey="main">
      <NocoBaseMapContent {...props} />
    </CanAccess>
  );
}
