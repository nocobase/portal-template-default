import assert from "node:assert/strict";
import test from "node:test";

import {
  clearAcl,
  getAclState,
  loadAcl,
  switchRole,
} from "../dist/acl/index.js";
import {
  nocobaseClient,
  NocoBaseHttpError,
} from "../dist/client/index.js";

const deniedData = {
  portalName: "sales",
  role: "admin",
  roles: ["admin"],
  roleMode: "allow-use-union",
  allowAnonymous: false,
};

test("ACL state retains only a structured Portal access denial", async () => {
  const originalRequest = nocobaseClient.request;
  const previousRole = nocobaseClient.getRole();
  nocobaseClient.setRole("admin");
  nocobaseClient.request = async () => {
    throw new NocoBaseHttpError({
      status: 403,
      message: "You do not have access to this Portal",
      payload: {
        errors: [
          {
            code: "PORTAL_ACCESS_DENIED",
            message: "You do not have access to this Portal",
          },
        ],
        data: deniedData,
      },
    });
  };
  clearAcl();

  try {
    await loadAcl();
    assert.deepEqual(getAclState(), {
      status: "error",
      error: getAclState().error,
      portalAccessDenied: deniedData,
    });
  } finally {
    clearAcl();
    nocobaseClient.request = originalRequest;
    nocobaseClient.setRole(previousRole ?? null);
  }
});

test("ordinary forbidden errors do not enter the Portal denial state", async () => {
  const originalRequest = nocobaseClient.request;
  nocobaseClient.request = async () => {
    throw new NocoBaseHttpError({
      status: 403,
      message: "Forbidden",
      payload: {
        errors: [{ code: "OTHER_FORBIDDEN", message: "Forbidden" }],
        data: deniedData,
      },
    });
  };
  clearAcl();

  try {
    await loadAcl();
    const state = getAclState();
    assert.equal(state.status, "error");
    assert.equal(state.portalAccessDenied, undefined);
  } finally {
    clearAcl();
    nocobaseClient.request = originalRequest;
  }
});

test("switching roles hands off to a full reload without preloading Portal ACL", async () => {
  const originalAction = nocobaseClient.action;
  const originalRequest = nocobaseClient.request;
  const previousRole = nocobaseClient.getRole();
  const actions = [];
  let aclRequestCount = 0;
  nocobaseClient.setRole("admin");
  nocobaseClient.action = async (resource, action) => {
    actions.push(`${resource}:${action}`);
    return {};
  };
  nocobaseClient.request = async () => {
    aclRequestCount += 1;
    return {};
  };

  try {
    await switchRole("member");
    assert.deepEqual(actions, ["users:setDefaultRole", "auth:syncCookies"]);
    assert.equal(aclRequestCount, 0);
    assert.equal(nocobaseClient.getRole(), "member");
    assert.deepEqual(getAclState(), { status: "idle" });
  } finally {
    clearAcl();
    nocobaseClient.action = originalAction;
    nocobaseClient.request = originalRequest;
    nocobaseClient.setRole(previousRole ?? null);
  }
});

for (const failedAction of ["users:setDefaultRole", "auth:syncCookies"]) {
  test(`switching roles restores the previous role when ${failedAction} fails`, async () => {
    const originalAction = nocobaseClient.action;
    const previousRole = nocobaseClient.getRole();
    const expectedError = new Error(`${failedAction} failed`);
    const actions = [];
    nocobaseClient.setRole("admin");
    nocobaseClient.action = async (resource, action) => {
      const actionName = `${resource}:${action}`;
      actions.push(actionName);
      if (actionName === failedAction) throw expectedError;
      return {};
    };

    try {
      await assert.rejects(switchRole("member"), expectedError);
      assert.equal(nocobaseClient.getRole(), "admin");
      assert.equal(actions[0], "users:setDefaultRole");
      assert.ok(
        failedAction === "users:setDefaultRole" ||
          actions.filter((action) => action === "auth:syncCookies").length === 2
      );
    } finally {
      clearAcl();
      nocobaseClient.action = originalAction;
      nocobaseClient.setRole(previousRole ?? null);
    }
  });
}
