import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import type { AIWorkContextItem } from "./types";

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
  children,
}: PropsWithChildren<{
  context: AIWorkContextItem | AIWorkContextItem[];
}>) {
  const value = useMemo(
    () => (Array.isArray(context) ? context : [context]),
    [context]
  );
  return (
    <AIPageContextScopeContext.Provider value={value}>
      {children}
    </AIPageContextScopeContext.Provider>
  );
}

export const useAIPageContextScope = () =>
  useContext(AIPageContextScopeContext);
