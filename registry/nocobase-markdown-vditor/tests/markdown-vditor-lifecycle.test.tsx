import { render } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const vditorState = vi.hoisted(() => ({
  instances: [] as Array<{
    initialized: boolean;
    destroyed: boolean;
    options: {
      after?: () => void;
      _lutePath?: string;
      i18n?: unknown;
      icon?: string;
      toolbar?: string[];
      upload?: unknown;
    };
  }>,
}));

vi.mock("vditor", () => {
  class MockVditor {
    initialized = false;
    destroyed = false;
    options: {
      after?: () => void;
      _lutePath?: string;
      i18n?: unknown;
      icon?: string;
      toolbar?: string[];
      upload?: unknown;
    };

    constructor(
      _element: HTMLElement,
      options: {
        after?: () => void;
        _lutePath?: string;
        i18n?: unknown;
        icon?: string;
        toolbar?: string[];
        upload?: unknown;
      }
    ) {
      // Vditor merges enumerable `undefined` values over its defaults. Keeping
      // the upload toolbar item with `upload: undefined` reproduces its real
      // `vditor.options.upload.multiple` initialization crash.
      if (
        options.toolbar?.includes("upload") &&
        Object.hasOwn(options, "upload") &&
        options.upload === undefined
      ) {
        throw new TypeError(
          "Cannot read properties of undefined (reading 'multiple')"
        );
      }
      this.options = options;
      vditorState.instances.push(this);
    }

    destroy() {
      if (!this.initialized) {
        throw new TypeError(
          "Cannot read properties of undefined (reading 'element')"
        );
      }
      this.destroyed = true;
    }

    completeInitialization() {
      this.initialized = true;
      this.options.after?.();
    }

    enable() {}
    disabled() {}
    getValue() { return ""; }
    setValue() {}
  }

  return { default: MockVditor };
});

import { MarkdownVditor } from "../markdown-vditor";

describe("MarkdownVditor lifecycle", () => {
  beforeEach(() => {
    vditorState.instances.length = 0;
  });

  it("survives Strict Mode cleanup while Vditor is still initializing", async () => {
    const view = render(
      <StrictMode>
        <MarkdownVditor value="# Notes" />
      </StrictMode>
    );

    expect(vditorState.instances).toHaveLength(2);
    const abandoned = vditorState.instances[0];
    const active = vditorState.instances[1];

    expect(active.options._lutePath).toContain("lute.min.js");
    expect(active.options.i18n).toBeDefined();
    expect(active.options.icon).toBe("");
    expect(active.options.toolbar).not.toContain("upload");
    expect(Object.hasOwn(active.options, "upload")).toBe(false);

    abandoned.initialized = true;
    abandoned.options.after?.();
    await Promise.resolve();
    expect(abandoned.destroyed).toBe(true);

    active.initialized = true;
    active.options.after?.();
    await Promise.resolve();
    view.unmount();
    expect(active.destroyed).toBe(true);
  });

  it("only enables the upload toolbar when an upload adapter is provided", () => {
    render(
      <MarkdownVditor
        uploadFile={async (file) => ({ filename: file.name, url: "/file" })}
      />
    );

    const active = vditorState.instances[0];
    expect(active.options.toolbar).toContain("upload");
    expect(active.options.upload).toMatchObject({ multiple: false });
  });
});
