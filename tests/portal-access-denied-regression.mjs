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
  const { PortalAccessDeniedView } = await server.ssrLoadModule(
    "/src/components/access-control/portal-access-denied.tsx"
  );
  const { hasMultipleUserRoles } = await server.ssrLoadModule(
    "/src/components/access-control/portal-access-denied-roles.ts"
  );
  const { AclStoreProvider } = await server.ssrLoadModule(
    "@nocobase/portal-sdk/acl"
  );
  const { starter: zhCN } = await server.ssrLoadModule(
    "/src/locales/zh-CN.ts"
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

  const portalDeniedMarkup = renderToStaticMarkup(
    createElement(PortalAccessDeniedView, {
      title: "You do not have access to this Portal",
      description:
        "Your current role cannot access this Portal. Select another role to try again.",
      currentRoleTitle: "Administrator",
      roleSwitcher: createElement("button", { type: "button" }, "Administrator"),
    })
  );
  assert.match(portalDeniedMarkup, />403</);
  assert.match(portalDeniedMarkup, /role="region"/);
  assert.match(portalDeniedMarkup, /aria-label="Switch role"/);
  assert.match(portalDeniedMarkup, /Current role/);
  assert.match(portalDeniedMarkup, /Administrator/);
  assert.match(portalDeniedMarkup, /Select role/);
  assert.match(
    portalDeniedMarkup,
    /Portal access will be checked again after switching\./
  );

  const portalDeniedWithoutSwitcherMarkup = renderToStaticMarkup(
    createElement(PortalAccessDeniedView, {
      title: "You do not have access to this Portal",
      description:
        "Your current role cannot access this Portal. Select another role to try again.",
    })
  );
  assert.doesNotMatch(portalDeniedWithoutSwitcherMarkup, /role="region"/);

  assert.equal(zhCN["acl.portalAccessDenied.title"], "无权访问此门户");
  assert.equal(
    zhCN["acl.portalAccessDenied.description"],
    "当前角色没有访问权限，请切换角色后重试。"
  );
  assert.equal(zhCN["acl.roleSwitcher.selectRole"], "选择角色");
  assert.equal(
    zhCN["acl.roleSwitcher.recheckPortalAccess"],
    "切换后将重新检查门户访问权限"
  );
  assert.equal(hasMultipleUserRoles([{ name: "admin" }]), false);
  assert.equal(
    hasMultipleUserRoles([
      { name: "__union__" },
      { name: "admin" },
    ]),
    false
  );
  assert.equal(
    hasMultipleUserRoles([
      { name: "admin" },
      { name: "member" },
    ]),
    true
  );

  console.log("NocoBase Portal access denied regression tests passed");
} finally {
  await server.close();
}
