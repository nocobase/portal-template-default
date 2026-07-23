import {
  createContext,
  useContext,
  useMemo,
  type ComponentType,
  type PropsWithChildren,
} from "react";
import type { ToolCallPart } from "../chat/tool-call-card";
import { builtInToolRenderers } from "./builtin-tool-renderers";
import { BusinessReportDialogHost } from "./business-report-dialog";

export type AIToolRendererProps = {
  part: ToolCallPart;
  disabled: boolean;
  onEdit: (input: unknown) => void | Promise<void>;
  onApprove: () => void | Promise<void>;
  onReject: (message?: string) => void | Promise<void>;
  onRevise: () => void;
};

export type AIToolRenderer = ComponentType<AIToolRendererProps>;
export type AIToolRendererDefinition = {
  component: AIToolRenderer;
  handlesApproval?: boolean;
  standalone?: boolean;
};
export type AIToolRendererEntry = AIToolRenderer | AIToolRendererDefinition;
export type AIToolRendererMap = Record<string, AIToolRendererEntry>;

const AIToolRendererContext =
  createContext<AIToolRendererMap>(builtInToolRenderers);

export function AIToolRendererProvider({
  renderers,
  children,
}: PropsWithChildren<{ renderers?: AIToolRendererMap }>) {
  const value = useMemo(
    () => ({ ...builtInToolRenderers, ...renderers }),
    [renderers]
  );

  return (
    <AIToolRendererContext.Provider value={value}>
      {children}
      <BusinessReportDialogHost />
    </AIToolRendererContext.Provider>
  );
}

export function useAIToolRenderer(toolName: string) {
  const entry = useContext(AIToolRendererContext)[toolName];
  if (!entry) return undefined;
  return typeof entry === "function" ? { component: entry } : entry;
}
