import { describe, expect, it } from "vitest";
import { decodeRequestQuery, encodeRequestQuery } from "../request-encoding";

describe("request query encoding", () => {
  it("round-trips Unicode and structured query values", () => {
    const query = { keyword: "客户", page: 2, "sort[]": ["createdAt"] };
    const encoded = encodeRequestQuery(query);
    expect(Object.keys(encoded)).toEqual(["__encoded__"]);
    expect(decodeRequestQuery(String(encoded.__encoded__))).toEqual(query);
  });

  it("does not double encode an encoded query", () => {
    expect(encodeRequestQuery({ __encoded__: "ready" })).toEqual({
      __encoded__: "ready",
    });
  });
});
