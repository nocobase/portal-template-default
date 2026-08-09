import { useEffect, useRef } from "react";
import Vditor from "vditor";
import "vditor/dist/index.css";
import "vditor/dist/js/icons/ant.js";
import lutePath from "vditor/dist/js/lute/lute.min.js?url";

import { stripMarkdownIframes } from "./sanitize";
import type { MarkdownVditorProps } from "./types";
import { checkVditorStorage } from "./vditor-api";
import { resolveVditorI18n } from "./vditor-i18n";

const DEFAULT_TOOLBAR = [
  "emoji",
  "headings",
  "bold",
  "italic",
  "strike",
  "link",
  "|",
  "list",
  "ordered-list",
  "check",
  "outdent",
  "indent",
  "|",
  "quote",
  "line",
  "code",
  "inline-code",
  "insert-before",
  "insert-after",
  "|",
  "upload",
  "table",
  "|",
  "undo",
  "redo",
  "|",
  "fullscreen",
  "edit-mode",
  "preview",
];

export function MarkdownVditor({
  value = "",
  onChange,
  disabled,
  mode = "ir",
  minHeight = 240,
  placeholder,
  toolbar = DEFAULT_TOOLBAR,
  fileCollection = "attachments",
  uploadFile,
}: MarkdownVditorProps) {
  const root = useRef<HTMLDivElement>(null);
  const editor = useRef<Vditor | undefined>(undefined);
  const change = useRef(onChange);
  const latestValue = useRef(value);
  const latestDisabled = useRef(disabled);
  change.current = onChange;
  latestValue.current = value;
  latestDisabled.current = disabled;
  const activeToolbar = uploadFile
    ? toolbar
    : toolbar.filter((item) => item !== "upload");
  const toolbarKey = activeToolbar.join("\u0000");

  useEffect(() => {
    if (!root.current) return;

    let instance: Vditor | undefined;
    let initialized = false;
    let disposed = false;
    let destroyed = false;

    const destroy = () => {
      if (!instance || destroyed) return;
      destroyed = true;
      instance.destroy();
    };

    const locale = navigator.language || "en-US";
    instance = new Vditor(root.current, {
      value: stripMarkdownIframes(value),
      mode,
      minHeight,
      placeholder,
      toolbar: activeToolbar as never,
      lang: locale.toLowerCase().startsWith("zh") ? "zh_CN" : "en_US",
      i18n: resolveVditorI18n(locale),
      _lutePath: lutePath,
      // The Ant icon sprite is bundled above. An empty value prevents Vditor
      // from injecting another script tag that points at its public CDN.
      icon: "" as never,
      cache: { enable: false },
      undoDelay: 0,
      preview: { markdown: { sanitize: true } },
      after: () => {
        // Vditor can invoke `after` before its constructor has returned when the
        // language bundle is cached. Deferring also lets Strict Mode cleanup
        // mark an abandoned initialization before we publish the instance.
        queueMicrotask(() => {
          if (!instance || destroyed) return;
          initialized = true;
          if (disposed) {
            destroy();
            return;
          }
          editor.current = instance;
          const safe = stripMarkdownIframes(latestValue.current);
          if (instance.getValue() !== safe) instance.setValue(safe);
          latestDisabled.current ? instance.disabled() : instance.enable();
        });
      },
      input: (next) => {
        if (!instance || destroyed) return;
        const safe = stripMarkdownIframes(next);
        if (safe !== next) instance.setValue(safe);
        change.current?.(safe);
      },
      ...(uploadFile
        ? {
            upload: {
              multiple: false,
              fieldName: "file",
              handler: async (files) => {
                const file = files[0];
                if (!file || !instance || destroyed) return null;
                try {
                  instance.tip("Uploading...", 0);
                  const storage = await checkVditorStorage(fileCollection);
                  if (disposed || destroyed) return null;
                  const result = await uploadFile(file, storage);
                  if (disposed || destroyed) return null;
                  instance.insertValue(
                    file.type.startsWith("image/")
                      ? `![${result.filename}](${result.url})`
                      : `[${result.filename}](${result.url})`
                  );
                  instance.tip("Uploaded", 1000);
                } catch (error) {
                  if (!disposed && !destroyed) {
                    instance.tip(
                      error instanceof Error ? error.message : String(error),
                      3000
                    );
                  }
                }
                return null;
              },
            },
          }
        : {}),
    });

    return () => {
      disposed = true;
      if (editor.current === instance) editor.current = undefined;
      if (initialized) destroy();
    };
  }, [
    fileCollection,
    minHeight,
    mode,
    placeholder,
    toolbarKey,
    uploadFile,
  ]);

  useEffect(() => {
    const instance = editor.current;
    if (!instance) return;
    const safe = stripMarkdownIframes(value);
    if (instance.getValue() !== safe) instance.setValue(safe);
  }, [value]);

  useEffect(() => {
    if (!editor.current) return;
    disabled ? editor.current.disabled() : editor.current.enable();
  }, [disabled]);

  return (
    <div
      ref={root}
      className="overflow-hidden rounded-lg border bg-background"
    />
  );
}
