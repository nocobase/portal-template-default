import { describe, expect, it } from "vitest";
import { getExportFilename } from "../export-api";

describe("export response filenames", () => {
  it("prefers RFC 5987 filenames and decodes Unicode", () => {
    expect(
      getExportFilename(
        "attachment; filename*=UTF-8''%E7%94%A8%E6%88%B7.xlsx",
        "fallback.xlsx"
      )
    ).toBe("用户.xlsx");
  });

  it("uses the application fallback when the header is absent", () => {
    expect(getExportFilename(null, "users.xlsx")).toBe("users.xlsx");
  });
});
