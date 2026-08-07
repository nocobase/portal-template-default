export type InAppMessageStatus = "read" | "unread";
export type InAppChannelStatus = "all" | InAppMessageStatus;

export type InAppMessageOptions = {
  duration?: number;
  url?: string;
};

export type InAppMessage = {
  id: string;
  userId?: string | number;
  channelName: string;
  title: string;
  content: string;
  status: InAppMessageStatus;
  receiveTimestamp: number;
  options?: InAppMessageOptions;
};

export type InAppChannel = {
  name: string;
  title: string;
  userId?: string | number;
  unreadMsgCnt: number;
  totalMsgCnt: number;
  latestMsgReceiveTimestamp: number;
  latestMsgTitle: string;
};
