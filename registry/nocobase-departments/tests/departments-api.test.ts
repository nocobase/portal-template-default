import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({
  action: vi.fn(),
  request: vi.fn(),
}));

vi.mock("@nocobase/portal-sdk/client", () => ({
  nocobaseClient: client,
}));

import {
  addDepartmentMembers,
  addRoleDepartments,
  listDepartmentMembers,
  removeDepartmentMembers,
} from "../departments-api";

describe("department member API", () => {
  beforeEach(() => {
    client.action.mockReset();
    client.request.mockReset();
    client.request.mockResolvedValue({ data: { data: [] } });
  });

  it("uses NocoBase's nested associated-resource path", async () => {
    await listDepartmentMembers(42);
    await addDepartmentMembers(42, [1, 2]);
    await removeDepartmentMembers(42, [2]);

    expect(client.request).toHaveBeenNthCalledWith(
      1,
      "departments/42/members:list",
      expect.objectContaining({ query: { pageSize: 200 } })
    );
    expect(client.request).toHaveBeenNthCalledWith(
      2,
      "departments/42/members:add",
      expect.objectContaining({ body: [1, 2] })
    );
    expect(client.request).toHaveBeenNthCalledWith(
      3,
      "departments/42/members:remove",
      expect.objectContaining({ body: [2] })
    );
  });

  it("encodes string keys for nested association paths", async () => {
    await addRoleDepartments("space admin", [42]);

    expect(client.request).toHaveBeenCalledWith(
      "roles/space%20admin/departments:add",
      expect.objectContaining({ body: [42] })
    );
  });

  it("rejects a missing department key before making a request", async () => {
    await expect(listDepartmentMembers(undefined as never)).rejects.toThrow(
      "A department must be selected first."
    );
    expect(client.request).not.toHaveBeenCalled();
  });
});
