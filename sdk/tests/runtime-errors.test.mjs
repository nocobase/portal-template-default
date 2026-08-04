import assert from "node:assert/strict";
import test from "node:test";

import { authProvider } from "../dist/auth/index.js";
import {
  authSession,
  getNocoBaseErrorDetail,
  isNocoBaseLifecycleError,
  isNocoBaseServiceError,
  NocoBaseClient,
  NocoBaseWebSocketClient,
  normalizeNocoBaseRuntimeError,
  resolveNocoBaseWebSocketUrl,
} from "../dist/client/index.js";
import { portalRuntimeStore } from "../dist/runtime/index.js";

const jsonResponse = (status, payload) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
      "x-request-id": `request-${status}`,
    },
  });

test("runtime errors preserve server codes and authentication state", async () => {
  const originalFetch = globalThis.fetch;
  try {
    assert.equal(
      getNocoBaseErrorDetail({ error: { code: "APP_COMMANDING" } })?.code,
      "APP_COMMANDING"
    );
    assert.equal(
      getNocoBaseErrorDetail({ errors: [{ code: "ROLE_NOT_FOUND_ERR" }] })?.code,
      "ROLE_NOT_FOUND_ERR"
    );
    assert.equal(
      isNocoBaseLifecycleError({ code: "APP_PREPARING" }),
      true
    );
    assert.equal(isNocoBaseServiceError({ status: 504 }), true);
    assert.equal(isNocoBaseServiceError({ status: 401 }), false);
    assert.deepEqual(
      normalizeNocoBaseRuntimeError(
        { code: "APP_STOPPED", status: 503, message: "stopped" },
        "websocket"
      ),
      {
        code: "APP_STOPPED",
        status: 503,
        message: "stopped",
        payload: { code: "APP_STOPPED", status: 503, message: "stopped" },
        source: "websocket",
      }
    );

    authSession.clearAuthentication();
    authSession.set("token", "role-token");
    authSession.set("role", "deleted-role");
    const roles = [];
    globalThis.fetch = async (_url, options) => {
      roles.push(options.headers["X-Role"]);
      if (roles.length === 1) {
        return jsonResponse(401, {
          errors: [{ code: "ROLE_NOT_FOUND_FOR_USER", message: "stale role" }],
        });
      }
      return jsonResponse(200, { data: { id: 1, username: "tester" } });
    };

    assert.deepEqual(await authProvider.check(), { authenticated: true });
    assert.equal(authSession.get("token"), "role-token");
    assert.equal(authSession.get("role"), undefined);
    assert.deepEqual(roles, ["deleted-role", undefined]);

    authSession.set("token", "maintenance-token");
    portalRuntimeStore.clear();
    globalThis.fetch = async () =>
      jsonResponse(503, {
        error: {
          code: "APP_PREPARING",
          maintaining: true,
          message: "preparing",
          status: 503,
        },
      });

    assert.deepEqual(await authProvider.check(), { authenticated: true });
    assert.equal(authSession.get("token"), "maintenance-token");
    assert.equal(portalRuntimeStore.getState().error?.code, "APP_PREPARING");

    authSession.set("token", "no-role-token");
    portalRuntimeStore.clear();
    globalThis.fetch = async () =>
      jsonResponse(401, {
        errors: [
          {
            code: "USER_HAS_NO_ROLES_ERR",
            message: "no roles",
          },
        ],
      });

    assert.deepEqual(await authProvider.check(), { authenticated: true });
    assert.equal(authSession.get("token"), "no-role-token");
    assert.equal(
      portalRuntimeStore.getState().error?.code,
      "USER_HAS_NO_ROLES_ERR"
    );

    authSession.set("token", "invalid-token");
    portalRuntimeStore.clear();
    globalThis.fetch = async () =>
      jsonResponse(400, {
        errors: [{ code: "INVALID_TOKEN", message: "invalid token" }],
      });

    assert.deepEqual(await authProvider.check(), {
      authenticated: false,
      redirectTo: "/login",
    });
    assert.equal(authSession.get("token"), undefined);
  } finally {
    globalThis.fetch = originalFetch;
    authSession.clearAuthentication();
    portalRuntimeStore.clear();
  }
});

test("the WebSocket URL preserves the server prefix and selects a sub-application", () => {
  const originalWindow = globalThis.window;
  try {
    globalThis.window = {
      location: { origin: "https://example.com" },
      NOCOBASE_API_URL: "https://example.com/nocobase/api/__app/crm",
      NOCOBASE_PORTAL_BASE: "/nocobase/x/apps/crm/customer/",
    };
    assert.equal(
      resolveNocoBaseWebSocketUrl(),
      "wss://example.com/nocobase/ws?__appName=crm"
    );
  } finally {
    globalThis.window = originalWindow;
  }
});

test("a stale WebSocket cannot disrupt its replacement", () => {
  const originalWebSocket = globalThis.WebSocket;
  const originalWindow = globalThis.window;
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const sockets = [];
  const sentMessages = [];
  const intervals = new Set();
  const timeouts = new Set();
  let timerId = 0;

  class MockWebSocket {
    constructor(url) {
      this.url = url;
      this.readyState = 0;
      sockets.push(this);
    }

    close() {
      this.readyState = 2;
    }

    open() {
      this.readyState = 1;
      this.onopen?.();
    }

    finishClose() {
      this.readyState = 3;
      this.onclose?.();
    }

    message(value) {
      this.onmessage?.({ data: JSON.stringify(value) });
    }

    send(message) {
      sentMessages.push(JSON.parse(message));
    }
  }

  try {
    authSession.clearAuthentication();
    authSession.set("token", "socket-token");
    authSession.set("auth", "basic");
    globalThis.window = {
      location: { origin: "https://example.com" },
      NOCOBASE_API_URL: "https://example.com/api",
    };
    globalThis.WebSocket = MockWebSocket;
    globalThis.setInterval = () => {
      const id = ++timerId;
      intervals.add(id);
      return id;
    };
    globalThis.clearInterval = (id) => intervals.delete(id);
    globalThis.setTimeout = () => {
      const id = ++timerId;
      timeouts.add(id);
      return id;
    };
    globalThis.clearTimeout = (id) => timeouts.delete(id);

    const messages = [];
    const client = new NocoBaseWebSocketClient();
    client.subscribe((message) => messages.push(message));
    client.connect();
    sockets[0].open();
    assert.deepEqual(sentMessages.at(-1), {
      type: "auth:token",
      payload: { token: "socket-token", authenticator: "basic" },
    });
    client.authenticate();
    assert.deepEqual(sentMessages.at(-1), {
      type: "auth:token",
      payload: { token: "socket-token", authenticator: "basic" },
    });
    assert.equal(sentMessages.length, 2);
    client.reconnect();
    sockets[1].open();

    sockets[0].message({ type: "maintaining", payload: { code: "APP_ERROR" } });
    sockets[0].finishClose();
    assert.equal(intervals.size, 1);
    assert.equal(timeouts.size, 0);
    assert.deepEqual(messages, []);

    sockets[1].message({ type: "maintaining", payload: { code: "APP_STOPPED" } });
    assert.equal(messages[0]?.payload?.code, "APP_STOPPED");
    client.close();
  } finally {
    globalThis.WebSocket = originalWebSocket;
    globalThis.window = originalWindow;
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    authSession.clearAuthentication();
    portalRuntimeStore.clear();
  }
});

test("only explicit application lifecycle responses become global runtime states", async () => {
  const originalFetch = globalThis.fetch;
  const client = new NocoBaseClient("https://example.com/api");

  try {
    portalRuntimeStore.clear();
    globalThis.fetch = async () =>
      jsonResponse(504, { message: "report timed out" });

    await assert.rejects(() => client.request("reports:run"));
    assert.equal(portalRuntimeStore.getState().error, undefined);

    globalThis.fetch = async () =>
      jsonResponse(503, {
        error: {
          code: "APP_PREPARING",
          maintaining: true,
          message: "application demo is preparing",
          status: 503,
        },
      });

    await assert.rejects(() => client.request("reports:run"));
    assert.equal(portalRuntimeStore.getState().error?.code, "APP_PREPARING");
    assert.equal(portalRuntimeStore.getState().error?.status, 503);
  } finally {
    globalThis.fetch = originalFetch;
    portalRuntimeStore.clear();
  }
});
