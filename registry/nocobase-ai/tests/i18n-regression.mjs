import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const { portalI18nReady } = await server.ssrLoadModule(
    "/client/providers/i18n/runtime.ts"
  );
  await portalI18nReady;
  await server.ssrLoadModule("/registry/nocobase-ai/locales/index.ts");
  const { i18n, translate } = await server.ssrLoadModule(
    "@nocobase/portal-sdk/i18n"
  );

  await i18n.changeLanguage("en-US");
  assert.equal(
    translate("chat.conversations", { ns: "nocobase-ai" }),
    "Conversations"
  );
  assert.equal(
    translate("tool.status.approvalRequired", { ns: "nocobase-ai" }),
    "Approval required"
  );

  await i18n.changeLanguage("zh-CN");
  assert.equal(
    translate("navigation.chat", { ns: "nocobase-ai" }),
    "聊天窗口"
  );
  assert.equal(
    translate("chat.composer.send", { ns: "nocobase-ai" }),
    "发送消息"
  );
  assert.equal(
    translate("pageElement.pick", { ns: "nocobase-ai" }),
    "选择一个页面元素"
  );
  assert.equal(
    translate("tool.status.approvalRequired", { ns: "nocobase-ai" }),
    "需要确认"
  );
  assert.equal(
    translate("demo.context.title", { ns: "nocobase-ai" }),
    "页面上下文和前端工具"
  );

  console.log("NocoBase AI i18n regression tests passed");
} finally {
  await server.close();
}
