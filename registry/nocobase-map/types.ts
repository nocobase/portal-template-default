export type MapProvider = "amap" | "google";
export type MapCoordinate = [longitude: number, latitude: number];

export type MapGeometry =
  | { type: "point"; coordinates: MapCoordinate }
  | { type: "lineString"; coordinates: MapCoordinate[] }
  | { type: "polygon"; coordinates: MapCoordinate[] }
  | { type: "circle"; coordinates: [longitude: number, latitude: number, radius: number] };

export type MapFeature<TRecord = Record<string, unknown>> = {
  id: string | number;
  label?: string;
  geometry: MapGeometry;
  record?: TRecord;
};

export type MapConfiguration = {
  type: MapProvider;
  accessKey: string;
  securityJsCode?: string;
};

export type NocoBaseMapProps<TRecord = Record<string, unknown>> = {
  provider: MapProvider;
  features: MapFeature<TRecord>[];
  accessKey?: string;
  securityJsCode?: string;
  center?: MapCoordinate;
  zoom?: number;
  height?: number | string;
  className?: string;
  ariaLabel?: string;
  onFeatureClick?: (feature: MapFeature<TRecord>) => void;
  onError?: (error: Error) => void;
};
