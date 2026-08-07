import { nocobaseWebSocket } from "@nocobase/portal-sdk/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { toast } from "sonner";
import { parseInAppMessage } from "./api";
import { NotificationInboxContext } from "./context";
import { useInAppMessageTranslation } from "./i18n";
import { inAppMessageQueryKeys } from "./query-keys";

export function InAppMessageProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const t = useInAppMessageTranslation();
  const [open, setOpen] = useState(false);
  const [selectedChannelName, setSelectedChannelName] = useState<string>();

  const closeInbox = useCallback(() => setOpen(false), []);
  const openInbox = useCallback((channelName?: string) => {
    if (channelName) setSelectedChannelName(channelName);
    setOpen(true);
  }, []);
  const selectChannel = useCallback(
    (channelName: string) => setSelectedChannelName(channelName),
    []
  );

  const refreshQueries = useCallback(() => {
    queryClient
      .invalidateQueries({ queryKey: inAppMessageQueryKeys.all })
      .catch(() => undefined);
  }, [queryClient]);

  useEffect(() => {
    const unsubscribe = nocobaseWebSocket.subscribe((event) => {
      if (event.type === "in-app-message:created") {
        const message = parseInAppMessage(event.payload);
        if (!message) return;
        refreshQueries();
        toast.info(message.title || t("inbox.realtime.title", "New message"), {
          description:
            message.content.length > 120
              ? `${message.content.slice(0, 120)}…`
              : message.content,
          duration:
            typeof message.options?.duration === "number"
              ? message.options.duration * 1_000
              : undefined,
          action: {
            label: t("inbox.view", "View"),
            onClick: () => openInbox(message.channelName),
          },
        });
        return;
      }

      if (event.type === "in-app-message:updated") refreshQueries();
    });
    return () => {
      unsubscribe();
    };
  }, [openInbox, refreshQueries, t]);

  const value = useMemo(
    () => ({
      open,
      selectedChannelName,
      closeInbox,
      openInbox,
      selectChannel,
    }),
    [closeInbox, open, openInbox, selectChannel, selectedChannelName]
  );

  return (
    <NotificationInboxContext.Provider value={value}>
      {children}
    </NotificationInboxContext.Provider>
  );
}
