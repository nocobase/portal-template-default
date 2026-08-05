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
    appendReactGrabInputLine,
    hideDisabledReactGrabToolbarActions,
  } = await server.ssrLoadModule(
    "/src/components/development/react-grab-picker-customization.ts"
  );

  assert.deepEqual([...REACT_GRAB_DISABLED_ACTIONS], ["comment", "edit"]);
  assert.equal(
    appendReactGrabInputLine("[default React Grab context]"),
    "[default React Grab context]\n"
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
