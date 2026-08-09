import { ExportRecordsButton } from "@/extensions/nocobase-export";
import type { ExportRecordsButtonProps } from "@/extensions/nocobase-export/types";
export function ExportProRecordsButton(props: ExportRecordsButtonProps) {
  return <ExportRecordsButton {...props} mode={props.mode ?? "auto"} />;
}
