import { Chat, useChat } from "@ai-sdk/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { aiChatReducer, createAIChatState } from "./chat-reducer";
import { AIChatContext, type AIChatContextValue } from "./chat-context";
import {
  createAIChatTaskRuntime,
  findAIChatTaskModel,
  findTriggeredAIEmployee,
  getConfiguredAIChatTaskSet,
  getTriggeredAIEmployeeTask,
  getTriggeredAIWorkContext,
  type AIChatTaskSet,
} from "./chat-task-utils";
import {
  useAIChatControllerState,
  type AIChatController,
} from "./chat-controller";
import { useAI } from "./ai-provider";
import { findAIModel, getAIModelKey } from "./model";
import { useChatAttachments } from "./use-chat-attachments";
import {
  useChatMessageActions,
  type AIMessageEditingSnapshot,
} from "./use-chat-message-actions";
import { useChatWorkContext } from "./use-chat-work-context";
import { useConversationCatalog } from "./use-conversation-catalog";
import { useConversationHistory } from "./use-conversation-history";
import { useChatRuntime } from "./use-chat-runtime";
import {
  getAIWorkContextRequiredTools,
  mergeAIRequiredTools,
  useAIPageContextResolver,
  useAIPageContextScope,
} from "./page-context";
import {
  AI_DRAFT_CONVERSATION_ID,
  type AIChatMessage,
  type AIChatTaskRuntime,
  type AIConversation,
  type AIEmployeeTask,
  type AIEmployeeTasks,
  type AIEmployeeTaskTrigger,
  type AIWorkContextItem,
} from "./types";

const EMPTY_TASKS: AIEmployeeTask[] = [];
const EMPTY_EMPLOYEE_TASKS: AIEmployeeTasks = {};

export type AIChatProviderProps = PropsWithChildren<{
  id: string;
  controller?: AIChatController;
  defaultEmployee?: string;
  defaultTasks?: AIEmployeeTask[];
  employeeTasks?: AIEmployeeTasks;
  webSearch?: boolean;
}>;

export function AIChatProvider({
  id,
  controller,
  defaultEmployee,
  defaultTasks = EMPTY_TASKS,
  employeeTasks = EMPTY_EMPLOYEE_TASKS,
  webSearch = false,
  children,
}: AIChatProviderProps) {
  const ai = useAI();
  const resolvePageContext = useAIPageContextResolver();
  const inheritedPageContext = useAIPageContextScope();
  const { open: chatSurfaceOpen } = useAIChatControllerState(controller);
  const chatSurfaceOpenRef = useRef(chatSurfaceOpen);
  chatSurfaceOpenRef.current = chatSurfaceOpen;
  const { configurationStatus, listConversations } = ai;
  const defaultEmployeeUsername =
    ai.employees.find((employee) => employee.username === defaultEmployee)
      ?.username ??
    ai.employees[0]?.username ??
    "assistant";
  const [state, dispatch] = useReducer(
    aiChatReducer,
    createAIChatState({
      conversations: [],
      employeeUsername: defaultEmployeeUsername,
      model: ai.models[0] ? getAIModelKey(ai.models[0]) : "default",
    })
  );
  const conversationFinishedHandlerRef =
    useRef<
      (conversationId: string, chat: Chat<AIChatMessage>) => Promise<void>
    >(undefined);
  const [historyError, setHistoryError] = useState<Error>();
  const [interactionError, setInteractionError] = useState<Error>();
  const setConversationList = useCallback(
    (conversations: AIConversation[]) =>
      dispatch({ type: "set-conversations", conversations }),
    []
  );
  const {
    loading: conversationsLoading,
    search: conversationSearch,
    searchRef: conversationSearchRef,
    refresh: refreshConversationCatalog,
    searchConversations,
    updateCatalog: updateConversationCatalog,
  } = useConversationCatalog({
    configurationStatus,
    listConversations,
    onChange: setConversationList,
    onError: setHistoryError,
  });
  const {
    attachments,
    uploadingAttachments,
    uploadFiles,
    removeAttachment,
    setConversationAttachments,
    moveAttachments,
    removeConversationAttachments,
    getConversationAttachments,
  } = useChatAttachments(state.activeConversationId);
  const {
    workContext,
    addWorkContext,
    removeWorkContext,
    setConversationWorkContext,
    moveWorkContext,
    removeConversationWorkContext,
    getConversationWorkContext,
  } = useChatWorkContext(state.activeConversationId);
  const [editingMessageId, setEditingMessageId] = useState<string>();
  const editingSnapshotRef = useRef<AIMessageEditingSnapshot | undefined>(
    undefined
  );
  const webSearchRef = useRef(webSearch);
  const taskRuntimeRef = useRef<AIChatTaskRuntime | undefined>(undefined);
  const [pendingTask, setPendingTask] = useState<{
    key: string;
    employeeUsername: string;
    task: AIEmployeeTask;
    auto: boolean;
  }>();
  const getConfiguredTaskSet = useCallback(
    (employeeUsername: string) =>
      getConfiguredAIChatTaskSet({
        employeeUsername,
        defaultEmployeeUsername,
        defaultTasks,
        employeeTasks,
        inheritedContext: inheritedPageContext,
      }),
    [defaultEmployeeUsername, defaultTasks, employeeTasks, inheritedPageContext]
  );
  const [activeTaskSet, setActiveTaskSet] = useState<AIChatTaskSet | undefined>(
    () => getConfiguredTaskSet(defaultEmployeeUsername)
  );
  const [composerFocusRequest, requestComposerFocus] = useReducer(
    (request: number) => request + 1,
    0
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  webSearchRef.current = webSearch;
  const {
    transportsRef,
    runtimeContextsRef,
    getRuntimeContext,
    getChat,
    getTransport,
    remove: removeChatRuntime,
  } = useChatRuntime({
    id,
    ai,
    stateRef,
    taskRuntimeRef,
    webSearchRef,
    conversationFinishedHandlerRef,
    moveAttachments,
    moveWorkContext,
    dispatch,
  });

  const currentEmployee =
    ai.employees.find(
      (employee) => employee.username === state.selectedEmployeeUsername
    ) ?? ai.employees[0];
  const currentModel =
    findAIModel(ai.models, state.selectedModel) ?? ai.models[0];

  if (!currentEmployee || !currentModel) {
    throw new Error("AIProvider requires at least one employee and model");
  }

  const getActiveConversationId = useCallback(
    () => stateRef.current.activeConversationId,
    []
  );
  const markConversationRead = useCallback(
    (conversationId: string) =>
      dispatch({ type: "mark-conversation-read", conversationId }),
    []
  );
  const {
    invalidate: invalidateConversationHistory,
    load: loadConversationMessages,
    loadingId: messageLoadingId,
    refresh: refreshConversationMessages,
  } = useConversationHistory({
    chatSurfaceOpen,
    activeConversationId: state.activeConversationId,
    getActiveConversationId,
    getChat,
    getTransport,
    getConversationMessages: ai.getConversationMessages,
    getConversationActiveState: ai.getConversationActiveState,
    onMarkRead: markConversationRead,
    onError: setHistoryError,
  });

  const activeChat = getChat(state.activeConversationId);
  const chat = useChat<AIChatMessage>({
    chat: activeChat,
    experimental_throttle: 32,
  });
  const draft = state.drafts[state.activeConversationId] ?? "";
  const activeConversation = state.conversations.find(
    (conversation) => conversation.id === state.activeConversationId
  );

  const setDraft = useCallback(
    (value: string) => {
      dispatch({
        type: "set-draft",
        conversationId: state.activeConversationId,
        value,
      });
    },
    [state.activeConversationId]
  );

  const sendText = useCallback(
    async (rawValue: string) => {
      const value = rawValue.trim();
      const currentId = stateRef.current.activeConversationId;
      const currentAttachments = getConversationAttachments(currentId);
      const unresolvedWorkContext = getConversationWorkContext(currentId);
      if (
        currentAttachments.some(
          (attachment) => attachment.status === "uploading"
        ) ||
        (!value &&
          !currentAttachments.some(
            (attachment) => attachment.status === "done"
          ) &&
          !unresolvedWorkContext.length) ||
        chat.status === "streaming" ||
        chat.status === "submitted"
      )
        return;

      setInteractionError(undefined);
      let currentWorkContext = unresolvedWorkContext;
      try {
        currentWorkContext = resolvePageContext
          ? await resolvePageContext(unresolvedWorkContext)
          : unresolvedWorkContext;
      } catch (error) {
        setInteractionError(
          error instanceof Error
            ? error
            : new Error("Unable to read the selected page context")
        );
        return;
      }
      if (stateRef.current.activeConversationId !== currentId) return;

      const completedAttachments = currentAttachments.filter(
        (attachment) => attachment.status === "done"
      );
      if (!value && !completedAttachments.length && !currentWorkContext.length) {
        return;
      }
      const requiredTools = getAIWorkContextRequiredTools(currentWorkContext);
      const currentTask = taskRuntimeRef.current;
      const runtimeTask =
        currentTask || requiredTools.length
          ? {
              ...(currentTask ?? { workContext: [] }),
              skillSettings: mergeAIRequiredTools(
                currentTask?.skillSettings,
                requiredTools
              ),
            }
          : undefined;
      runtimeContextsRef.current.set(currentId, {
        employeeUsername: currentEmployee.username,
        model: getAIModelKey(currentModel),
        task: runtimeTask,
      });
      const title =
        value ||
        completedAttachments[0]?.filename ||
        currentWorkContext[0]?.title ||
        "New conversation";
      if (!activeConversation) {
        dispatch({
          type: "add-conversation",
          conversation: {
            id: currentId,
            title: title.slice(0, 42),
            employeeUsername: currentEmployee.username,
            updatedAt: new Date().toISOString(),
          },
        });
      }

      dispatch({ type: "set-draft", conversationId: currentId, value: "" });
      setConversationAttachments(currentId, []);
      setConversationWorkContext(currentId, []);
      const activeEditingMessageId = editingMessageId;
      setEditingMessageId(undefined);
      editingSnapshotRef.current = undefined;
      await chat.sendMessage({
        parts: [
          ...(value ? [{ type: "text" as const, text: value }] : []),
          ...completedAttachments
            .filter((attachment) => attachment.url || attachment.preview)
            .map((attachment) => ({
              type: "file" as const,
              mediaType: attachment.mimetype ?? "application/octet-stream",
              filename: attachment.filename,
              url: attachment.url ?? attachment.preview ?? "",
            })),
        ],
        metadata: {
          createdAt: new Date().toISOString(),
          employeeUsername: currentEmployee.username,
          editingMessageId: activeEditingMessageId,
          attachments: completedAttachments,
          workContext: currentWorkContext,
        },
      });
    },
    [
      activeChat,
      activeConversation,
      chat,
      currentEmployee.username,
      currentModel,
      editingMessageId,
      getConversationAttachments,
      getConversationWorkContext,
      resolvePageContext,
      setConversationAttachments,
      setConversationWorkContext,
    ]
  );

  const send = useCallback(async () => {
    const value =
      stateRef.current.drafts[stateRef.current.activeConversationId] ?? "";
    await sendText(value);
  }, [sendText]);

  const {
    retryMessage,
    decideToolCall,
    startEditingMessage,
    cancelEditingMessage,
    clearAutomaticToolApproval,
    processAutomaticToolApprovals,
  } = useChatMessageActions({
    ai,
    chat,
    activeChat,
    stateRef,
    chatSurfaceOpenRef,
    transportsRef,
    getRuntimeContext,
    refreshConversationMessages,
    setHistoryError,
    editingSnapshotRef,
    setEditingMessageId,
    getConversationAttachments,
    getConversationWorkContext,
    setConversationAttachments,
    setConversationWorkContext,
    dispatch,
    requestComposerFocus,
  });

  const handleConversationFinished = useCallback(
    async (conversationId: string, targetChat: Chat<AIChatMessage>) => {
      try {
        const updateRead =
          stateRef.current.activeConversationId === conversationId &&
          chatSurfaceOpenRef.current;
        await refreshConversationMessages(conversationId, targetChat, {
          updateRead,
        });
        await refreshConversationCatalog();
        await processAutomaticToolApprovals(conversationId, targetChat);
      } catch (error) {
        setHistoryError(
          error instanceof Error
            ? error
            : new Error("Unable to refresh the conversation")
        );
      }
    },
    [
      processAutomaticToolApprovals,
      refreshConversationCatalog,
      refreshConversationMessages,
    ]
  );
  conversationFinishedHandlerRef.current = handleConversationFinished;

  const startNewConversation = useCallback(() => {
    const snapshot = editingSnapshotRef.current;
    if (
      snapshot &&
      snapshot.conversationId === stateRef.current.activeConversationId
    ) {
      chat.setMessages(snapshot.messages);
      setConversationAttachments(snapshot.conversationId, snapshot.attachments);
      setConversationWorkContext(snapshot.conversationId, snapshot.workContext);
    }
    removeChatRuntime(AI_DRAFT_CONVERSATION_ID);
    invalidateConversationHistory();
    taskRuntimeRef.current = undefined;
    setInteractionError(undefined);
    setPendingTask(undefined);
    setEditingMessageId(undefined);
    editingSnapshotRef.current = undefined;
    setConversationAttachments(AI_DRAFT_CONVERSATION_ID, []);
    setConversationWorkContext(AI_DRAFT_CONVERSATION_ID, []);
    setActiveTaskSet(
      getConfiguredTaskSet(stateRef.current.selectedEmployeeUsername)
    );
    dispatch({ type: "start-new-conversation" });
    requestComposerFocus();
  }, [
    chat,
    getConfiguredTaskSet,
    invalidateConversationHistory,
    removeChatRuntime,
    setConversationAttachments,
    setConversationWorkContext,
  ]);

  const triggerTask = useCallback(
    async (options: AIEmployeeTaskTrigger) => {
      cancelEditingMessage();
      const employee = findTriggeredAIEmployee(
        ai.employees,
        options.aiEmployee
      );

      if (!employee) {
        console.warn(
          `AI employee "${String(options.aiEmployee)}" was not found.`
        );
        return;
      }

      if (options.open !== false) controller?.open();

      const task = getTriggeredAIEmployeeTask(options);
      const contextItems = getTriggeredAIWorkContext(
        options,
        task,
        inheritedPageContext
      );
      let workContext: AIWorkContextItem[];
      try {
        setInteractionError(undefined);
        workContext = resolvePageContext
          ? await resolvePageContext(contextItems)
          : contextItems;
      } catch (error) {
        setInteractionError(
          error instanceof Error
            ? error
            : new Error("Unable to read the selected page context")
        );
        return;
      }
      taskRuntimeRef.current = createAIChatTaskRuntime(task, workContext);

      removeChatRuntime(AI_DRAFT_CONVERSATION_ID);
      invalidateConversationHistory();
      setConversationAttachments(AI_DRAFT_CONVERSATION_ID, []);
      setConversationWorkContext(AI_DRAFT_CONVERSATION_ID, workContext);
      dispatch({ type: "select-employee", username: employee.username });
      dispatch({ type: "start-new-conversation" });

      const taskModel = findAIChatTaskModel(ai.models, task);
      const resolvedModel = taskModel ?? ai.models[0];
      if (resolvedModel) {
        dispatch({
          type: "select-model",
          model: getAIModelKey(resolvedModel),
        });
      }

      if (task) {
        setActiveTaskSet(undefined);
        setPendingTask({
          key: crypto.randomUUID(),
          employeeUsername: employee.username,
          task,
          auto: options.auto !== false,
        });
      } else if (options.tasks?.length) {
        setPendingTask(undefined);
        setActiveTaskSet({
          employeeUsername: employee.username,
          tasks: options.tasks,
          context: options.context,
        });
      } else {
        setPendingTask(undefined);
        setActiveTaskSet(getConfiguredTaskSet(employee.username));
      }
      requestComposerFocus();
    },
    [
      ai.employees,
      ai.models,
      cancelEditingMessage,
      controller,
      getConfiguredTaskSet,
      inheritedPageContext,
      invalidateConversationHistory,
      resolvePageContext,
      removeChatRuntime,
      setConversationAttachments,
      setConversationWorkContext,
    ]
  );

  useEffect(() => {
    if (
      !pendingTask ||
      state.activeConversationId !== AI_DRAFT_CONVERSATION_ID ||
      currentEmployee.username !== pendingTask.employeeUsername
    ) {
      return;
    }

    const userMessage =
      pendingTask.task.message?.user ?? pendingTask.task.title ?? "";
    setPendingTask(undefined);
    if (pendingTask.auto && pendingTask.task.autoSend && userMessage.trim()) {
      void sendText(userMessage);
      return;
    }
    dispatch({
      type: "set-draft",
      conversationId: AI_DRAFT_CONVERSATION_ID,
      value: userMessage,
    });
  }, [
    currentEmployee.username,
    pendingTask,
    sendText,
    state.activeConversationId,
  ]);

  useEffect(() => {
    if (!controller) return;
    return controller.bindTaskHandler(triggerTask);
  }, [controller, triggerTask]);

  const runTask = useCallback(
    (task: AIEmployeeTask) => {
      if (!activeTaskSet) return;
      void triggerTask({
        aiEmployee: activeTaskSet.employeeUsername,
        task,
        context: activeTaskSet.context,
        auto: true,
        open: false,
      });
    },
    [activeTaskSet, triggerTask]
  );

  const removeConversation = useCallback(
    async (conversationId: string) => {
      try {
        await ai.destroyConversation(conversationId);
      } catch (error) {
        const resolvedError =
          error instanceof Error
            ? error
            : new Error("Unable to delete conversation");
        setHistoryError(resolvedError);
        throw resolvedError;
      }
      removeChatRuntime(conversationId);
      clearAutomaticToolApproval(conversationId);
      removeConversationAttachments(conversationId);
      removeConversationWorkContext(conversationId);
      dispatch({ type: "remove-conversation", conversationId });
      updateConversationCatalog((items) =>
        items.filter((conversation) => conversation.id !== conversationId)
      );
      if (stateRef.current.activeConversationId === conversationId) {
        removeChatRuntime(AI_DRAFT_CONVERSATION_ID);
        invalidateConversationHistory();
        taskRuntimeRef.current = undefined;
        setPendingTask(undefined);
        setEditingMessageId(undefined);
        editingSnapshotRef.current = undefined;
        setConversationAttachments(AI_DRAFT_CONVERSATION_ID, []);
        setConversationWorkContext(AI_DRAFT_CONVERSATION_ID, []);
        setActiveTaskSet(
          getConfiguredTaskSet(stateRef.current.selectedEmployeeUsername)
        );
        dispatch({ type: "start-new-conversation" });
        requestComposerFocus();
      }
    },
    [
      ai,
      clearAutomaticToolApproval,
      getConfiguredTaskSet,
      invalidateConversationHistory,
      removeConversationAttachments,
      removeConversationWorkContext,
      removeChatRuntime,
      setConversationAttachments,
      setConversationWorkContext,
      updateConversationCatalog,
    ]
  );

  const renameConversation = useCallback(
    async (conversationId: string, rawTitle: string) => {
      const title = rawTitle.trim();
      if (!title) return;
      const conversation = stateRef.current.conversations.find(
        (item) => item.id === conversationId
      );
      if (!conversation || conversation.title === title) return;
      await ai.updateConversationTitle(conversationId, title);
      dispatch({ type: "rename-conversation", conversationId, title });
      updateConversationCatalog((items) =>
        items.map((item) =>
          item.id === conversationId ? { ...item, title } : item
        )
      );
    },
    [ai, updateConversationCatalog]
  );

  const value = useMemo<AIChatContextValue>(
    () => ({
      id,
      messages: chat.messages,
      status: chat.status,
      error: chat.error,
      employees: ai.employees,
      models: ai.models,
      currentEmployee,
      currentModel,
      activeConversation,
      activeConversationId: state.activeConversationId,
      conversations: state.conversations,
      conversationsLoading,
      conversationSearch,
      messagesLoading: messageLoadingId === state.activeConversationId,
      historyError,
      interactionError,
      conversationListOpen: state.conversationListOpen,
      availableTasks: activeTaskSet?.tasks ?? [],
      composerFocusRequest,
      draft,
      attachments,
      uploadingAttachments,
      workContext,
      editingMessageId,
      setDraft,
      uploadFiles,
      removeAttachment,
      addWorkContext,
      removeWorkContext,
      send,
      stop: chat.stop,
      regenerate: chat.regenerate,
      retryMessage,
      decideToolCall,
      startNewConversation,
      selectConversation: (conversationId) => {
        cancelEditingMessage();
        setInteractionError(undefined);
        taskRuntimeRef.current = undefined;
        setPendingTask(undefined);
        setActiveTaskSet(undefined);
        const conversation = stateRef.current.conversations.find(
          (item) => item.id === conversationId
        );
        if (conversation?.employeeUsername) {
          dispatch({
            type: "select-employee",
            username: conversation.employeeUsername,
          });
        }
        if (conversation?.model) {
          const model = ai.models.find(
            (item) =>
              item.value === conversation.model?.model &&
              (!conversation.model.llmService ||
                item.llmService === conversation.model.llmService)
          );
          if (model) {
            dispatch({ type: "select-model", model: getAIModelKey(model) });
          }
        }
        dispatch({ type: "set-active-conversation", conversationId });
        void loadConversationMessages(conversationId);
        requestComposerFocus();
      },
      renameConversation,
      removeConversation,
      searchConversations,
      setConversationListOpen: (open) =>
        dispatch({ type: "set-conversation-list-open", open }),
      selectEmployee: (username) => {
        cancelEditingMessage();
        setInteractionError(undefined);
        removeChatRuntime(AI_DRAFT_CONVERSATION_ID);
        invalidateConversationHistory();
        taskRuntimeRef.current = undefined;
        setPendingTask(undefined);
        setActiveTaskSet(getConfiguredTaskSet(username));
        setConversationAttachments(AI_DRAFT_CONVERSATION_ID, []);
        setConversationWorkContext(AI_DRAFT_CONVERSATION_ID, []);
        dispatch({ type: "select-employee", username });
        dispatch({ type: "start-new-conversation" });
        requestComposerFocus();
      },
      selectModel: (model) => dispatch({ type: "select-model", model }),
      startEditingMessage,
      cancelEditingMessage,
      saveUserPrompt: (prompt) =>
        ai.updateEmployeeUserPrompt(currentEmployee.username, prompt),
      triggerTask,
      runTask,
      focusComposer: requestComposerFocus,
    }),
    [
      activeConversation,
      ai,
      chat.error,
      chat.messages,
      chat.regenerate,
      chat.status,
      chat.stop,
      composerFocusRequest,
      conversationsLoading,
      conversationSearch,
      messageLoadingId,
      historyError,
      interactionError,
      attachments,
      uploadingAttachments,
      workContext,
      editingMessageId,
      currentEmployee,
      currentModel,
      getConfiguredTaskSet,
      invalidateConversationHistory,
      draft,
      id,
      removeConversation,
      removeChatRuntime,
      searchConversations,
      renameConversation,
      removeAttachment,
      addWorkContext,
      removeWorkContext,
      setConversationAttachments,
      setConversationWorkContext,
      runTask,
      retryMessage,
      decideToolCall,
      send,
      setDraft,
      uploadFiles,
      startEditingMessage,
      cancelEditingMessage,
      loadConversationMessages,
      startNewConversation,
      triggerTask,
      state.activeConversationId,
      state.conversationListOpen,
      state.conversations,
      activeTaskSet,
    ]
  );

  return (
    <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>
  );
}
