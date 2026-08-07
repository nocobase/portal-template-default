import { nocobaseClient } from "@nocobase/portal-sdk/client";
import type {
  InAppChannel,
  InAppChannelStatus,
  InAppMessage,
  InAppMessageStatus,
} from "./types";

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const unwrapData = (value: unknown) => {
  let payload = value;
  for (let depth = 0; depth < 2; depth += 1) {
    const record = asRecord(payload);
    if (!record || !("data" in record)) break;
    payload = record.data;
  }
  return payload;
};

const toFiniteNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const toMessageStatus = (value: unknown): InAppMessageStatus =>
  value === "read" ? "read" : "unread";

export function parseInAppMessage(value: unknown): InAppMessage | undefined {
  const record = asRecord(value);
  if (
    !record ||
    typeof record.id !== "string" ||
    typeof record.channelName !== "string"
  ) {
    return undefined;
  }
  const options = asRecord(record.options);
  return {
    id: record.id,
    userId:
      typeof record.userId === "string" || typeof record.userId === "number"
        ? record.userId
        : undefined,
    channelName: record.channelName,
    title: typeof record.title === "string" ? record.title : "",
    content: typeof record.content === "string" ? record.content : "",
    status: toMessageStatus(record.status),
    receiveTimestamp: toFiniteNumber(record.receiveTimestamp),
    options: options
      ? {
          duration:
            typeof options.duration === "number" ? options.duration : undefined,
          url: typeof options.url === "string" ? options.url : undefined,
        }
      : undefined,
  };
}

export function parseInAppChannels(value: unknown): InAppChannel[] {
  const payload = unwrapData(value);
  const record = asRecord(payload);
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(record?.rows)
      ? record.rows
      : [];
  return rows.flatMap((item) => {
    const record = asRecord(item);
    if (!record || typeof record.name !== "string") return [];
    return [
      {
        name: record.name,
        title:
          typeof record.title === "string" ? record.title : record.name,
        userId:
          typeof record.userId === "string" ||
          typeof record.userId === "number"
            ? record.userId
            : undefined,
        unreadMsgCnt: toFiniteNumber(record.unreadMsgCnt),
        totalMsgCnt: toFiniteNumber(record.totalMsgCnt),
        latestMsgReceiveTimestamp: toFiniteNumber(
          record.latestMsgReceiveTimestamp
        ),
        latestMsgTitle:
          typeof record.latestMsgTitle === "string"
            ? record.latestMsgTitle
            : "",
      },
    ];
  });
}

export function parseInAppMessages(value: unknown): InAppMessage[] {
  const payload = unwrapData(value);
  const record = asRecord(payload);
  const messages = Array.isArray(payload)
    ? payload
    : Array.isArray(record?.messages)
      ? record.messages
      : [];
  return messages.flatMap((item) => {
    const message = parseInAppMessage(item);
    return message ? [message] : [];
  });
}

export const inAppMessageApi = {
  unreadCount() {
    return nocobaseClient
      .action<unknown>("myInAppMessages", "count", { unwrap: "none" })
      .then((payload) => {
        const record = asRecord(unwrapData(payload));
        return toFiniteNumber(record?.count);
      });
  },

  listChannels(status: InAppChannelStatus) {
    return nocobaseClient
      .action<unknown>("myInAppChannels", "list", {
        query: {
          filter: JSON.stringify({ status }),
          limit: 100,
        },
        unwrap: "none",
      })
      .then(parseInAppChannels);
  },

  listMessages(channelName: string, status: InAppChannelStatus) {
    const filter: Record<string, unknown> = { channelName };
    if (status !== "all") filter.status = status;
    return nocobaseClient
      .action<unknown>("myInAppMessages", "list", {
        query: {
          filter: JSON.stringify(filter),
          limit: 100,
        },
        unwrap: "none",
      })
      .then(parseInAppMessages);
  },

  updateStatus({
    messageId,
    channelName,
    status,
  }: {
    messageId?: string;
    channelName?: string;
    status: InAppMessageStatus;
  }) {
    return nocobaseClient.action(
      "notificationInAppMessages",
      "updateMyOwn",
      {
        method: "POST",
        query: {
          ...(messageId ? { filterByTk: messageId } : {}),
          ...(channelName
            ? {
                filter: JSON.stringify({
                  channelName,
                  status: status === "read" ? "unread" : "read",
                }),
              }
            : {}),
        },
        body: { status },
      }
    );
  },
};
