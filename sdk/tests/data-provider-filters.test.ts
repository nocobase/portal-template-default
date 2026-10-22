import { afterEach, describe, expect, it, vi } from "vitest";

import { nocobaseClient } from "../src/client/index.ts";
import { dataProvider } from "../src/data/index.ts";

type ListParams = Parameters<typeof dataProvider.getList>[0];

const listFilter = async (filters: ListParams["filters"]) => {
  const action = vi
    .spyOn(nocobaseClient, "action")
    .mockResolvedValue({ data: [], meta: { count: 0 } } as never);

  await dataProvider.getList({ resource: "posts", filters });

  const options = action.mock.calls[0]?.[2] as
    | { query?: Record<string, unknown> }
    | undefined;
  const filter = options?.query?.filter;
  return typeof filter === "string" ? JSON.parse(filter) : filter;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("dataProvider filters", () => {
  it("maps `null` to NocoBase's `$empty` operator", async () => {
    await expect(
      listFilter([{ field: "publishedAt", operator: "null", value: true }])
    ).resolves.toEqual({ publishedAt: { $empty: true } });
  });

  it("maps `nnull` to NocoBase's `$notEmpty` operator", async () => {
    await expect(
      listFilter([{ field: "publishedAt", operator: "nnull", value: true }])
    ).resolves.toEqual({ publishedAt: { $notEmpty: true } });
  });

  it("keeps null checks when the caller omits `value`", async () => {
    await expect(
      listFilter([
        { field: "publishedAt", operator: "nnull", value: undefined },
      ])
    ).resolves.toEqual({ publishedAt: { $notEmpty: true } });
  });

  it("maps null checks inside logical groups", async () => {
    await expect(
      listFilter([
        { field: "status", operator: "eq", value: "draft" },
        {
          operator: "or",
          value: [
            { field: "publishedAt", operator: "null", value: true },
            { field: "title", operator: "contains", value: "news" },
          ],
        },
      ])
    ).resolves.toEqual({
      $and: [
        { status: { $eq: "draft" } },
        {
          $or: [
            { publishedAt: { $empty: true } },
            { title: { $includes: "news" } },
          ],
        },
      ],
    });
  });
});
