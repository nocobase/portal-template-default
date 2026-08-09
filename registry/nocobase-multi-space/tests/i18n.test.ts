import { beforeAll, describe, expect, it } from "vitest";

import { i18n, translate } from "@nocobase/portal-sdk/i18n";
import { portalI18nReady } from "@/providers/i18n/runtime";
import "../locales";

describe("multi-space translations", () => {
  beforeAll(() => portalI18nReady);

  it("provides English and Chinese page and switcher copy", async () => {
    await i18n.changeLanguage("en-US");
    expect(translate("switcher.label", { ns: "nocobase-multi-space" })).toBe(
      "Switch workspace"
    );
    expect(translate("manager.members", { ns: "nocobase-multi-space" })).toBe(
      "Members"
    );
    expect(translate("space.unassigned", { ns: "nocobase-multi-space" })).toBe(
      "(Unassigned Space)"
    );

    await i18n.changeLanguage("zh-CN");
    expect(translate("demo.title", { ns: "nocobase-multi-space" })).toBe(
      "工作空间管理"
    );
    expect(translate("action.addUsers", { ns: "nocobase-multi-space" })).toBe(
      "添加用户"
    );
    expect(translate("space.unassigned", { ns: "nocobase-multi-space" })).toBe(
      "（未分配空间）"
    );
  });
});
