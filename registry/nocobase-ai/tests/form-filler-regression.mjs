import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const { AIFormRegistry, createFormFillerInvoker } =
    await server.ssrLoadModule(
      "/registry/nocobase-ai/providers/form-registry.tsx"
    );

  const registry = new AIFormRegistry();
  const applied = [];
  const unregister = registry.register({
    id: "lead-form",
    title: "Lead form",
    fields: [],
    getValues: () => ({}),
    setValues: (values) => applied.push(values),
  });
  const invoke = createFormFillerInvoker(registry);

  assert.deepEqual(
    await invoke({
      form: "lead-form",
      data: { company: "Acme", priority: "high" },
    }),
    {
      status: "success",
      content:
        'Filled "Lead form". Please review the values and submit the form manually.',
    }
  );
  assert.deepEqual(applied, [{ company: "Acme", priority: "high" }]);

  unregister();
  assert.deepEqual(
    await invoke({ form: "lead-form", data: { company: "Acme" } }),
    {
      status: "error",
      content: 'The target form "lead-form" is not available on this page.',
    }
  );

  console.log("AI Form filler regression tests passed");
} finally {
  await server.close();
}
