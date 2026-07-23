import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import type {
  AIEmployeeTask,
  AIWorkContextItem,
} from "./types";

export type AIPageContextResolver = (
  items: AIWorkContextItem[]
) => Promise<AIWorkContextItem[]>;

const AIPageContextResolverContext = createContext<
  AIPageContextResolver | undefined
>(undefined);

export function AIPageContextResolverProvider({
  resolve,
  children,
}: PropsWithChildren<{ resolve: AIPageContextResolver }>) {
  return (
    <AIPageContextResolverContext.Provider value={resolve}>
      {children}
    </AIPageContextResolverContext.Provider>
  );
}

export const useAIPageContextResolver = () =>
  useContext(AIPageContextResolverContext);

const EMPTY_PAGE_CONTEXT: AIWorkContextItem[] = [];
const AIPageContextScopeContext = createContext(EMPTY_PAGE_CONTEXT);

export function AIPageContextScope({
  context,
  mode = "replace",
  children,
}: PropsWithChildren<{
  context: AIWorkContextItem | AIWorkContextItem[];
  mode?: "replace" | "append";
}>) {
  const inheritedContext = useContext(AIPageContextScopeContext);
  const value = useMemo(
    () => {
      const ownContext = Array.isArray(context) ? context : [context];
      if (mode !== "append") return ownContext;
      const combined = [...inheritedContext, ...ownContext];
      return combined.filter((item, index) => {
        if (!item.id) return true;
        return (
          combined.findLastIndex(
            (candidate) =>
              candidate.type === item.type && candidate.id === item.id
          ) === index
        );
      });
    },
    [context, inheritedContext, mode]
  );
  return (
    <AIPageContextScopeContext.Provider value={value}>
      {children}
    </AIPageContextScopeContext.Provider>
  );
}

export const useAIPageContextScope = () =>
  useContext(AIPageContextScopeContext);

export function createAIPageContextReference({
  id,
  title,
  kind,
}: {
  id: string;
  title: string;
  kind?: string;
}): AIWorkContextItem {
  return {
    type: "page-element",
    id,
    title,
    ...(kind ? { kind } : {}),
  };
}

const isFormContext = (item: AIWorkContextItem) => {
  if (item.kind === "form") return true;
  if (!item.content || typeof item.content !== "object") return false;
  const content = item.content as Record<string, unknown>;
  return typeof content.form === "string" && Array.isArray(content.fields);
};

export function getAIWorkContextRequiredTools(items: AIWorkContextItem[]) {
  return items.some(isFormContext) ? ["formFiller"] : [];
}

export function mergeAIRequiredTools(
  skillSettings: AIEmployeeTask["skillSettings"],
  requiredTools: string[]
): AIEmployeeTask["skillSettings"] {
  if (!requiredTools.length) return skillSettings;
  return {
    ...skillSettings,
    tools: [...new Set([...(skillSettings?.tools ?? []), ...requiredTools])],
  };
}
