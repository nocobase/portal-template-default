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
  await server.ssrLoadModule("/client/locales/index.ts");
  const {
    applySystemLocale,
    getCurrentLocale,
    i18n,
    registerTranslationResources,
    resolveTranslatableText,
    translate,
  } = await server.ssrLoadModule("@nocobase/portal-sdk/i18n");

  await i18n.changeLanguage("en-US");
  assert.equal(translate("buttons.create", { ns: "starter" }, "Create"), "Create");

  await i18n.changeLanguage("zh-CN");
  assert.equal(translate("buttons.create", { ns: "starter" }, "Create"), "新建");
  assert.equal(resolveTranslatableText('{{t("Admin")}}'), "管理员");
  assert.equal(
    resolveTranslatableText("Full permissions", { ns: "starter" }),
    "全部权限"
  );

  registerTranslationResources("example-feature", {
    "en-US": { title: "Example" },
    "zh-CN": { title: "示例" },
  });
  assert.equal(
    translate("title", { ns: "example-feature" }, "Example"),
    "示例"
  );

  await applySystemLocale({
    appLang: "en-US",
    enabledLanguages: ["en-US", "zh-CN"],
  });
  assert.equal(getCurrentLocale(), "en-US");

  console.log("NocoBase i18n regression tests passed");
} finally {
  await server.close();
}
