import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const { formatReactGrabContexts } = await server.ssrLoadModule(
    "/src/components/development/react-grab-picker-content.ts"
  );

  assert.equal(
    formatReactGrabContexts(
      [
        {
          componentName: "AuthLayout",
          filePath: "auth-layout.tsx",
          lineNumber: 23,
          columnNumber: 10,
          snippet: '<h1 class="text-3xl">Welcome back</h1>',
          stackString:
            "\n  in AuthLayout (at auth-layout.tsx)\n  in Login (at index.tsx)",
        },
      ],
      "http://localhost:5173/signin"
    ),
    [
      "Component: AuthLayout",
      "Source: auth-layout.tsx:23:10",
      "Page: http://localhost:5173/signin",
      "Stack:",
      "  in AuthLayout (at auth-layout.tsx)",
      "  in Login (at index.tsx)",
      "Snippet:",
      '<h1 class="text-3xl">Welcome back</h1>',
    ].join("\n")
  );

  assert.match(
    formatReactGrabContexts(
      [
        {
          componentName: null,
          filePath: null,
          lineNumber: null,
          columnNumber: null,
          snippet: "<div>Plain element</div>",
          stackString: "",
        },
      ],
      "http://localhost:5173/"
    ),
    /^Component: Unknown\nSource: unavailable\n/
  );

  const safePageContext = formatReactGrabContexts(
    [
      {
        componentName: "SignInForm",
        filePath: "sign-in-form.tsx",
        lineNumber: 42,
        columnNumber: 7,
        snippet: "<form />",
        stackString: "\n  in SignInForm (at sign-in-form.tsx)",
      },
    ],
    "http://localhost:5173/signin?token=secret#callback"
  );
  assert.match(safePageContext, /Page: http:\/\/localhost:5173\/signin\n/);
  assert.doesNotMatch(safePageContext, /secret|token=|callback/);

  const appSource = await readFile(new URL("../src/App.tsx", import.meta.url),
    "utf8"
  );
  assert.match(appSource, /import\.meta\.env\.DEV/);
  assert.match(appSource, /react-grab-picker/);

  const pickerSource = await readFile(
    new URL(
      "../src/components/development/react-grab-picker.tsx",
      import.meta.url
    ),
    "utf8"
  );
  assert.match(pickerSource, /freezeReactUpdates:\s*false/);

  console.log("React Grab picker regression tests passed");
} finally {
  await server.close();
}
