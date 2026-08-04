import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "silent",
  root: fileURLToPath(new URL("..", import.meta.url)),
  resolve: {
    alias: [
      {
        find: "@/extensions/nocobase-acl",
        replacement: fileURLToPath(
          new URL("../registry/nocobase-acl/index.ts", import.meta.url)
        ),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("../src", import.meta.url)),
      },
    ],
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
  const { AclGate } = await server.ssrLoadModule(
    "/src/components/access-control/acl-gate.tsx"
  );
  const { AclStoreProvider } = await server.ssrLoadModule(
    "@nocobase/portal-sdk/acl"
  );

  const renderAclError = (message) => {
    const errorState = { status: "error", error: new Error(message) };
    const store = {
      getState: () => errorState,
      subscribe: () => () => undefined,
      load: async () => errorState,
      retry: async () => errorState,
      clear: () => undefined,
      recordPermissions: {
        getState: () => ({}),
        subscribe: () => () => undefined,
        getPermission: () => undefined,
      },
    };

    return renderToStaticMarkup(
      createElement(
        AclStoreProvider,
        { store },
        createElement(AclGate, null, createElement("span", null, "Allowed"))
      )
    );
  };

  const genericErrorMarkup = renderAclError("Unable to load permissions");
  assert.equal(
    genericErrorMarkup.match(/Unable to load permissions/g)?.length,
    1
  );
  assert.match(
    genericErrorMarkup,
    /Permissions for the current role could not be loaded\./
  );

  const detailedErrorMarkup = renderAclError("Gateway timed out");
  assert.match(detailedErrorMarkup, /Gateway timed out/);

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
