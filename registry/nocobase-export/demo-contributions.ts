import type { ComponentType } from "react";

export type ExportProDemoSectionLoader = () => Promise<{
  default: ComponentType;
}>;

let exportProDemoSectionLoader: ExportProDemoSectionLoader | undefined;

export function registerExportProDemoSection(
  loader: ExportProDemoSectionLoader
) {
  exportProDemoSectionLoader = loader;
}

export function getExportProDemoSectionLoader() {
  return exportProDemoSectionLoader;
}
