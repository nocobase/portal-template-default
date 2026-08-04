import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "silent",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../src", import.meta.url)),
    },
  },
  server: { middlewareMode: true },
});

try {
  const { NocoBaseHttpError } = await server.ssrLoadModule(
    "/sdk/src/client/error.ts"
  );
  const { getPortalAccessDeniedData } = await server.ssrLoadModule(
    "/sdk/src/acl/portal-access.ts"
  );
  const { resolveRoleSwitcherContext } = await server.ssrLoadModule(
    "/registry/nocobase-acl/components/role-switcher-context.ts"
  );

  const deniedData = {
    portalName: "sales",
    role: "admin",
    roles: ["admin"],
    roleMode: "allow-use-union",
    allowAnonymous: true,
  };
  const deniedError = new NocoBaseHttpError({
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

  assert.deepEqual(getPortalAccessDeniedData(deniedError), deniedData);
  const emptyRoleDenied = getPortalAccessDeniedData(
    new NocoBaseHttpError({
      status: 403,
      message: "You do not have access to this Portal",
      payload: {
        errors: [{ code: "PORTAL_ACCESS_DENIED" }],
        data: { ...deniedData, role: "" },
      },
    })
  );
  assert.equal(emptyRoleDenied?.role, undefined);
  assert.equal(
    getPortalAccessDeniedData(
      new NocoBaseHttpError({
        status: 403,
        message: "No permissions",
        payload: { errors: [{ code: "OTHER_FORBIDDEN" }], data: deniedData },
      })
    ),
    undefined
  );
  assert.equal(
    getPortalAccessDeniedData(
      new NocoBaseHttpError({
        status: 403,
        message: "You do not have access to this Portal",
        payload: {
          errors: [{ code: "PORTAL_ACCESS_DENIED" }],
          data: { ...deniedData, roles: ["admin", 1] },
        },
      })
    ),
    undefined
  );
  assert.equal(
    getPortalAccessDeniedData(
      new NocoBaseHttpError({
        status: 500,
        message: "Server error",
        payload: {
          errors: [{ code: "PORTAL_ACCESS_DENIED" }],
          data: deniedData,
        },
      })
    ),
    undefined
  );

  assert.deepEqual(
    resolveRoleSwitcherContext(
      {
        status: "error",
        error: deniedError,
        portalAccessDenied: deniedData,
      },
      "member"
    ),
    {
      currentRole: "admin",
      roleMode: "allow-use-union",
      allowAnonymous: true,
    }
  );
  assert.deepEqual(
    resolveRoleSwitcherContext(
      { status: "error", error: new Error("Network error") },
      "admin"
    ),
    { currentRole: "admin" }
  );
  assert.deepEqual(
    resolveRoleSwitcherContext(
      {
        status: "error",
        error: deniedError,
        portalAccessDenied: { ...deniedData, role: "" },
      },
      "member"
    ),
    {
      currentRole: "member",
      roleMode: "allow-use-union",
      allowAnonymous: true,
    }
  );
  assert.deepEqual(
    resolveRoleSwitcherContext(
      {
        status: "ready",
        permissions: {
          currentRole: "member",
          roles: ["member"],
          roleMode: "default",
          allowAnonymous: false,
        },
      },
      "admin"
    ),
    {
      currentRole: "member",
      roleMode: "default",
      allowAnonymous: false,
    }
  );

  console.log("NocoBase Portal access denied regression tests passed");
} finally {
  await server.close();
}
