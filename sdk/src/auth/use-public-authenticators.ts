import { useQuery } from "@tanstack/react-query";

import { nocobaseClient } from "../client/index.js";
import type { Authenticator } from "./types.js";

export const publicAuthenticatorsQueryKey = [
  "nocobase",
  "public-authenticators",
] as const;

export function usePublicAuthenticators() {
  return useQuery({
    queryKey: publicAuthenticatorsQueryKey,
    queryFn: ({ signal }) =>
      nocobaseClient.action<Authenticator[]>("authenticators", "publicList", {
        method: "GET",
        signal,
        authenticator: null,
        includeRole: false,
        withAclMeta: false,
      }),
    staleTime: 0,
    refetchOnMount: "always",
    retry: false,
  });
}
