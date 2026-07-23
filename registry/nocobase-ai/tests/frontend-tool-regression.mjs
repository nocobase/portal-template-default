import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const { AIFrontendToolRegistry, createFrontendToolInvokers } =
    await server.ssrLoadModule(
      "/registry/nocobase-ai/providers/frontend-tool-registry.tsx"
    );

  const registry = new AIFrontendToolRegistry();
  const calls = [];
  const unregister = registry.register("quote-card", {
    name: "update_quote_discount",
    description: "Update the quote discount preview.",
    permission: "ASK",
    inputSchema: {
      type: "object",
      properties: { discountPercent: { type: "number" } },
    },
    execute: (args) => {
      calls.push(args);
      return { updated: true };
    },
  });
  const [manifest] = registry.list("quote-card");
  assert.deepEqual(manifest, {
    id: "quote-card:update_quote_discount",
    blockUid: "quote-card",
    name: "update_quote_discount",
    title: undefined,
    description: "Update the quote discount preview.",
    permission: "ASK",
    inputSchema: {
      type: "object",
      properties: { discountPercent: { type: "number" } },
    },
  });

  const invokers = createFrontendToolInvokers(registry);
  assert.deepEqual(
    await invokers.loadFrontendTool({ toolId: manifest.id }, {}),
    manifest
  );
  assert.deepEqual(
    await invokers.executeFrontendTool(
      { toolId: manifest.id, args: { discountPercent: 12 } },
      {}
    ),
    { updated: true }
  );
  assert.deepEqual(calls, [{ discountPercent: 12 }]);

  assert.throws(
    () =>
      registry.register("quote-card", {
        name: "update_quote_discount",
        description: "Duplicate Tool",
        execute: () => undefined,
      }),
    /already registered/
  );
  assert.throws(
    () =>
      registry.register("quote-card", {
        name: "invalid_schema",
        description: "Invalid schema",
        inputSchema: [],
        execute: () => undefined,
      }),
    /inputSchema must be an object/
  );

  const unregisterInvalidResult = registry.register("quote-card", {
    name: "invalid_result",
    description: "Return an invalid result.",
    execute: () => ({ value: 1n }),
  });
  assert.deepEqual(
    await invokers.executeFrontendTool(
      { toolId: "quote-card:invalid_result", args: {} },
      {}
    ),
    {
      status: "error",
      content:
        'Frontend Tool "quote-card:invalid_result" returned a non-serializable result',
    }
  );
  unregisterInvalidResult();

  unregister();
  assert.deepEqual(
    await invokers.executeFrontendTool({ toolId: manifest.id, args: {} }, {}),
    {
      status: "error",
      content:
        'Frontend Tool "quote-card:update_quote_discount" is unavailable',
    }
  );

  console.log("AI frontend Tool regression tests passed");
} finally {
  await server.close();
}
