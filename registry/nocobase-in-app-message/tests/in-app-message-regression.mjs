import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const inboxSheetSource = await readFile(
  new URL("../inbox-sheet.tsx", import.meta.url),
  "utf8"
);
assert.match(
  inboxSheetSource,
  /className="mt-0\.5 flex min-h-5 items-center justify-between gap-3"/,
  "channel rows must keep the badge line height when the Read filter hides unread counts"
);

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const { inAppMessageApi, parseInAppChannels, parseInAppMessages } =
    await server.ssrLoadModule(
      "/registry/nocobase-in-app-message/api.ts"
    );
  const { nocobaseClient } = await server.ssrLoadModule(
    "@nocobase/portal-sdk/client"
  );
  const { default: extension } = await server.ssrLoadModule(
    "/registry/nocobase-in-app-message/extension.tsx"
  );
  const {
    formatRelativeTime,
    getChannelVisibleCount,
    isSafeInAppMessageUrl,
    sortChannelsNewestFirst,
    sortMessagesNewestFirst,
  } = await server.ssrLoadModule(
    "/registry/nocobase-in-app-message/presentation.ts"
  );

  assert.equal(extension.id, "nocobase-in-app-message");
  assert.equal(extension.Provider, undefined);
  assert.equal(extension.HeaderActions, undefined);
  assert.equal(extension.dev.resources[0].list, "in-app-message");
  assert.equal(extension.dev.routes[0].path, "in-app-message");

  const { InAppMessageWidget } = await server.ssrLoadModule(
    "/registry/nocobase-in-app-message/widget.tsx"
  );
  assert.equal(typeof InAppMessageWidget, "function");

  const now = Date.UTC(2026, 7, 5, 10, 0, 0);
  assert.equal(
    formatRelativeTime(now - 3 * 60_000, "zh-CN", now),
    "3分钟前"
  );
  assert.equal(
    formatRelativeTime(now - 3 * 60_000, "en-US", now),
    "3 minutes ago"
  );
  assert.deepEqual(
    sortChannelsNewestFirst([
      { name: "older", latestMsgReceiveTimestamp: 1 },
      { name: "newer", latestMsgReceiveTimestamp: 2 },
    ]).map((channel) => channel.name),
    ["newer", "older"]
  );
  assert.deepEqual(
    sortMessagesNewestFirst([
      { id: "older", receiveTimestamp: 1 },
      { id: "newer", receiveTimestamp: 2 },
    ]).map((message) => message.id),
    ["newer", "older"]
  );
  const channelWithMixedStatuses = {
    unreadMsgCnt: 2,
    totalMsgCnt: 5,
  };
  assert.equal(getChannelVisibleCount(channelWithMixedStatuses, "all"), 2);
  assert.equal(getChannelVisibleCount(channelWithMixedStatuses, "unread"), 2);
  assert.equal(getChannelVisibleCount(channelWithMixedStatuses, "read"), 0);
  assert.equal(isSafeInAppMessageUrl("/orders/1"), true);
  assert.equal(isSafeInAppMessageUrl("https://example.test/orders/1"), true);
  assert.equal(isSafeInAppMessageUrl("javascript:alert(1)"), false);
  assert.equal(isSafeInAppMessageUrl("data:text/html,unsafe"), false);

  assert.deepEqual(
    parseInAppChannels({
      data: {
        rows: [
          {
            name: "s_system",
            title: "System",
            unreadMsgCnt: "2",
            totalMsgCnt: "5",
            latestMsgReceiveTimestamp: "1000",
            latestMsgTitle: "Ready",
          },
        ],
      },
    }),
    [
      {
        name: "s_system",
        title: "System",
        userId: undefined,
        unreadMsgCnt: 2,
        totalMsgCnt: 5,
        latestMsgReceiveTimestamp: 1000,
        latestMsgTitle: "Ready",
      },
    ]
  );
  assert.equal(
    parseInAppChannels({
      data: [
        {
          name: "s_system",
          title: "System",
          unreadMsgCnt: 2,
          totalMsgCnt: 5,
          latestMsgReceiveTimestamp: 1000,
          latestMsgTitle: "Ready",
        },
      ],
      meta: { count: 1 },
    }).length,
    1,
    "channel lists returned in the standard NocoBase data-array shape must be visible"
  );
  assert.equal(
    parseInAppMessages({
      data: {
        messages: [
          {
            id: "message-1",
            channelName: "s_system",
            title: "Ready",
            content: "The import finished.",
            status: "unread",
            receiveTimestamp: "1000",
          },
        ],
      },
    })[0].status,
    "unread"
  );

  const calls = [];
  const originalAction = nocobaseClient.action;
  nocobaseClient.action = async (resource, action, options) => {
    calls.push({ resource, action, options });
    return { data: { count: "3" } };
  };
  try {
    assert.equal(await inAppMessageApi.unreadCount(), 3);
    await inAppMessageApi.updateStatus({
      channelName: "s_system",
      status: "read",
    });
  } finally {
    nocobaseClient.action = originalAction;
  }
  assert.deepEqual(calls[1], {
    resource: "notificationInAppMessages",
    action: "updateMyOwn",
    options: {
      method: "POST",
      query: {
        filter: JSON.stringify({
          channelName: "s_system",
          status: "unread",
        }),
      },
      body: { status: "read" },
    },
  });

  console.log("NocoBase in-app message regression tests passed");
} finally {
  await server.close();
}
