import type { MapCoordinate, MapFeature, MapProvider } from "./types";

type MapRuntimeOptions<TRecord> = {
  container: HTMLElement;
  features: MapFeature<TRecord>[];
  center: MapCoordinate;
  zoom: number;
  onFeatureClick?: (feature: MapFeature<TRecord>) => void;
};

type RuntimeCleanup = () => void;
type EventTargetLike = { addListener?: (name: string, handler: () => void) => { remove?: () => void }; on?: (name: string, handler: () => void) => void; off?: (name: string, handler: () => void) => void };

type ScriptLoadState = { credentials: string; promise: Promise<void> };
const scriptStates = new Map<MapProvider, ScriptLoadState>();

function loadScript(
  provider: MapProvider,
  source: string,
  credentials: string,
  beforeLoad?: () => void
) {
  const existing = scriptStates.get(provider);
  if (existing) {
    if (existing.credentials !== credentials) {
      return Promise.reject(
        new Error(`${provider} is already loaded with different credentials.`)
      );
    }
    return existing.promise;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const id = `nocobase-${provider}-runtime`;
    const current = document.getElementById(id) as HTMLScriptElement | null;
    if (current?.dataset.loaded === "true") {
      resolve();
      return;
    }
    const script = current ?? document.createElement("script");
    beforeLoad?.();
    script.id = id;
    script.async = true;
    script.src = source;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    }, { once: true });
    script.addEventListener(
      "error",
      () => {
        script.remove();
        reject(new Error(`Unable to load ${source}`));
      },
      { once: true }
    );
    if (!current) document.head.append(script);
  });
  const state = { credentials, promise };
  scriptStates.set(provider, state);
  promise.catch(() => {
    if (scriptStates.get(provider) === state) scriptStates.delete(provider);
  });
  return promise;
}

function allCoordinates(feature: MapFeature<unknown>): MapCoordinate[] {
  const { geometry } = feature;
  if (geometry.type === "point") return [geometry.coordinates];
  if (geometry.type === "circle") return [[geometry.coordinates[0], geometry.coordinates[1]]];
  return geometry.coordinates;
}

type AMapObject = EventTargetLike & { setMap?: (map: unknown) => void };
type AMapInstance = { destroy: () => void; setFitView: (items: AMapObject[]) => void; setZoomAndCenter: (zoom: number, center: MapCoordinate) => void };
type AMapRuntime = {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => AMapInstance;
  Marker: new (options: Record<string, unknown>) => AMapObject;
  Polyline: new (options: Record<string, unknown>) => AMapObject;
  Polygon: new (options: Record<string, unknown>) => AMapObject;
  Circle: new (options: Record<string, unknown>) => AMapObject;
};

export async function loadAMap(accessKey: string, securityJsCode?: string) {
  const credentials = `${accessKey}:${securityJsCode ?? ""}`;
  await loadScript(
    "amap",
    `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(accessKey)}`,
    credentials,
    () => {
      if (!securityJsCode) return;
      const key = securityJsCode.endsWith("_AMapService")
        ? "serviceHOST"
        : "securityJsCode";
      (
        window as Window & {
          _AMapSecurityConfig?: Record<string, string>;
        }
      )._AMapSecurityConfig = { [key]: securityJsCode };
    }
  );
  const runtime = (window as Window & { AMap?: AMapRuntime }).AMap;
  if (!runtime) throw new Error("AMap runtime is unavailable.");
  return runtime;
}

export async function renderAMap<TRecord>({ container, features, center, zoom, onFeatureClick }: MapRuntimeOptions<TRecord>, accessKey: string, securityJsCode?: string): Promise<RuntimeCleanup> {
  const runtime = await loadAMap(accessKey, securityJsCode);
  const map = new runtime.Map(container, { center, zoom, viewMode: "2D" });
  const cleanups: RuntimeCleanup[] = [];
  const overlays = features.map((feature) => {
    const common = { map, title: feature.label, strokeColor: "#6366f1", fillColor: "#818cf8", fillOpacity: 0.28 };
    const geometry = feature.geometry;
    const overlay =
      geometry.type === "point"
        ? new runtime.Marker({ ...common, position: geometry.coordinates })
        : geometry.type === "lineString"
          ? new runtime.Polyline({ ...common, path: geometry.coordinates, strokeWeight: 4 })
          : geometry.type === "polygon"
            ? new runtime.Polygon({ ...common, path: geometry.coordinates, strokeWeight: 3 })
            : new runtime.Circle({ ...common, center: geometry.coordinates.slice(0, 2), radius: geometry.coordinates[2], strokeWeight: 3 });
    const handleClick = () => onFeatureClick?.(feature);
    overlay.on?.("click", handleClick);
    cleanups.push(() => overlay.off?.("click", handleClick));
    return overlay;
  });
  if (overlays.length) {
    map.setFitView(overlays);
    if (overlays.length === 1 && features[0]?.geometry.type === "point") {
      map.setZoomAndCenter(zoom, features[0].geometry.coordinates);
    }
  }
  return () => {
    cleanups.forEach((cleanup) => cleanup());
    map.destroy();
  };
}

type GoogleMap = { fitBounds: (bounds: unknown) => void; setCenter: (center: { lng: number; lat: number }) => void; setZoom: (zoom: number) => void };
type GoogleOverlay = EventTargetLike & { setMap: (map: GoogleMap | null) => void };
type GoogleBounds = { extend: (point: { lng: number; lat: number }) => void };
type GoogleRuntime = {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => GoogleMap;
  Marker: new (options: Record<string, unknown>) => GoogleOverlay;
  Polyline: new (options: Record<string, unknown>) => GoogleOverlay;
  Polygon: new (options: Record<string, unknown>) => GoogleOverlay;
  Circle: new (options: Record<string, unknown>) => GoogleOverlay;
  LatLngBounds: new () => GoogleBounds;
};

export async function loadGoogleMaps(accessKey: string) {
  await loadScript(
    "google",
    `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(accessKey)}&v=weekly`,
    accessKey
  );
  const runtime = (window as Window & { google?: { maps?: GoogleRuntime } }).google?.maps;
  if (!runtime) throw new Error("Google Maps runtime is unavailable.");
  return runtime;
}

const googlePoint = ([lng, lat]: MapCoordinate) => ({ lng, lat });

export async function renderGoogleMap<TRecord>({ container, features, center, zoom, onFeatureClick }: MapRuntimeOptions<TRecord>, accessKey: string): Promise<RuntimeCleanup> {
  const runtime = await loadGoogleMaps(accessKey);
  const map = new runtime.Map(container, { center: googlePoint(center), zoom, mapTypeControl: false });
  const bounds = new runtime.LatLngBounds();
  const overlays = features.map((feature) => {
    const geometry = feature.geometry;
    const common = { map, title: feature.label, strokeColor: "#6366f1", fillColor: "#818cf8", fillOpacity: 0.28 };
    const overlay =
      geometry.type === "point"
        ? new runtime.Marker({ ...common, position: googlePoint(geometry.coordinates) })
        : geometry.type === "lineString"
          ? new runtime.Polyline({ ...common, path: geometry.coordinates.map(googlePoint), strokeWeight: 4 })
          : geometry.type === "polygon"
            ? new runtime.Polygon({ ...common, paths: geometry.coordinates.map(googlePoint), strokeWeight: 3 })
            : new runtime.Circle({ ...common, center: googlePoint([geometry.coordinates[0], geometry.coordinates[1]]), radius: geometry.coordinates[2], strokeWeight: 3 });
    overlay.addListener?.("click", () => onFeatureClick?.(feature));
    allCoordinates(feature).forEach((coordinate) => bounds.extend(googlePoint(coordinate)));
    return overlay;
  });
  if (features.length > 1) map.fitBounds(bounds);
  if (features.length === 1) {
    const firstCoordinate = allCoordinates(features[0])[0] ?? center;
    map.setCenter(googlePoint(firstCoordinate));
    map.setZoom(zoom);
  }
  return () => overlays.forEach((overlay) => overlay.setMap(null));
}

export async function renderMap<TRecord>(provider: MapProvider, options: MapRuntimeOptions<TRecord>, accessKey: string, securityJsCode?: string) {
  return provider === "amap"
    ? renderAMap(options, accessKey, securityJsCode)
    : renderGoogleMap(options, accessKey);
}
