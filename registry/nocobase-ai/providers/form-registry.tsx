import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import type { AIToolInvoker } from "./types";

export type AIFormField = {
  name: string;
  title?: string;
  type?: string;
  description?: string;
  readonly?: boolean;
  required?: boolean;
  enum?: unknown;
  [key: string]: unknown;
};

export type AIFormTarget = {
  id: string;
  title: string;
  fields: AIFormField[];
  getValues: () => unknown | Promise<unknown>;
  setValues: (values: Record<string, unknown>) => void | Promise<void>;
};

export class AIFormRegistry {
  private readonly targets = new Map<
    string,
    { token: symbol; target: AIFormTarget }
  >();

  register(target: AIFormTarget) {
    const token = Symbol(target.id);
    this.targets.set(target.id, { token, target });
    return () => {
      if (this.targets.get(target.id)?.token === token) {
        this.targets.delete(target.id);
      }
    };
  }

  get(formId: string) {
    return this.targets.get(formId)?.target;
  }
}

const AIFormRegistryContext = createContext<AIFormRegistry | null>(null);

export function AIFormRegistryProvider({ children }: PropsWithChildren) {
  const registry = useMemo(() => new AIFormRegistry(), []);
  return (
    <AIFormRegistryContext.Provider value={registry}>
      {children}
    </AIFormRegistryContext.Provider>
  );
}

export function useAIFormRegistry() {
  const registry = useContext(AIFormRegistryContext);
  if (!registry) {
    throw new Error(
      "useAIFormRegistry must be used inside AIFormRegistryProvider"
    );
  }
  return registry;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export function createFormFillerInvoker(
  registry: AIFormRegistry
): AIToolInvoker {
  return async (input) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return {
        status: "error",
        content: "Form filler requires a form identifier and field data.",
      };
    }

    const { form, data } = input as { form?: unknown; data?: unknown };
    if (typeof form !== "string" || !form) {
      return {
        status: "error",
        content: "The target form identifier is missing.",
      };
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return {
        status: "error",
        content: "Form filler data must be an object.",
      };
    }

    const target = registry.get(form);
    if (!target) {
      return {
        status: "error",
        content: `The target form "${form}" is not available on this page.`,
      };
    }

    try {
      await target.setValues(data as Record<string, unknown>);
      return {
        status: "success",
        content: `Filled "${target.title}". Please review the values and submit the form manually.`,
      };
    } catch (error) {
      return {
        status: "error",
        content: `Unable to fill "${target.title}": ${getErrorMessage(error)}`,
      };
    }
  };
}
