import { describe, expect, it } from "vitest";

import type { AppExtension } from "@nocobase/portal-sdk/extensions";

import { sortDevelopmentExtensions } from "@/app/development-order";

describe("development menu ordering", () => {
  it("places explicitly ordered integration demos after existing examples", () => {
    const extensions: AppExtension[] = [
      { id: "request-encryption", priority: 10, dev: { order: 260 } },
      { id: "existing-z" },
      { id: "departments", dev: { order: 230 } },
      { id: "existing-a" },
      { id: "export", dev: { order: 200 } },
    ];

    expect(
      sortDevelopmentExtensions(extensions).map((extension) => extension.id)
    ).toEqual([
      "existing-a",
      "existing-z",
      "export",
      "departments",
      "request-encryption",
    ]);
  });
});
