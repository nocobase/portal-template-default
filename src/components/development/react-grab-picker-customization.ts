import type { ReactGrabAPI } from "react-grab";

declare const __PORTAL_DEV_SOURCE_ROOT__: string;

const PORTAL_COPY_PLUGIN = "nocobase-portal-copy-input-line";
const REACT_GRAB_HOST_SELECTOR = '[data-react-grab="true"]';
const COPY_SOURCE_LOCATION = /\(at ([^)]+)\)/g;

export const REACT_GRAB_DISABLED_ACTIONS = ["comment", "edit"] as const;

interface ReactGrabElementContextLike {
  fiber: unknown;
}

function normalizePortalBase(portalBase: string) {
  const normalized = portalBase.trim().replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}/` : "/";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getFiberDebugStack(fiber: unknown) {
  if (!fiber || typeof fiber !== "object") return null;

  const debugStack = (fiber as { _debugStack?: unknown })._debugStack;
  if (!debugStack || typeof debugStack !== "object") return null;

  const stack = (debugStack as { stack?: unknown }).stack;
  return typeof stack === "string" ? stack : null;
}

function getUniqueSourcePaths(stack: string, portalBase: string) {
  const sourcePaths = new Map<string, string | null>();
  const sourcePattern = new RegExp(
    `${escapeRegExp(normalizePortalBase(portalBase))}` +
      `((?:registry|src)/[^?()\\s]+?\\.[cm]?[jt]sx?)` +
      `(?:\\?[^)\\s]*)?(?::\\d+){0,2}`,
    "g"
  );

  for (const match of stack.matchAll(sourcePattern)) {
    let relativePath: string;
    try {
      relativePath = decodeURIComponent(match[1]);
    } catch {
      relativePath = match[1];
    }
    if (relativePath.includes("..")) continue;

    const fileName = relativePath.split("/").pop();
    if (!fileName) continue;

    const existingPath = sourcePaths.get(fileName);
    if (existingPath === undefined) {
      sourcePaths.set(fileName, relativePath);
    } else if (existingPath !== relativePath) {
      sourcePaths.set(fileName, null);
    }
  }

  return sourcePaths;
}

export function absolutizeSingleReactGrabCopyContent(
  content: string,
  context: ReactGrabElementContextLike,
  sourceRoot: string,
  portalBase: string
) {
  const stack = getFiberDebugStack(context.fiber);
  const normalizedRoot = sourceRoot.replace(/[\\/]+$/, "");
  if (!stack || !normalizedRoot) return content;

  const sourcePaths = getUniqueSourcePaths(stack, portalBase);
  return content.replace(COPY_SOURCE_LOCATION, (match, location) => {
    const source = String(location).match(
      /^(.*\.[cm]?[jt]sx?)(:\d+(?::\d+)?)?$/i
    );
    if (!source) return match;

    const fileName = source[1].replace(/\\/g, "/").split("/").pop();
    const relativePath = fileName ? sourcePaths.get(fileName) : null;
    if (!relativePath) return match;

    return `(at ${normalizedRoot}/${relativePath}${source[2] ?? ""})`;
  });
}

export function appendReactGrabInputLine(content: string) {
  return `${content}\n`;
}

async function transformReactGrabCopyContent(
  content: string,
  elements: Element[]
) {
  if (elements.length !== 1) return appendReactGrabInputLine(content);

  try {
    const { getElementContext } = await import("react-grab/primitives");
    const context = await getElementContext(elements[0]);
    return appendReactGrabInputLine(
      absolutizeSingleReactGrabCopyContent(
        content,
        context,
        __PORTAL_DEV_SOURCE_ROOT__,
        import.meta.env.BASE_URL
      )
    );
  } catch {
    return appendReactGrabInputLine(content);
  }
}

// React Grab 0.1.50 keeps disabled toolbar buttons and the post-copy menu in
// its Shadow DOM, so hide those controls separately and restore them on cleanup.
export function hideDisabledReactGrabToolbarActions(root: ParentNode) {
  const displaySnapshots = new Map<
    HTMLElement,
    { priority: string; value: string }
  >();

  const hideElement = (element: HTMLElement) => {
    if (displaySnapshots.has(element)) return;

    displaySnapshots.set(element, {
      priority: element.style.getPropertyPriority("display"),
      value: element.style.getPropertyValue("display"),
    });
    element.style.setProperty("display", "none", "important");
  };

  for (const action of REACT_GRAB_DISABLED_ACTIONS) {
    const selector = `[data-react-grab-toolbar-action="${action}"]`;

    for (const button of root.querySelectorAll<HTMLElement>(selector)) {
      const wrapper = button.parentElement ?? button;
      hideElement(wrapper);
    }
  }

  for (const button of root.querySelectorAll<HTMLElement>(
    "[data-react-grab-more-options]"
  )) {
    hideElement(button);
  }

  return () => {
    for (const [wrapper, snapshot] of displaySnapshots) {
      if (snapshot.value) {
        wrapper.style.setProperty(
          "display",
          snapshot.value,
          snapshot.priority
        );
      } else {
        wrapper.style.removeProperty("display");
      }
    }
    displaySnapshots.clear();
  };
}

function observeReactGrabToolbar() {
  if (typeof document === "undefined") return () => {};

  const observedRoots = new Map<ShadowRoot, () => void>();

  const observeRoot = (root: ShadowRoot) => {
    if (observedRoots.has(root)) return;

    let restoreActions = hideDisabledReactGrabToolbarActions(root);
    const observer = new MutationObserver(() => {
      restoreActions();
      restoreActions = hideDisabledReactGrabToolbarActions(root);
    });
    observer.observe(root, { childList: true, subtree: true });

    observedRoots.set(root, () => {
      observer.disconnect();
      restoreActions();
    });
  };

  const observeAvailableRoots = () => {
    for (const host of document.querySelectorAll<HTMLElement>(
      REACT_GRAB_HOST_SELECTOR
    )) {
      if (host.shadowRoot) observeRoot(host.shadowRoot);
    }
  };

  observeAvailableRoots();

  const documentObserver = new MutationObserver(observeAvailableRoots);
  documentObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  return () => {
    documentObserver.disconnect();
    for (const disconnect of observedRoots.values()) disconnect();
    observedRoots.clear();
  };
}

export function configureReactGrabPicker(api: ReactGrabAPI) {
  for (const action of REACT_GRAB_DISABLED_ACTIONS) {
    api.unregisterPlugin(action);
  }
  api.setToolbarState({ defaultAction: "copy" });
  api.registerPlugin({
    name: PORTAL_COPY_PLUGIN,
    hooks: {
      transformCopyContent: transformReactGrabCopyContent,
    },
  });

  const stopObservingToolbar = observeReactGrabToolbar();

  return () => {
    stopObservingToolbar();
    api.unregisterPlugin(PORTAL_COPY_PLUGIN);
  };
}
