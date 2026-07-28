import { useQuery } from "@tanstack/react-query";

import { nocobaseClient } from "@/lib/nocobase/client";

import { getDataSourceHeaders } from "./storage";
import type { FileFieldDescriptor, StorageCheckResult } from "./types";

export function checkFileStorage(descriptor: FileFieldDescriptor) {
  const dataSourceKey = descriptor.dataSourceKey ?? "main";

  return nocobaseClient.action<StorageCheckResult>("storages", "check", {
    method: "POST",
    query: {
      fileCollectionName: descriptor.fileCollection,
    },
    headers: getDataSourceHeaders(dataSourceKey),
  });
}

export function useFileStorage(
  descriptor: FileFieldDescriptor,
  options: { enabled?: boolean } = {}
) {
  const dataSourceKey = descriptor.dataSourceKey ?? "main";

  return useQuery({
    queryKey: [
      "nocobase",
      "file-storage",
      dataSourceKey,
      descriptor.fileCollection,
    ],
    queryFn: () => checkFileStorage(descriptor),
    enabled: options.enabled ?? false,
    staleTime: 5 * 60 * 1000,
  });
}
