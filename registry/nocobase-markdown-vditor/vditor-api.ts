import { nocobaseClient } from "@nocobase/portal-sdk/client";
import type { VditorStorageInfo } from "./types";
export async function checkVditorStorage(fileCollectionName = "attachments"): Promise<VditorStorageInfo> { const payload = await nocobaseClient.action<unknown>("vditor", "check", { query: { fileCollectionName }, unwrap: "none" }); const storage = (payload as any)?.data?.data?.storage ?? (payload as any)?.data?.storage ?? (payload as any)?.storage; if (!storage?.id) throw new Error("Vditor storage configuration was not returned by the server."); return storage; }
