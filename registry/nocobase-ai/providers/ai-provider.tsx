import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { nocobaseAIService, type AIService } from "../services";
import { NocoBaseChatTransport } from "./chat-transport";
import { useAIChatController, type AIChatController } from "./chat-controller";
import { MockChatTransport } from "./testing/mock-chat";
import type {
  AIConfigurationStatus,
  AIConversation,
  AIEmployee,
  AIModel,
  AIProviderMode,
  AIToolCallInvocationContext,
  AIToolInvokerMap,
  AITransportFactory,
} from "./types";

const UNCONFIGURED_MODEL: AIModel = {
  value: "__unconfigured__",
  label: "No enabled model",
  configured: false,
};

type AIProviderValue = {
  mode: AIProviderMode;
  setMode: (mode: AIProviderMode) => void;
  configurationStatus: AIConfigurationStatus;
  configurationError?: Error;
  modelConfigurationError?: Error;
  hasEnabledModels: boolean;
  employees: AIEmployee[];
  models: AIModel[];
  globalController: AIChatController;
  createTransport: AITransportFactory;
  uploadFile: AIService["uploadFile"];
  updateEmployeeUserPrompt: (username: string, prompt: string) => Promise<void>;
  listConversations: (keyword?: string) => Promise<AIConversation[]>;
  getConversationMessages: AIService["getConversationMessages"];
  getConversationActiveState: AIService["getConversationActiveState"];
  updateConversationTitle: (sessionId: string, title: string) => Promise<void>;
  destroyConversation: (sessionId: string) => Promise<void>;
  updateToolCallDecision: AIService["updateToolCallDecision"];
  invokeToolCall: (
    toolName: string,
    input: unknown,
    context: AIToolCallInvocationContext
  ) => Promise<{ handled: boolean; result?: unknown }>;
};

const AIContext = createContext<AIProviderValue | null>(null);

export function AIProvider({
  children,
  mode: controlledMode,
  defaultMode = import.meta.env.NOCOBASE_AI_MODE === "mock"
    ? "mock"
    : "nocobase",
  onModeChange,
  employees: providedEmployees,
  models: providedModels,
  service = nocobaseAIService,
  toolInvokers,
  globalController: providedGlobalController,
}: PropsWithChildren<{
  mode?: AIProviderMode;
  defaultMode?: AIProviderMode;
  onModeChange?: (mode: AIProviderMode) => void;
  employees?: AIEmployee[];
  models?: AIModel[];
  service?: AIService;
  toolInvokers?: AIToolInvokerMap;
  globalController?: AIChatController;
}>) {
  const [internalMode, setInternalMode] = useState(defaultMode);
  const mode = controlledMode ?? internalMode;
  const [liveConfiguration, setLiveConfiguration] = useState<{
    employees: AIEmployee[];
    models: AIModel[];
    status: AIConfigurationStatus;
    error?: Error;
    modelError?: Error;
  }>({ employees: [], models: [], status: "loading" });
  const internalGlobalController = useAIChatController();
  const globalController = providedGlobalController ?? internalGlobalController;

  const setMode = useCallback(
    (nextMode: AIProviderMode) => {
      if (controlledMode === undefined) setInternalMode(nextMode);
      onModeChange?.(nextMode);
    },
    [controlledMode, onModeChange]
  );

  useEffect(() => {
    if (providedEmployees && providedModels) {
      setLiveConfiguration({
        employees: providedEmployees,
        models: providedModels.length ? providedModels : [UNCONFIGURED_MODEL],
        status: "ready",
        modelError: providedModels.length
          ? undefined
          : new Error("No enabled AI models were provided."),
      });
      return;
    }

    let active = true;
    setLiveConfiguration((current) => ({
      ...current,
      status: "loading",
      error: undefined,
    }));

    void Promise.allSettled([
      providedEmployees ?? service.listEmployees(),
      providedModels ?? service.listModels(),
    ]).then(([employeesResult, modelsResult]) => {
      if (!active) return;
      if (employeesResult.status === "rejected") {
        setLiveConfiguration({
          employees: [],
          models: [],
          status: "error",
          error:
            employeesResult.reason instanceof Error
              ? employeesResult.reason
              : new Error("Unable to load NocoBase AI configuration."),
        });
        return;
      }

      const employees = employeesResult.value;
      if (!employees.length) {
        setLiveConfiguration({
          employees: [],
          models: [],
          status: "error",
          error: new Error(
            "No AI employees are available for the current NocoBase user."
          ),
        });
        return;
      }

      const models =
        modelsResult.status === "fulfilled" ? modelsResult.value : [];
      const modelError =
        modelsResult.status === "rejected"
          ? modelsResult.reason instanceof Error
            ? modelsResult.reason
            : new Error("Unable to load enabled AI models from NocoBase.")
          : models.length
          ? undefined
          : new Error("No enabled AI models were returned by NocoBase.");
      setLiveConfiguration({
        employees,
        models: models.length ? models : [UNCONFIGURED_MODEL],
        status: "ready",
        modelError,
      });
    });

    return () => {
      active = false;
    };
  }, [providedEmployees, providedModels, service]);

  const employees = liveConfiguration.employees;
  const models = liveConfiguration.models;
  const configurationStatus = liveConfiguration.status;
  const configurationError = liveConfiguration.error;
  const modelConfigurationError = liveConfiguration.modelError;
  const hasEnabledModels = models.some((model) => model.configured !== false);

  const updateEmployeeUserPrompt = useCallback(
    async (username: string, prompt: string) => {
      await service.updateEmployeeUserPrompt(username, prompt);
      setLiveConfiguration((current) => ({
        ...current,
        employees: current.employees.map((employee) =>
          employee.username === username
            ? {
                ...employee,
                userConfig: { ...employee.userConfig, prompt },
              }
            : employee
        ),
      }));
    },
    [service]
  );

  const invokeToolCall = useCallback(
    async (
      toolName: string,
      input: unknown,
      context: AIToolCallInvocationContext
    ) => {
      const invoke = toolInvokers?.[toolName];
      if (!invoke) return { handled: false };
      return { handled: true, result: await invoke(input, context) };
    },
    [toolInvokers]
  );

  const value = useMemo<AIProviderValue>(
    () => ({
      mode,
      setMode,
      configurationStatus,
      configurationError,
      modelConfigurationError,
      hasEnabledModels,
      employees,
      models,
      globalController,
      uploadFile: service.uploadFile.bind(service),
      updateEmployeeUserPrompt,
      listConversations: service.listConversations.bind(service),
      getConversationMessages: service.getConversationMessages.bind(service),
      getConversationActiveState:
        service.getConversationActiveState.bind(service),
      updateConversationTitle: service.updateConversationTitle.bind(service),
      destroyConversation: service.destroyConversation.bind(service),
      updateToolCallDecision: service.updateToolCallDecision.bind(service),
      invokeToolCall,
      createTransport: (options) =>
        mode === "nocobase"
          ? new NocoBaseChatTransport({ service, ...options })
          : new MockChatTransport(),
    }),
    [
      configurationError,
      configurationStatus,
      employees,
      globalController,
      hasEnabledModels,
      invokeToolCall,
      mode,
      modelConfigurationError,
      models,
      service,
      setMode,
      updateEmployeeUserPrompt,
    ]
  );

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAI() {
  const value = useContext(AIContext);
  if (!value) throw new Error("useAI must be used inside AIProvider");
  return value;
}

export function useGlobalAIChatController() {
  return useAI().globalController;
}
