import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inAppMessageApi } from "./api";
import { inAppMessageQueryKeys } from "./query-keys";
import type {
  InAppChannelStatus,
  InAppMessageStatus,
} from "./types";

export function useUnreadMessageCount() {
  return useQuery({
    queryKey: inAppMessageQueryKeys.unreadCount,
    queryFn: () => inAppMessageApi.unreadCount(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export function useInAppChannels(status: InAppChannelStatus, enabled: boolean) {
  return useQuery({
    queryKey: inAppMessageQueryKeys.channels(status),
    queryFn: () => inAppMessageApi.listChannels(status),
    enabled,
  });
}

export function useInAppMessages(
  channelName: string | undefined,
  status: InAppChannelStatus,
  enabled: boolean
) {
  return useQuery({
    queryKey: inAppMessageQueryKeys.messages(channelName ?? "", status),
    queryFn: () => inAppMessageApi.listMessages(channelName!, status),
    enabled: enabled && Boolean(channelName),
  });
}

export function useUpdateInAppMessageStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: {
      messageId?: string;
      channelName?: string;
      status: InAppMessageStatus;
    }) => inAppMessageApi.updateStatus(values),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: inAppMessageQueryKeys.all }),
  });
}
