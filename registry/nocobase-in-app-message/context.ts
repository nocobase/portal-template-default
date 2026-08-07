import { createContext, useContext } from "react";

export type NotificationInboxContextValue = {
  open: boolean;
  selectedChannelName?: string;
  closeInbox: () => void;
  openInbox: (channelName?: string) => void;
  selectChannel: (channelName: string) => void;
};

export const NotificationInboxContext = createContext<
  NotificationInboxContextValue | undefined
>(undefined);

export function useNotificationInbox() {
  const value = useContext(NotificationInboxContext);
  if (!value) {
    throw new Error(
      "useNotificationInbox must be used inside InAppMessageProvider"
    );
  }
  return value;
}
