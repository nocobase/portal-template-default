import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const { buildComposeInitial } = await server.ssrLoadModule(
    "/registry/nocobase-mail/components/use-mail-compose.tsx"
  );
  const composeSource = await readFile(
    new URL("../components/mail-compose.tsx", import.meta.url),
    "utf8"
  );
  const originalHtml =
    '<div><strong>Formatted sender</strong><p style="color:red">Original content</p></div>';
  const reply = buildComposeInitial(
    {
      id: 1,
      mailId: "message-1",
      email: "team@example.com",
      from: "customer@example.com",
      to: "team@example.com",
      subject: "Formatted message",
      date: "2026-07-30T10:00:00.000Z",
      bodyText: "Formatted sender Original content",
      bodyHtml: originalHtml,
      attachments: [],
    },
    "reply"
  );

  assert.equal(reply.replyBody, originalHtml);
  assert.equal(
    reply.reference?.html,
    originalHtml,
    "keeps the original HTML available to the quoted-message preview"
  );
  assert.match(
    composeSource,
    /srcDoc=\{contentHtml\}/,
    "renders the quoted-message preview as isolated HTML instead of plain text"
  );
  console.log("mail quote HTML regression checks passed");
} finally {
  await server.close();
}
