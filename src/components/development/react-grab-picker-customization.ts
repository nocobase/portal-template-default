import type { ReactGrabAPI } from "react-grab";

const PORTAL_COPY_PLUGIN = "nocobase-portal-copy-input-line";
const REACT_GRAB_HOST_SELECTOR = '[data-react-grab="true"]';

export const REACT_GRAB_DISABLED_ACTIONS = ["comment", "edit"] as const;

export function appendReactGrabInputLine(content: string) {
  return `${content}\n`;
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
      transformCopyContent: appendReactGrabInputLine,
    },
  });

  const stopObservingToolbar = observeReactGrabToolbar();

  return () => {
    stopObservingToolbar();
    api.unregisterPlugin(PORTAL_COPY_PLUGIN);
  };
}
