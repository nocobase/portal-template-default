import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import type { AIToolInvokerMap } from "./types";

export type AIFrontendToolPermission = "ASK" | "ALLOW";

export type AIFrontendToolRegistration = {
  name: string;
  title?: string;
  description: string;
  permission?: AIFrontendToolPermission;
  inputSchema?: Record<string, unknown>;
  execute: (args: unknown) => unknown | Promise<unknown>;
};

export type AIFrontendToolManifest = {
  id: string;
  blockUid: string;
  name: string;
  title?: string;
  description: string;
  permission: AIFrontendToolPermission;
  inputSchema: Record<string, unknown>;
};

type AIFrontendToolEntry = {
  token: symbol;
  manifest: AIFrontendToolManifest;
  execute: AIFrontendToolRegistration["execute"];
};

const TOOL_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

const cloneManifest = (
  manifest: AIFrontendToolManifest
): AIFrontendToolManifest => structuredClone(manifest);

export class AIFrontendToolRegistry {
  private readonly tools = new Map<string, AIFrontendToolEntry>();

  register(contextId: string, registration: AIFrontendToolRegistration) {
    if (!contextId) throw new Error("Frontend Tool context id is required");
    if (!TOOL_NAME_PATTERN.test(registration.name)) {
      throw new Error(
        "Frontend Tool name must start with a letter and contain only letters, numbers, underscores, or hyphens"
      );
    }
    if (!registration.description) {
      throw new Error("Frontend Tool description is required");
    }
    if (
      registration.permission !== undefined &&
      registration.permission !== "ASK" &&
      registration.permission !== "ALLOW"
    ) {
      throw new Error("Frontend Tool permission must be ASK or ALLOW");
    }

    const id = `${contextId}:${registration.name}`;
    const token = Symbol(id);
    const manifest: AIFrontendToolManifest = {
      id,
      blockUid: contextId,
      name: registration.name,
      title: registration.title,
      description: registration.description,
      permission: registration.permission ?? "ASK",
      inputSchema: structuredClone(
        registration.inputSchema ?? { type: "object", properties: {} }
      ),
    };
    this.tools.set(id, {
      token,
      manifest,
      execute: registration.execute,
    });
    return () => {
      if (this.tools.get(id)?.token === token) this.tools.delete(id);
    };
  }

  list(contextId: string) {
    return [...this.tools.values()]
      .filter((entry) => entry.manifest.blockUid === contextId)
      .map((entry) => cloneManifest(entry.manifest));
  }

  getManifest(toolId: string) {
    const manifest = this.tools.get(toolId)?.manifest;
    return manifest ? cloneManifest(manifest) : undefined;
  }

  async execute(toolId: string, args: unknown) {
    const entry = this.tools.get(toolId);
    if (!entry) throw new Error(`Frontend Tool "${toolId}" is unavailable`);
    return entry.execute(args);
  }
}

const AIFrontendToolRegistryContext =
  createContext<AIFrontendToolRegistry | null>(null);

export function AIFrontendToolRegistryProvider({
  children,
}: PropsWithChildren) {
  const registry = useMemo(() => new AIFrontendToolRegistry(), []);
  return (
    <AIFrontendToolRegistryContext.Provider value={registry}>
      {children}
    </AIFrontendToolRegistryContext.Provider>
  );
}

export function useAIFrontendToolRegistry() {
  const registry = useContext(AIFrontendToolRegistryContext);
  if (!registry) {
    throw new Error(
      "useAIFrontendToolRegistry must be used inside AIFrontendToolRegistryProvider"
    );
  }
  return registry;
}

const errorResult = (error: unknown) => ({
  status: "error" as const,
  content: error instanceof Error ? error.message : String(error),
});

export function createFrontendToolInvokers(
  registry: AIFrontendToolRegistry
): AIToolInvokerMap {
  return {
    loadFrontendTool: async (input) => {
      const toolId =
        input && typeof input === "object" && !Array.isArray(input)
          ? (input as { toolId?: unknown }).toolId
          : undefined;
      if (typeof toolId !== "string" || !toolId) {
        return errorResult("Frontend Tool id is required");
      }
      return (
        registry.getManifest(toolId) ??
        errorResult(`Frontend Tool "${toolId}" is unavailable`)
      );
    },
    executeFrontendTool: async (input) => {
      const params =
        input && typeof input === "object" && !Array.isArray(input)
          ? (input as { toolId?: unknown; args?: unknown })
          : {};
      if (typeof params.toolId !== "string" || !params.toolId) {
        return errorResult("Frontend Tool id is required");
      }
      try {
        return await registry.execute(params.toolId, params.args ?? {});
      } catch (error) {
        return errorResult(error);
      }
    },
  };
}
