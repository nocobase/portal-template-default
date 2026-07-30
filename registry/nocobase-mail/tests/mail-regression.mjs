import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const mailTableSource = await readFile(
    new URL("../components/mail-table.tsx", import.meta.url),
    "utf8"
  );
  const mailFiltersSource = await readFile(
    new URL("../components/mail-filters.tsx", import.meta.url),
    "utf8"
  );
  const mailDetailSource = await readFile(
    new URL("../components/mail-detail.tsx", import.meta.url),
    "utf8"
  );
  const mailInboxSource = await readFile(
    new URL("../components/mail-inbox.tsx", import.meta.url),
    "utf8"
  );
  const mailPagesSource = await readFile(
    new URL("../mail-pages.tsx", import.meta.url),
    "utf8"
  );
  assert.match(
    mailTableSource,
    /<DropdownMenuContent[^>]*>\s*<DropdownMenuGroup>[\s\S]*?<DropdownMenuLabel>Toggle columns<\/DropdownMenuLabel>/,
    "keeps the Base UI columns label inside a menu group"
  );
  assert.match(
    mailTableSource,
    /unread &&[\s\S]*?\? "font-bold"/,
    "renders unread mail cells with a clearly bold font weight"
  );
  assert.match(
    mailFiltersSource,
    /label="Todo"[\s\S]*?icon=\{value\.isTodo \? CircleCheckBig : Circle\}/,
    "presents the backend todo flag as a todo filter"
  );
  assert.doesNotMatch(
    mailFiltersSource,
    /Starred|icon=\{Star\}/,
    "does not present todo messages as starred mail"
  );
  assert.match(
    mailDetailSource,
    /aria-pressed=\{Boolean\(message\.isTodo\)\}[\s\S]*?"Add to todo"[\s\S]*?message\.isTodo \? \(/,
    "renders the message todo control as an accessible toggle"
  );
  assert.match(
    mailDetailSource,
    /title="Mark as unread"[\s\S]*?onMarkUnread\?\.\(message\)/,
    "offers a mark-as-unread action in message detail"
  );
  assert.match(
    mailInboxSource,
    /handleDetailMarkUnread[\s\S]*?collectMessageMailIds\(message\)[\s\S]*?mailApi\.setRead\(mailIds, false\)[\s\S]*?markMessageUnread/,
    "marks the full open conversation unread and updates local state"
  );
  assert.match(
    mailDetailSource,
    /\.gmail_quote[\s\S]*?blockquote\[type=[^\]]*cite[^\]]*\][\s\S]*?#divNeteaseMailCard[\s\S]*?#foxmail_quote[\s\S]*?#divRplyFwdMsg[\s\S]*?#yahoo_quoted/,
    "recognizes quoted messages from the providers supported by the previous mail detail"
  );
  assert.match(
    mailDetailSource,
    /topLevelNodes\[0\][\s\S]*?mail-quote is-collapsed[\s\S]*?Replied message/,
    "collapses only the first top-level quoted message behind a reply toggle"
  );
  assert.match(
    mailInboxSource,
    /isMessageUnread\(message\)[\s\S]*?collectMessageMailIds\(detail\)[\s\S]*?mailApi\.setRead\(mailIds, true\)/,
    "marks the complete conversation as read when its detail is opened"
  );
  assert.match(
    mailInboxSource,
    /m\.id === message\.id[\s\S]*?markMessageRead\(m\)/,
    "clears both the message and conversation unread state in the list"
  );
  assert.match(
    mailPagesSource,
    /params\.set\("todo", "1"\)/,
    "uses todo semantics in newly generated filter URLs"
  );
  assert.match(
    mailPagesSource,
    /searchParams\.get\("starred"\) === "1"/,
    "keeps legacy starred filter URLs working"
  );

  const { getMailSenderCandidates, resolveMailSender } =
    await server.ssrLoadModule(
      "/registry/nocobase-mail/components/mail-senders.ts"
    );
  const { buildComposeInitial, canReplyAll } = await server.ssrLoadModule(
    "/registry/nocobase-mail/components/use-mail-compose.tsx"
  );
  const {
    collectMessageMailIds,
    isMessageUnread,
    markMessageRead,
    markMessageUnread,
  } = await server.ssrLoadModule(
    "/registry/nocobase-mail/components/mail-inbox.tsx"
  );
  const { mailApi } = await server.ssrLoadModule(
    "/registry/nocobase-mail/components/mail-api.ts"
  );
  const { nocobaseClient } = await server.ssrLoadModule(
    "/src/lib/nocobase/client.ts"
  );
  const { default: mailExtension } = await server.ssrLoadModule(
    "/registry/nocobase-mail/extension.tsx"
  );
  const { appendRecipient, currentToken, mergeRecipients } =
    await server.ssrLoadModule(
      "/registry/nocobase-mail/components/mail-recipient-input.tsx"
    );
  const { createDebouncedDraftSaver } = await server.ssrLoadModule(
    "/registry/nocobase-mail/components/mail-draft-autosave.ts"
  );
  const {
    collectInlineContentIds,
    filterInlineAttachments,
    replaceInlineImageSources,
  } = await server.ssrLoadModule(
    "/registry/nocobase-mail/components/mail-inline-images.ts"
  );
  const { serializeReplyQuote, splitReplyQuote } = await server.ssrLoadModule(
    "/registry/nocobase-mail/components/mail-reply-quote.ts"
  );

  assert.equal(currentToken("alice@example.com, bo"), "bo");
  assert.equal(
    appendRecipient("alice@example.com, bo", "bob@example.com"),
    "alice@example.com, bob@example.com",
    "replaces the active search token when a recipient is selected"
  );
  assert.equal(
    appendRecipient("alice@example.com, ", "bob@example.com"),
    "alice@example.com, bob@example.com",
    "appends after a completed manual recipient"
  );
  assert.equal(
    appendRecipient("Alice@example.com, ali", "alice@example.com"),
    "Alice@example.com",
    "deduplicates selected recipients case-insensitively"
  );
  assert.equal(
    mergeRecipients(
      "alice@example.com",
      "bob@example.com; ALICE@example.com, carol@example.com"
    ),
    "alice@example.com, bob@example.com, carol@example.com",
    "merges manually entered To/Cc recipients and removes duplicates"
  );

  const autoSaved = [];
  const draftSaver = createDebouncedDraftSaver(
    async (payload) => autoSaved.push(payload),
    5
  );
  draftSaver.schedule({ subject: "First version" });
  draftSaver.schedule({ subject: "Latest version" });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(
    autoSaved,
    [{ subject: "Latest version" }],
    "auto-save debounces edits and persists only the latest draft snapshot"
  );
  draftSaver.cancel();

  const inlineHtml = [
    '<p><img src="cid:<Hero.Image@Mail>"></p>',
    '<img src="/api/mail:messageContentPreview?messageId=7&amp;contentId=logo%40mail">',
  ].join("");
  assert.deepEqual(collectInlineContentIds(inlineHtml), [
    "hero.image@mail",
    "logo@mail",
  ]);
  assert.equal(
    replaceInlineImageSources(
      inlineHtml,
      new Map([
        ["hero.image@mail", "blob:hero"],
        ["logo@mail", "blob:logo"],
      ])
    ),
    '<p><img src="blob:hero"></p><img src="blob:logo">'
  );
  assert.deepEqual(
    filterInlineAttachments(
      [
        {
          attachmentId: "inline",
          filename: "hero.png",
          mimeType: "image/png",
          contentId: "<Hero.Image@Mail>",
        },
        {
          attachmentId: "file",
          filename: "report.pdf",
          mimeType: "application/pdf",
        },
      ],
      inlineHtml
    ).map((attachment) => attachment.attachmentId),
    ["file"],
    "inline images are not duplicated in the downloadable attachment list"
  );

  assert.equal(
    mailExtension.resources,
    undefined,
    "does not add Mail examples to the application navigation"
  );
  assert.ok(mailExtension.dev?.routes, "provides Mail routes under /dev");
  const mailResources = mailExtension.dev?.resources ?? [];
  const scenarioResources = mailResources.filter((resource) =>
    resource.name.startsWith("mail-scenario-")
  );
  assert.equal(
    scenarioResources.length,
    5,
    "includes the standalone unread-indicator scenario"
  );
  assert.ok(
    scenarioResources.every((resource) => resource.meta?.parent === "mail"),
    "nests every scenario directly under Mail"
  );
  assert.equal(
    mailResources.some((resource) => resource.name === "mail-compose"),
    false,
    "removes the old standalone Compose menu entry"
  );
  assert.equal(
    mailResources.some((resource) => resource.name === "mail-scenarios"),
    false,
    "removes the intermediate Mail scenarios menu group"
  );
  const bulkResource = mailResources.find(
    (resource) => resource.name === "mail-bulk"
  );
  assert.equal(bulkResource?.list, "mail/bulk");
  assert.equal(bulkResource?.meta?.parent, "mail");
  assert.equal(bulkResource?.meta?.label, "Bulk mail");
  assert.equal(
    mailResources.at(-1)?.name,
    "mail-bulk",
    "keeps Bulk mail as the final item in the Mail menu"
  );
  assert.deepEqual(
    scenarioResources.map((resource) => resource.list),
    [
      "mail/workspace",
      "mail/personal",
      "mail/unread",
      "mail/compose",
      "mail/filtered",
    ]
  );
  assert.equal(
    mailResources.some(
      (resource) => resource.name === "mail-scenario-compose-anywhere"
    ),
    false,
    "removes the standalone Send to anyone menu entry"
  );

  const candidates = getMailSenderCandidates([
    {
      id: 1,
      type: "gmail",
      email: "owner@example.com",
      userId: 1,
      settingId: 1,
      identities: [
        { id: 11, accountId: 1, userId: 1, email: "sales@example.com" },
        { id: 12, accountId: 1, userId: 1, email: "owner@example.com" },
      ],
    },
    {
      id: 2,
      type: "smtp",
      email: "team@example.com",
      userId: 1,
      settingId: 2,
      identities: [
        { id: 21, accountId: 2, userId: 1, email: "sales@example.com" },
      ],
    },
  ]);

  assert.equal(
    candidates.length,
    4,
    "deduplicates identities within an account"
  );
  assert.equal(new Set(candidates.map((candidate) => candidate.key)).size, 4);
  assert.deepEqual(
    resolveMailSender(candidates, {
      from: "sales@example.com",
      accountEmail: "team@example.com",
    }),
    candidates[3],
    "uses the owning account to disambiguate the same alias"
  );
  assert.equal(
    resolveMailSender(candidates, { from: "owner@example.com" })?.accountId,
    1,
    "supports legacy compose values that only contain from"
  );

  const sourceMessage = {
    id: 1,
    email: "team@example.com",
    identityEmail: "sales@example.com",
    mailId: "message-1",
    rawId: "raw-1",
    boxType: "in",
    isRead: false,
    isDraft: false,
    from: "customer@example.com",
    to: "sales@example.com, colleague@example.com",
    toUsers: [
      { address: "SALES@example.com" },
      { address: "colleague@example.com" },
    ],
    cc: "observer@example.com",
    ccUsers: [{ address: "observer@example.com" }],
    subject: "Question",
    date: "2026-07-27T10:00:00.000Z",
    bodyText: "Hello",
    bodyHtml: "<p>Hello</p>",
    attachments: [],
  };
  assert.equal(
    isMessageUnread({
      ...sourceMessage,
      isRead: true,
      relatedMessagesIsRead: false,
    }),
    true,
    "treats a conversation with unread related messages as unread"
  );
  assert.deepEqual(
    collectMessageMailIds({
      ...sourceMessage,
      relatedMessageIds: ["message-2"],
      children: [
        { ...sourceMessage, id: 2, mailId: "message-2" },
        { ...sourceMessage, id: 3, mailId: "message-3" },
      ],
    }),
    ["message-1", "message-2", "message-3"],
    "marks every provider message in the opened conversation"
  );
  assert.deepEqual(
    markMessageRead({
      ...sourceMessage,
      relatedMessagesIsRead: false,
    }),
    {
      ...sourceMessage,
      isRead: true,
      relatedMessagesIsRead: true,
    },
    "clears the aggregate unread flag together with the current message"
  );
  assert.deepEqual(
    markMessageUnread(sourceMessage),
    {
      ...sourceMessage,
      isRead: false,
      relatedMessagesIsRead: false,
    },
    "sets both the message and conversation unread state"
  );
  const reply = buildComposeInitial(sourceMessage, "replyAll", [
    "team@example.com",
    "sales@example.com",
  ]);

  assert.equal(reply.accountEmail, "team@example.com");
  assert.equal(reply.identityEmail, "sales@example.com");
  assert.equal(reply.to, "customer@example.com, colleague@example.com");
  assert.equal(reply.cc, "observer@example.com");
  assert.equal(reply.reference?.from, "customer@example.com");
  assert.equal(reply.reference?.subject, "Question");
  assert.equal(reply.reference?.preview, "Hello");
  assert.equal(
    reply.body,
    "",
    "keeps the editable reply body separate from the quoted message"
  );
  assert.equal(reply.replyBody, "<p>Hello</p>");
  const serializedReply = serializeReplyQuote(reply.body, reply.replyBody);
  assert.match(
    serializedReply,
    /<div class="nocobase-quote nb-mail-quote" data-role="reply-quote">/,
    "keeps the stable reply-quote marker while preserving the Portal style hook"
  );
  assert.match(
    serializedReply,
    /<blockquote type="cite"[^>]*><p>Hello<\/p><\/blockquote>/,
    "uses semantic cited content for mail-client compatible replies"
  );
  assert.deepEqual(splitReplyQuote(`<p>Thanks</p>${serializedReply}`), {
    body: "<p>Thanks</p>",
    replyBody: "<p>Hello</p>",
  });
  assert.equal(
    canReplyAll(sourceMessage, ["team@example.com", "sales@example.com"]),
    true,
    "shows Reply all when another recipient participates in the message"
  );
  assert.equal(
    canReplyAll(
      {
        ...sourceMessage,
        to: "sales@example.com",
        toUsers: [{ address: "sales@example.com" }],
        cc: "",
        ccUsers: [],
      },
      ["team@example.com", "sales@example.com"]
    ),
    false,
    "hides Reply all when replying would only target the sender"
  );

  const forward = buildComposeInitial(sourceMessage, "forward");
  assert.equal(forward.reference?.from, "customer@example.com");
  assert.match(forward.body || "", /Forwarded message/);

  const rawAddressReply = buildComposeInitial(
    { ...sourceMessage, toUsers: undefined, ccUsers: undefined },
    "replyAll",
    ["sales@example.com"]
  );
  assert.equal(
    rawAddressReply.to,
    "customer@example.com, colleague@example.com"
  );
  assert.equal(rawAddressReply.cc, "observer@example.com");

  const draft = buildComposeInitial(
    {
      id: 7,
      email: "team@example.com",
      identityEmail: "sales@example.com",
      mailId: "",
      rawId: "",
      boxType: "draft",
      isRead: true,
      isDraft: true,
      from: "sales@example.com",
      to: "customer@example.com",
      cc: "",
      bcc: "",
      subject: "Draft subject",
      date: "2026-07-27T10:00:00.000Z",
      bodyText: "",
      bodyHtml: "<p>Draft body</p>",
      attachments: [
        {
          filename: "stored-file",
          mimeType: "text/plain",
          attachmentId: "draft.txt",
          originalname: "draft.txt",
          path: "/tmp/stored-file",
          size: 12,
          encoding: "7bit",
          mimetype: "text/plain",
        },
      ],
    },
    "draft"
  );
  assert.equal(draft.id, 7);
  assert.equal(draft.isDraft, true);
  assert.equal(draft.attachments?.[0].path, "/tmp/stored-file");
  assert.equal(draft.attachments?.[0].filename, "draft.txt");
  assert.equal(draft.attachments?.[0].mimeType, "text/plain");
  assert.throws(
    () =>
      buildComposeInitial(
        {
          ...draft,
          id: 8,
          isDraft: true,
          mailId: "provider-draft",
          rawId: "raw-draft",
        },
        "draft"
      ),
    /read-only/,
    "provider-backed drafts must never enter the local draft mutation workflow"
  );

  const calls = [];
  const originalAction = nocobaseClient.action.bind(nocobaseClient);
  nocobaseClient.action = async (resource, action, options) => {
    calls.push({ resource, action, options });
    if (resource === "mailMassMessages" && action === "list") {
      const page = options.query.page;
      return {
        data:
          page === 1
            ? Array.from({ length: 100 }, (_, index) => ({
                id: index + 1,
                status: "pending",
                message: {},
                to: `user${index + 1}@example.com`,
              }))
            : [
                {
                  id: 101,
                  status: "pending",
                  message: {},
                  to: "user101@example.com",
                },
              ],
        meta: { count: 101 },
      };
    }
    if (resource === "mail" && action === "messageAttachmentUpload") {
      return {
        originalname: "draft.txt",
        filename: "stored-file",
        path: "/tmp/stored-file",
        size: 12,
        encoding: "7bit",
        mimetype: "text/plain",
      };
    }
    if (resource === "mail" && action === "oauth2url") {
      if (!options.query?.type) throw new Error("cannot find type");
      return { url: "https://mail.example.test/authorize" };
    }
    if (resource === "mailMessages" && action === "get") {
      return { id: 42, isDraft: true, subject: "Recovered draft" };
    }
    if (resource === "mail" && action === "accountIdentitiesSync") {
      return [
        { id: 1, email: "team@example.com", isPrimary: true },
        { id: 2, email: "sales@example.com", isPrimary: false },
      ];
    }
    return {};
  };

  try {
    await mailApi.cancelScheduled(7);
    await mailApi.destroyMessages([7, 8]);
    await mailApi.cancelMassMessage(9);
    await mailApi.resendMassMessage(9);
    const massList = await mailApi.listMassMessages(null);
    const uploaded = await mailApi.uploadAttachment(new Blob(["draft"]));

    assert.deepEqual(
      calls.slice(0, 4).map(({ resource, action }) => [resource, action]),
      [
        ["mailMessages", "cancelTimelySend"],
        ["mailMessages", "destroy"],
        ["mailMassMessages", "cancel"],
        ["mailMassMessages", "resend"],
      ]
    );
    assert.deepEqual(calls[0].options.query, { id: 7 });
    assert.deepEqual(calls[1].options.query, { filterByTk: [7, 8] });
    assert.equal(massList.count, 101);
    assert.equal(massList.rows.length, 101, "loads every bulk task page");
    assert.equal(
      calls.filter(
        ({ resource, action }) =>
          resource === "mailMassMessages" && action === "list"
      ).length,
      2
    );
    assert.equal(uploaded.filename, "draft.txt");
    assert.equal(uploaded.mimeType, "text/plain");
    assert.ok(calls.at(-1).options.body instanceof FormData);

    const oauthUrl = await mailApi.getOAuthUrl("google", {
      email: "team@example.com",
      reauthorize: true,
    });
    await mailApi.deleteAccount("team@example.com");
    await mailApi.resyncAccount("team@example.com");
    const recoveredDraft = await mailApi.findDraft({
      accountEmail: "team@example.com",
      identityEmail: "sales@example.com",
      to: ["customer@example.com"],
    });
    const identities = await mailApi.syncAliases("team@example.com");
    assert.equal(oauthUrl, "https://mail.example.test/authorize");
    assert.equal(recoveredDraft?.id, 42);
    assert.deepEqual(
      identities.map((identity) => identity.email),
      ["team@example.com", "sales@example.com"]
    );
    assert.deepEqual(
      calls
        .slice(-5)
        .map(({ resource, action, options }) => [
          resource,
          action,
          options.query ?? options.body,
        ]),
      [
        [
          "mail",
          "oauth2url",
          { type: "google", email: "team@example.com", reauthorize: true },
        ],
        ["mail", "deleteMailAccount", { email: "team@example.com" }],
        ["mail", "messagesResync", { email: "team@example.com" }],
        [
          "mailMessages",
          "get",
          {
            filter: JSON.stringify({
              isDraft: true,
              from: "sales@example.com",
              email: "team@example.com",
              to: ["customer@example.com"],
            }),
            appends: "labels,note",
          },
        ],
        ["mail", "accountIdentitiesSync", { email: "team@example.com" }],
      ]
    );
  } finally {
    nocobaseClient.action = originalAction;
  }

  console.log("NocoBase mail regression tests passed");
} finally {
  await server.close();
}
