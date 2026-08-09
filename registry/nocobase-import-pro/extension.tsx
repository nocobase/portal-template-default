import type { AppExtension } from "@nocobase/portal-sdk/extensions";

import { registerImportProDemoAction } from "@/extensions/nocobase-import";

import "./locales";

registerImportProDemoAction(() =>
  import("./demo").then(({ ImportProDemoAction }) => ({
    default: ImportProDemoAction,
  }))
);

const importProExtension: AppExtension = {
  id: "nocobase-import-pro",
};

export default importProExtension;
