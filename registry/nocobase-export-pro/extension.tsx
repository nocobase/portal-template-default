import type { AppExtension } from "@nocobase/portal-sdk/extensions";

import { registerExportProDemoSection } from "@/extensions/nocobase-export";

registerExportProDemoSection(() =>
  import("./demo").then(({ ExportProDemoSection }) => ({
    default: ExportProDemoSection,
  }))
);

const extension: AppExtension = { id: "nocobase-export-pro" };

export default extension;
