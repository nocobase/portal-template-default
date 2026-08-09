import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({
  action: vi.fn(),
  request: vi.fn(),
}));

vi.mock("@nocobase/portal-sdk/client", () => ({
  nocobaseClient: client,
}));

import {
  addSpaceUsers,
  listSpaces,
  listSpaceUsers,
  removeSpaceUsers,
} from "../space-api";

describe("multi-space associated user API", () => {
  beforeEach(() => {
    client.action.mockReset();
    client.request.mockReset();
    client.request.mockResolvedValue({ data: { data: [] } });
  });

  it("drops malformed spaces before the manager can select them", async () => {
    client.action.mockResolvedValueOnce({
      data: { data: [{ title: "Missing name" }, { name: " valid " }] },
    });

    await expect(listSpaces()).resolves.toEqual([{ name: "valid" }]);
  });

  it("does not query members without a selected space", async () => {
    await expect(listSpaceUsers(undefined)).resolves.toEqual([]);
    expect(client.action).not.toHaveBeenCalled();
    expect(client.request).not.toHaveBeenCalled();
  });

  it("uses NocoBase's nested associated-resource path", async () => {
    await listSpaceUsers("space alpha");
    await addSpaceUsers("space alpha", [1, 2]);
    await removeSpaceUsers("space alpha", [2]);

    expect(client.request).toHaveBeenNthCalledWith(
      1,
      "spaces/space%20alpha/users:list",
      expect.objectContaining({ method: "GET" })
    );
    expect(client.request).toHaveBeenNthCalledWith(
      2,
      "spaces/space%20alpha/users:add",
      expect.objectContaining({ body: [1, 2] })
    );
    expect(client.request).toHaveBeenNthCalledWith(
      3,
      "spaces/space%20alpha/users:remove",
      expect.objectContaining({ body: [2] })
    );
    expect(client.action).not.toHaveBeenCalled();
  });
});
