import type {
  InAppChannel,
  InAppChannelStatus,
  InAppMessage,
} from "./types";

export function getChannelVisibleCount(
  channel: InAppChannel,
  status: InAppChannelStatus
) {
  if (status === "read") return 0;
  return Math.max(0, channel.unreadMsgCnt);
}

export function sortChannelsNewestFirst(channels: readonly InAppChannel[]) {
  return [...channels].sort(
    (left, right) =>
      right.latestMsgReceiveTimestamp - left.latestMsgReceiveTimestamp
  );
}

export function sortMessagesNewestFirst(messages: readonly InAppMessage[]) {
  return [...messages].sort(
    (left, right) => right.receiveTimestamp - left.receiveTimestamp
  );
}

export function isSafeInAppMessageUrl(value: string) {
  try {
    const protocol = new URL(value, "https://portal.invalid").protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function formatRelativeTime(
  timestamp: number,
  locale?: string,
  now = Date.now()
) {
  const difference = timestamp - now;
  const absoluteDifference = Math.abs(difference);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absoluteDifference < 45_000) return formatter.format(0, "second");
  if (absoluteDifference < 90_000) {
    return formatter.format(Math.sign(difference), "minute");
  }
  if (absoluteDifference < 45 * 60_000) {
    return formatter.format(Math.round(difference / 60_000), "minute");
  }
  if (absoluteDifference < 90 * 60_000) {
    return formatter.format(Math.sign(difference), "hour");
  }
  if (absoluteDifference < 22 * 3_600_000) {
    return formatter.format(Math.round(difference / 3_600_000), "hour");
  }
  if (absoluteDifference < 36 * 3_600_000) {
    return formatter.format(Math.sign(difference), "day");
  }
  if (absoluteDifference < 26 * 86_400_000) {
    return formatter.format(Math.round(difference / 86_400_000), "day");
  }
  if (absoluteDifference < 45 * 86_400_000) {
    return formatter.format(Math.sign(difference), "month");
  }
  if (absoluteDifference < 320 * 86_400_000) {
    return formatter.format(
      Math.round(difference / (30 * 86_400_000)),
      "month"
    );
  }
  if (absoluteDifference < 548 * 86_400_000) {
    return formatter.format(Math.sign(difference), "year");
  }
  return formatter.format(
    Math.round(difference / (365 * 86_400_000)),
    "year"
  );
}
