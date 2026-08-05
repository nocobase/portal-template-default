import type { ReactGrabElementContext } from "react-grab/primitives";

type ReactGrabCopyContext = Pick<
  ReactGrabElementContext,
  | "componentName"
  | "filePath"
  | "lineNumber"
  | "columnNumber"
  | "snippet"
  | "stackString"
>;

const formatSourceLocation = (context: ReactGrabCopyContext) => {
  const location = [
    context.filePath,
    context.lineNumber,
    context.columnNumber,
  ]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .join(":");

  return location || "unavailable";
};

const formatStack = (stackString: string) => {
  if (!stackString.trim()) return "Stack: unavailable";
  return `Stack:${stackString.startsWith("\n") ? "" : "\n"}${stackString}`;
};

const formatPageUrl = (pageUrl: string) => {
  try {
    const url = new URL(pageUrl);
    return `${url.origin}${url.pathname}`;
  } catch {
    return pageUrl.split(/[?#]/, 1)[0] || "unavailable";
  }
};

export const formatReactGrabContexts = (
  contexts: ReactGrabCopyContext[],
  pageUrl: string
) =>
  contexts
    .map((context) =>
      [
        `Component: ${context.componentName ?? "Unknown"}`,
        `Source: ${formatSourceLocation(context)}`,
        `Page: ${formatPageUrl(pageUrl)}`,
        formatStack(context.stackString),
        `Snippet:\n${context.snippet}`,
      ].join("\n")
    )
    .join("\n\n");
