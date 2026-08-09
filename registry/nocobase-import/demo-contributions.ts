import type { ComponentType } from "react";

export type ImportProDemoActionProps = {
  onImported: () => Promise<void>;
};

export type ImportProDemoActionLoader = () => Promise<{
  default: ComponentType<ImportProDemoActionProps>;
}>;

let importProDemoActionLoader: ImportProDemoActionLoader | undefined;

export function registerImportProDemoAction(
  loader: ImportProDemoActionLoader
) {
  importProDemoActionLoader = loader;
}

export function getImportProDemoActionLoader() {
  return importProDemoActionLoader;
}
