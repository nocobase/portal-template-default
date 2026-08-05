import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const {
    REACT_GRAB_DISABLED_ACTIONS,
    absolutizeSingleReactGrabCopyContent,
    appendReactGrabInputLine,
    configureReactGrabPicker,
    hideDisabledReactGrabToolbarActions,
  } = await server.ssrLoadModule(
    "/src/components/development/react-grab-picker-customization.ts"
  );

  assert.deepEqual([...REACT_GRAB_DISABLED_ACTIONS], ["comment", "edit"]);
  assert.equal(
    appendReactGrabInputLine("[default React Grab context]"),
    "[default React Grab context]\n"
  );

  const sourceRoot = "/workspace/portal-template-default";
  const defaultContent =
    "[<div /> in NocoBaseRuntimeStatus (at runtime-status.tsx) in PortalRuntimeGate (at portal-runtime-gate.tsx) in App (at App.tsx)]";
  const context = {
    fiber: {
      _debugStack: {
        stack: [
          "Error: react-stack-top-frame",
          "    at NocoBaseRuntimeStatus (http://localhost:5173/x/admin/registry/nocobase-error-boundary/runtime-status.tsx?t=1:501:7)",
          "    at PortalRuntimeGate (http://localhost:5173/x/admin/src/components/app-shell/portal-runtime-gate.tsx?t=1:101:9)",
          "    at App (http://localhost:5173/x/admin/src/App.tsx?t=1:42:5)",
        ].join("\n"),
      },
    },
  };

  assert.equal(
    absolutizeSingleReactGrabCopyContent(
      defaultContent,
      context,
      sourceRoot,
      "/x/admin/"
    ),
    `[<div /> in NocoBaseRuntimeStatus (at ${sourceRoot}/registry/nocobase-error-boundary/runtime-status.tsx) in PortalRuntimeGate (at ${sourceRoot}/src/components/app-shell/portal-runtime-gate.tsx) in App (at ${sourceRoot}/src/App.tsx)]`
  );

  const ambiguousContext = {
    fiber: {
      _debugStack: {
        stack: [
          "    at FirstCard (http://localhost:5173/x/admin/src/first/index.tsx:10:2)",
          "    at SecondCard (http://localhost:5173/x/admin/src/second/index.tsx:20:4)",
        ].join("\n"),
      },
    },
  };
  assert.equal(
    absolutizeSingleReactGrabCopyContent(
      "[<div /> in Card (at index.tsx)]",
      ambiguousContext,
      sourceRoot,
      "/x/admin/"
    ),
    "[<div /> in Card (at index.tsx)]"
  );

  const createStyle = (display = "", priority = "") => {
    let currentDisplay = display;
    let currentPriority = priority;

    return {
      getPropertyPriority(property) {
        assert.equal(property, "display");
        return currentPriority;
      },
      getPropertyValue(property) {
        assert.equal(property, "display");
        return currentDisplay;
      },
      removeProperty(property) {
        assert.equal(property, "display");
        currentDisplay = "";
        currentPriority = "";
      },
      setProperty(property, value, nextPriority = "") {
        assert.equal(property, "display");
        currentDisplay = value;
        currentPriority = nextPriority;
      },
    };
  };

  const commentWrapper = { style: createStyle("inline-flex") };
  const editWrapper = { style: createStyle() };
  const moreOptionsButton = { style: createStyle("inline-flex") };
  const toolbarRoot = {
    querySelectorAll(selector) {
      if (selector.includes('"comment"')) {
        return [{ parentElement: commentWrapper }];
      }
      if (selector.includes('"edit"')) {
        return [{ parentElement: editWrapper }];
      }
      if (selector === "[data-react-grab-more-options]") {
        return [moreOptionsButton];
      }
      return [];
    },
  };

  const restoreToolbarActions = hideDisabledReactGrabToolbarActions(toolbarRoot);
  assert.equal(commentWrapper.style.getPropertyValue("display"), "none");
  assert.equal(commentWrapper.style.getPropertyPriority("display"), "important");
  assert.equal(editWrapper.style.getPropertyValue("display"), "none");
  assert.equal(moreOptionsButton.style.getPropertyValue("display"), "none");
  assert.equal(
    moreOptionsButton.style.getPropertyPriority("display"),
    "important"
  );
  restoreToolbarActions();
  assert.equal(commentWrapper.style.getPropertyValue("display"), "inline-flex");
  assert.equal(editWrapper.style.getPropertyValue("display"), "");
  assert.equal(
    moreOptionsButton.style.getPropertyValue("display"),
    "inline-flex"
  );

  const activeCursorAttributes = new Set();
  let cursorStyle = null;
  let cursorStyleRemoved = false;
  const previousDocument = globalThis.document;
  const previousMutationObserver = globalThis.MutationObserver;

  globalThis.document = {
    createElement(tagName) {
      assert.equal(tagName, "style");
      return {
        textContent: "",
        remove() {
          cursorStyleRemoved = true;
        },
      };
    },
    documentElement: {
      removeAttribute(name) {
        activeCursorAttributes.delete(name);
      },
      toggleAttribute(name, force) {
        if (force) activeCursorAttributes.add(name);
        else activeCursorAttributes.delete(name);
      },
    },
    head: {
      append(style) {
        cursorStyle = style;
      },
    },
    querySelectorAll() {
      return [];
    },
  };
  globalThis.MutationObserver = class {
    disconnect() {}
    observe() {}
  };

  try {
    let pickerPlugin = null;
    const unregisteredPlugins = [];
    const removePickerCustomizations = configureReactGrabPicker({
      isActive: () => false,
      registerPlugin(plugin) {
        pickerPlugin = plugin;
      },
      setToolbarState() {},
      unregisterPlugin(name) {
        unregisteredPlugins.push(name);
      },
    });

    assert.match(cursorStyle?.textContent ?? "", /cursor:\s*default\s*!important/);
    pickerPlugin.hooks.onStateChange({ isActive: true });
    assert.equal(activeCursorAttributes.size, 1);
    pickerPlugin.hooks.onStateChange({ isActive: false });
    assert.equal(activeCursorAttributes.size, 0);

    removePickerCustomizations();
    assert.equal(cursorStyleRemoved, true);
    assert.equal(activeCursorAttributes.size, 0);
    assert.equal(
      unregisteredPlugins.at(-1),
      "nocobase-portal-copy-input-line"
    );
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;

    if (previousMutationObserver === undefined) {
      delete globalThis.MutationObserver;
    } else {
      globalThis.MutationObserver = previousMutationObserver;
    }
  }

  const appSource = await readFile(
    new URL("../src/App.tsx", import.meta.url),
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
  assert.match(pickerSource, /import\("react-grab\/core"\)/);
  assert.match(pickerSource, /telemetry:\s*false/);
  assert.match(pickerSource, /configureReactGrabPicker/);
  assert.doesNotMatch(
    pickerSource,
    /toolbar:\s*\{|<Button|ChevronUp|freezeReactUpdates/
  );

  await assert.rejects(
    access(
      new URL(
        "../src/components/development/react-grab-picker-content.ts",
        import.meta.url
      )
    ),
    { code: "ENOENT" }
  );

  console.log("React Grab picker customization regression tests passed");
} finally {
  await server.close();
}
