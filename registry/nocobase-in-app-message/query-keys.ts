export const inAppMessageQueryKeys = {
  all: ["nocobase-in-app-message"] as const,
  unreadCount: ["nocobase-in-app-message", "unread-count"] as const,
  channels: (status: string) =>
    ["nocobase-in-app-message", "channels", status] as const,
  messages: (channelName: string, status: string) =>
    ["nocobase-in-app-message", "messages", channelName, status] as const,
};
