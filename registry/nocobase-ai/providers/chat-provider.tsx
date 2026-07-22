import { Chat, useChat } from "@ai-sdk/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { aiChatReducer, createAIChatState } from "./chat-reducer";
import type { AIChatController } from "./chat-controller";
import { useAI } from "./ai-provider";
import { findAIModel, getAIModelKey } from "./model";
import { NocoBaseChatTransport } from "./chat-transport";
import {
  findChatMessage,
  isAIToolPart,
  reconcileRefreshedMessages,
} from "./chat-message-utils";
import { useAutoToolApproval } from "./use-auto-tool-approval";
import { useChatAttachments } from "./use-chat-attachments";
import {
  AI_DRAFT_CONVERSATION_ID,
  type AIChatAttachment,
  type AIChatMessage,
  type AIChatTaskRuntime,
  type AIConversation,
  type AIEmployee,
  type AIEmployeeTask,
  type AIEmployeeTasks,
  type AIEmployeeTaskTrigger,
  type AIModel,
  type AIToolCallDecision,
} from "./types";

const now = new Date();
const EMPTY_TASKS: AIEmployeeTask[] = [];
const EMPTY_EMPLOYEE_TASKS: AIEmployeeTasks = {};

const INITIAL_CONVERSATIONS: AIConversation[] = [
  {
    id: "welcome",
    title: "Build an operations workspace",
    employeeUsername: "mira",
    updatedAt: new Date(now.getTime() - 1000 * 60 * 8).toISOString(),
  },
  {
    id: "dashboard",
    title: "Plan a service dashboard",
    employeeUsername: "alex",
    updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 4).toISOString(),
  },
];

const INITIAL_MESSAGES: Record<string, AIChatMessage[]> = {
  welcome: [
    {
      id: "welcome-user",
      role: "user",
      metadata: {
        createdAt: new Date(now.getTime() - 1000 * 60 * 9).toISOString(),
      },
      parts: [{ type: "text", text: "Help me build an operations workspace." }],
    },
    {
      id: "welcome-assistant",
      role: "assistant",
      metadata: {
        createdAt: new Date(now.getTime() - 1000 * 60 * 8).toISOString(),
        employeeUsername: "mira",
      },
      parts: [
        {
          type: "text",
          text: "I can start with the data model, then assemble the list, detail, and dashboard views. NocoBase will keep permissions, workflows, and data access reliable underneath.",
        },
      ],
    },
  ],
  dashboard: [
    {
      id: "dashboard-assistant",
      role: "assistant",
      metadata: { employeeUsername: "alex", createdAt: now.toISOString() },
      parts: [
        {
          type: "text",
          text: "What decisions should this dashboard help the team make each day?",
        },
      ],
    },
  ],
};

type AIChatContextValue = {
  id: string;
  messages: AIChatMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  error?: Error;
  employees: AIEmployee[];
  models: AIModel[];
  currentEmployee: AIEmployee;
  currentModel: AIModel;
  activeConversation?: AIConversation;
  activeConversationId: string;
  conversations: AIConversation[];
  conversationsLoading: boolean;
  conversationSearch: string;
  messagesLoading: boolean;
  historyError?: Error;
  conversationListOpen: boolean;
  availableTasks: AIEmployeeTask[];
  composerFocusRequest: number;
  draft: string;
  attachments: AIChatAttachment[];
  uploadingAttachments: boolean;
  editingMessageId?: string;
  setDraft: (value: string) => void;
  uploadFiles: (files: File[]) => Promise<void>;
  removeAttachment: (uid: string) => void;
  send: () => Promise<void>;
  stop: () => Promise<void>;
  regenerate: () => Promise<void>;
  retryMessage: (message: AIChatMessage) => Promise<void>;
  decideToolCall: (decision: AIToolCallDecision) => Promise<void>;
  startNewConversation: () => void;
  selectConversation: (conversationId: string) => void;
  renameConversation: (conversationId: string, title: string) => Promise<void>;
  removeConversation: (conversationId: string) => Promise<void>;
  searchConversations: (keyword: string) => Promise<void>;
  setConversationListOpen: (open: boolean) => void;
  selectEmployee: (username: string) => void;
  selectModel: (model: string) => void;
  startEditingMessage: (message: AIChatMessage) => Promise<void>;
  cancelEditingMessage: () => void;
  saveUserPrompt: (prompt: string) => Promise<void>;
  triggerTask: (options: AIEmployeeTaskTrigger) => void;
  runTask: (task: AIEmployeeTask) => void;
  focusComposer: () => void;
};

const AIChatContext = createContext<AIChatContextValue | null>(null);

export function AIChatProvider({
  id,
  controller,
  defaultEmployee,
  defaultTasks = EMPTY_TASKS,
  employeeTasks = EMPTY_EMPLOYEE_TASKS,
  webSearch = false,
  children,
}: PropsWithChildren<{
  id: string;
  controller?: AIChatController;
  defaultEmployee?: string;
  defaultTasks?: AIEmployeeTask[];
  employeeTasks?: AIEmployeeTasks;
  webSearch?: boolean;
}>) {
  const ai = useAI();
  const { configurationStatus, listConversations, mode: aiMode } = ai;
  const defaultEmployeeUsername =
    ai.employees.find((employee) => employee.username === defaultEmployee)
      ?.username ??
    ai.employees[0]?.username ??
    "assistant";
  const hasConfiguredTasks =
    defaultTasks.length > 0 ||
    Object.values(employeeTasks).some((tasks) => tasks.length > 0);
  const initialConversations =
    ai.mode === "mock" && !hasConfiguredTasks ? INITIAL_CONVERSATIONS : [];
  const [state, dispatch] = useReducer(
    aiChatReducer,
    createAIChatState({
      conversations: initialConversations,
      employeeUsername: defaultEmployeeUsername,
      model: ai.models[0] ? getAIModelKey(ai.models[0]) : "default",
    })
  );
  const chatsRef = useRef(new Map<string, Chat<AIChatMessage>>());
  const transportsRef = useRef(new Map<string, NocoBaseChatTransport>());
  const messageRefreshRequestsRef = useRef(
    new Map<string, Promise<AIChatMessage[]>>()
  );
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationSearch, setConversationSearch] = useState("");
  const conversationSearchRef = useRef("");
  const conversationSearchRequestRef = useRef(0);
  const conversationCatalogRef = useRef(initialConversations);
  const [messageLoadingId, setMessageLoadingId] = useState<string>();
  const [historyError, setHistoryError] = useState<Error>();
  const {
    attachments,
    uploadingAttachments,
    uploadFiles,
    removeAttachment,
    setConversationAttachments,
    moveAttachments,
    removeConversationAttachments,
    clearAttachments,
    getConversationAttachments,
  } = useChatAttachments(state.activeConversationId);
  const [editingMessageId, setEditingMessageId] = useState<string>();
  const editingSnapshotRef = useRef<
    | {
        conversationId: string;
        messages: AIChatMessage[];
        attachments: AIChatAttachment[];
      }
    | undefined
  >(undefined);
  const webSearchRef = useRef(webSearch);
  const resetModeEffectRef = useRef(ai.mode);
  const taskRuntimeRef = useRef<AIChatTaskRuntime | undefined>(undefined);
  const [pendingTask, setPendingTask] = useState<{
    key: string;
    employeeUsername: string;
    task: AIEmployeeTask;
    auto: boolean;
  }>();
  const getConfiguredTaskSet = useCallback(
    (employeeUsername: string) => {
      const tasks =
        employeeTasks[employeeUsername] ??
        (employeeUsername === defaultEmployeeUsername
          ? defaultTasks
          : EMPTY_TASKS);
      return tasks.length
        ? {
            employeeUsername,
            tasks,
            context: undefined,
          }
        : undefined;
    },
    [defaultEmployeeUsername, defaultTasks, employeeTasks]
  );
  const [activeTaskSet, setActiveTaskSet] = useState<
    | {
        employeeUsername: string;
        tasks: AIEmployeeTask[];
        context: AIEmployeeTaskTrigger["context"];
      }
    | undefined
  >(() => getConfiguredTaskSet(defaultEmployeeUsername));
  const [composerFocusRequest, requestComposerFocus] = useReducer(
    (request: number) => request + 1,
    0
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  webSearchRef.current = webSearch;

  useEffect(() => {
    if (resetModeEffectRef.current === ai.mode) return;
    resetModeEffectRef.current = ai.mode;
    chatsRef.current.clear();
    transportsRef.current.clear();
    messageRefreshRequestsRef.current.clear();
    taskRuntimeRef.current = undefined;
    clearAttachments();
    setEditingMessageId(undefined);
    editingSnapshotRef.current = undefined;
    setPendingTask(undefined);
    setConversationSearch("");
    conversationSearchRef.current = "";
    conversationCatalogRef.current =
      ai.mode === "mock" && !hasConfiguredTasks ? INITIAL_CONVERSATIONS : [];
    setActiveTaskSet(getConfiguredTaskSet(defaultEmployeeUsername));
    dispatch({
      type: "reset",
      state: createAIChatState({
        conversations:
          ai.mode === "mock" && !hasConfiguredTasks
            ? INITIAL_CONVERSATIONS
            : [],
        employeeUsername: defaultEmployeeUsername,
        model: ai.models[0] ? getAIModelKey(ai.models[0]) : "default",
      }),
    });
  }, [
    ai.mode,
    ai.models,
    defaultEmployeeUsername,
    clearAttachments,
    getConfiguredTaskSet,
    hasConfiguredTasks,
  ]);

  useEffect(() => {
    if (aiMode !== "nocobase" || configurationStatus !== "ready") return;
    let active = true;
    setConversationsLoading(true);
    setHistoryError(undefined);
    void listConversations()
      .then((conversations) => {
        if (!active || conversationSearchRef.current) return;
        conversationCatalogRef.current = conversations;
        dispatch({ type: "set-conversations", conversations });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setHistoryError(
          error instanceof Error
            ? error
            : new Error("Unable to load conversations")
        );
      })
      .finally(() => {
        if (active) setConversationsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [aiMode, configurationStatus, listConversations]);

  const searchConversations = useCallback(
    async (keyword: string) => {
      const normalizedKeyword = keyword.trim();
      setConversationSearch(keyword);
      conversationSearchRef.current = normalizedKeyword;

      if (ai.mode === "mock") {
        const normalizedSearch = normalizedKeyword.toLocaleLowerCase();
        dispatch({
          type: "set-conversations",
          conversations: normalizedSearch
            ? conversationCatalogRef.current.filter((conversation) =>
                conversation.title
                  .toLocaleLowerCase()
                  .includes(normalizedSearch)
              )
            : conversationCatalogRef.current,
        });
        return;
      }

      const requestId = conversationSearchRequestRef.current + 1;
      conversationSearchRequestRef.current = requestId;
      setConversationsLoading(true);
      setHistoryError(undefined);
      try {
        const conversations = await listConversations(normalizedKeyword);
        if (conversationSearchRequestRef.current !== requestId) return;
        if (!normalizedKeyword) conversationCatalogRef.current = conversations;
        dispatch({ type: "set-conversations", conversations });
      } catch (error) {
        if (conversationSearchRequestRef.current !== requestId) return;
        const resolvedError =
          error instanceof Error
            ? error
            : new Error("Unable to search conversations");
        setHistoryError(resolvedError);
        throw resolvedError;
      } finally {
        if (conversationSearchRequestRef.current === requestId) {
          setConversationsLoading(false);
        }
      }
    },
    [ai.mode, listConversations]
  );

  const currentEmployee =
    ai.employees.find(
      (employee) => employee.username === state.selectedEmployeeUsername
    ) ?? ai.employees[0];
  const currentModel =
    findAIModel(ai.models, state.selectedModel) ?? ai.models[0];

  if (!currentEmployee || !currentModel) {
    throw new Error("AIProvider requires at least one employee and model");
  }

  const refreshConversationMessages = useCallback(
    (conversationId: string, targetChat: Chat<AIChatMessage>) => {
      const pending = messageRefreshRequestsRef.current.get(conversationId);
      if (pending) return pending;

      const request = ai
        .getConversationMessages(conversationId)
        .then((messages) => {
          const reconciled = reconcileRefreshedMessages(
            targetChat.messages,
            messages
          );
          if (chatsRef.current.get(conversationId) === targetChat) {
            targetChat.messages = reconciled;
          }
          return reconciled;
        })
        .finally(() => {
          messageRefreshRequestsRef.current.delete(conversationId);
        });
      messageRefreshRequestsRef.current.set(conversationId, request);
      return request;
    },
    [ai]
  );

  const getChat = useCallback(
    (conversationId: string) => {
      const existing = chatsRef.current.get(conversationId);
      if (existing) return existing;

      let runtimeConversationId = conversationId;
      const transport = ai.createTransport({
        chatId: `${id}:${conversationId}`,
        getContext: () => {
          const latestState = stateRef.current;
          const employee =
            ai.employees.find(
              (item) => item.username === latestState.selectedEmployeeUsername
            ) ?? ai.employees[0];
          const model =
            findAIModel(ai.models, latestState.selectedModel) ?? ai.models[0];
          if (!employee || !model) {
            throw new Error(
              "AIProvider requires at least one employee and model"
            );
          }
          const task = taskRuntimeRef.current;
          return {
            sessionId:
              runtimeConversationId === AI_DRAFT_CONVERSATION_ID
                ? undefined
                : runtimeConversationId,
            employee,
            model,
            task: task
              ? {
                  ...task,
                  webSearch: task.webSearch ?? webSearchRef.current,
                }
              : webSearchRef.current
              ? { workContext: [], webSearch: true }
              : undefined,
          };
        },
        onSessionCreated: (sessionId) => {
          const previousConversationId = runtimeConversationId;
          chatsRef.current.delete(runtimeConversationId);
          chatsRef.current.set(sessionId, chat);
          if (transport instanceof NocoBaseChatTransport) {
            transportsRef.current.delete(previousConversationId);
            transportsRef.current.set(sessionId, transport);
          }
          moveAttachments(previousConversationId, sessionId);
          dispatch({
            type: "replace-conversation-id",
            from: runtimeConversationId,
            to: sessionId,
          });
          runtimeConversationId = sessionId;
        },
      });
      const chat = new Chat<AIChatMessage>({
        id: `${id}:${conversationId}`,
        messages: INITIAL_MESSAGES[conversationId] ?? [],
        onFinish: () => {
          const finishedConversationId = runtimeConversationId;
          if (
            ai.mode !== "nocobase" ||
            finishedConversationId === AI_DRAFT_CONVERSATION_ID
          ) {
            return;
          }
          void Promise.all([
            refreshConversationMessages(finishedConversationId, chat),
            listConversations(conversationSearchRef.current).then(
              (conversations) => {
                if (!conversationSearchRef.current) {
                  conversationCatalogRef.current = conversations;
                }
                dispatch({ type: "set-conversations", conversations });
              }
            ),
          ]).catch((error: unknown) => {
            setHistoryError(
              error instanceof Error
                ? error
                : new Error("Unable to refresh the conversation")
            );
          });
        },
        transport,
      });
      chatsRef.current.set(conversationId, chat);
      if (transport instanceof NocoBaseChatTransport) {
        transportsRef.current.set(conversationId, transport);
      }
      return chat;
    },
    [ai, id, listConversations, moveAttachments, refreshConversationMessages]
  );

  const activeChat = getChat(state.activeConversationId);
  const chat = useChat<AIChatMessage>({ chat: activeChat });
  const draft = state.drafts[state.activeConversationId] ?? "";
  const activeConversation = state.conversations.find(
    (conversation) => conversation.id === state.activeConversationId
  );

  const loadConversationMessages = useCallback(
    async (conversationId: string) => {
      if (ai.mode !== "nocobase") return;
      const targetChat = getChat(conversationId);
      if (
        targetChat.status === "streaming" ||
        targetChat.status === "submitted"
      ) {
        return;
      }
      setMessageLoadingId(conversationId);
      setHistoryError(undefined);
      try {
        await refreshConversationMessages(conversationId, targetChat);
      } catch (error) {
        setHistoryError(
          error instanceof Error
            ? error
            : new Error("Unable to load conversation messages")
        );
      } finally {
        setMessageLoadingId((current) =>
          current === conversationId ? undefined : current
        );
      }
    },
    [ai.mode, getChat, refreshConversationMessages]
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
      if (
        currentAttachments.some(
          (attachment) => attachment.status === "uploading"
        ) ||
        (!value &&
          !currentAttachments.some(
            (attachment) => attachment.status === "done"
          )) ||
        chat.status === "streaming" ||
        chat.status === "submitted"
      )
        return;

      const completedAttachments = currentAttachments.filter(
        (attachment) => attachment.status === "done"
      );
      const title =
        value || completedAttachments[0]?.filename || "New conversation";
      if (currentId === AI_DRAFT_CONVERSATION_ID && ai.mode === "mock") {
        const conversationId = `conversation-${crypto.randomUUID()}`;
        chatsRef.current.set(conversationId, activeChat);
        chatsRef.current.delete(AI_DRAFT_CONVERSATION_ID);
        transportsRef.current.delete(AI_DRAFT_CONVERSATION_ID);
        dispatch({
          type: "add-conversation",
          conversation: {
            id: conversationId,
            title: title.slice(0, 42),
            employeeUsername: currentEmployee.username,
            updatedAt: new Date().toISOString(),
          },
        });
        conversationCatalogRef.current = [
          {
            id: conversationId,
            title: title.slice(0, 42),
            employeeUsername: currentEmployee.username,
            updatedAt: new Date().toISOString(),
          },
          ...conversationCatalogRef.current.filter(
            (conversation) => conversation.id !== conversationId
          ),
        ];
      } else if (!activeConversation) {
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
        },
      });
    },
    [
      activeChat,
      activeConversation,
      ai.mode,
      chat,
      currentEmployee.username,
      editingMessageId,
      getConversationAttachments,
      setConversationAttachments,
    ]
  );

  const send = useCallback(async () => {
    const value =
      stateRef.current.drafts[stateRef.current.activeConversationId] ?? "";
    await sendText(value);
  }, [sendText]);

  const resolveServerMessage = useCallback(
    async (message: AIChatMessage) => {
      const conversationId = stateRef.current.activeConversationId;
      let messages = activeChat.messages;
      const resolvedMessage = findChatMessage(messages, message.id);
      if (!resolvedMessage) {
        throw new Error(
          "The message is no longer available in this conversation."
        );
      }
      let { targetMessage, rootIndex } = resolvedMessage;

      if (ai.mode === "nocobase" && !targetMessage.metadata?.serverMessageId) {
        messages = await refreshConversationMessages(
          conversationId,
          activeChat
        );
        const refreshedMatch = findChatMessage(messages, message.id);
        const refreshedTarget = refreshedMatch?.targetMessage;
        if (!refreshedTarget) {
          throw new Error(
            "Unable to resolve the server message for this action."
          );
        }
        targetMessage = refreshedTarget;
        rootIndex = refreshedMatch.rootIndex;
      }

      return {
        conversationId,
        messages,
        targetMessage,
        rootIndex,
        serverMessageId: targetMessage.metadata?.serverMessageId,
      };
    },
    [activeChat, ai.mode, refreshConversationMessages]
  );

  const retryMessage = useCallback(
    async (message: AIChatMessage) => {
      if (
        message.role !== "assistant" ||
        chat.status === "streaming" ||
        chat.status === "submitted"
      ) {
        return;
      }

      setHistoryError(undefined);
      try {
        if (ai.mode === "mock") {
          await chat.regenerate({ messageId: message.id });
          return;
        }

        const resolved = await resolveServerMessage(message);
        if (!resolved.serverMessageId) {
          throw new Error("The server message id is unavailable for retry.");
        }
        const transport = transportsRef.current.get(resolved.conversationId);
        if (!transport) {
          throw new Error("The NocoBase chat transport is unavailable.");
        }
        transport.prepareResend(resolved.serverMessageId);
        try {
          await chat.regenerate({ messageId: resolved.targetMessage.id });
        } catch (error) {
          transport.cancelResend(resolved.serverMessageId);
          throw error;
        }
      } catch (error) {
        setHistoryError(
          error instanceof Error ? error : new Error("Unable to retry message")
        );
      }
    },
    [ai.mode, chat, resolveServerMessage]
  );

  const decideToolCall = useCallback(
    async (decision: AIToolCallDecision) => {
      if (ai.mode === "mock") return;
      if (chat.status === "streaming" || chat.status === "submitted") return;

      setHistoryError(undefined);
      try {
        const message = findChatMessage(
          activeChat.messages,
          decision.messageId
        )?.targetMessage;
        if (!message) {
          throw new Error("The tool-call message is no longer available.");
        }
        const resolved = await resolveServerMessage(message);
        if (!resolved.serverMessageId) {
          throw new Error(
            "The server message id is unavailable for this tool decision."
          );
        }
        const toolPart = resolved.targetMessage.parts
          .filter(isAIToolPart)
          .find((part) => part.toolCallId === decision.toolCallId);
        const toolName =
          toolPart?.type === "dynamic-tool"
            ? toolPart.toolName
            : toolPart?.type.startsWith("tool-")
            ? toolPart.type.slice(5)
            : decision.toolName;
        const userDecision =
          decision.decision === "approve"
            ? ({ type: "approve" } as const)
            : decision.decision === "reject"
            ? ({
                type: "reject",
                ...(typeof decision.input === "string"
                  ? { message: decision.input }
                  : {}),
              } as const)
            : ({
                type: "edit",
                editedAction: { name: toolName, args: decision.input },
              } as const);
        const result = await ai.updateToolCallDecision({
          sessionId: resolved.conversationId,
          messageId: resolved.serverMessageId,
          toolCallId: decision.toolCallId,
          userDecision,
        });
        if (!result.updated) {
          await refreshConversationMessages(
            resolved.conversationId,
            activeChat
          );
          return;
        }

        const interruptingToolCalls = result.toolCalls.filter(
          (toolCall) =>
            toolCall.willInterrupt === true ||
            toolCall.execution === "frontend" ||
            toolCall.auto === false
        );
        const allWaiting =
          interruptingToolCalls.length > 0 &&
          interruptingToolCalls.every(
            (toolCall) =>
              String(toolCall.invokeStatus).toLowerCase() === "waiting"
          );
        if (!allWaiting) return;

        const toolCallIds = result.toolCalls.map((toolCall) => toolCall.id);
        const toolCallResults: Array<{ id: string; result: unknown }> = [];
        for (const toolCall of result.toolCalls) {
          const invocation = await ai.invokeToolCall(
            toolCall.name,
            toolCall.args,
            {
              sessionId: resolved.conversationId,
              messageId: resolved.serverMessageId,
              toolCallId: toolCall.id,
              toolName: toolCall.name,
            }
          );
          if (invocation.handled) {
            toolCallResults.push({
              id: toolCall.id,
              result: invocation.result,
            });
          }
        }

        const transport = transportsRef.current.get(resolved.conversationId);
        if (!transport) {
          throw new Error("The NocoBase chat transport is unavailable.");
        }
        if (resolved.rootIndex !== activeChat.messages.length - 1) {
          activeChat.messages = resolved.messages.slice(
            0,
            resolved.rootIndex + 1
          );
        }
        const responseMessageId = `assistant-${crypto.randomUUID()}`;
        activeChat.messages = [
          ...activeChat.messages,
          {
            id: responseMessageId,
            role: "assistant",
            metadata: {
              createdAt: new Date().toISOString(),
              employeeUsername: currentEmployee.username,
            },
            parts: [],
          },
        ];
        transport.prepareToolResume(
          resolved.serverMessageId,
          responseMessageId,
          toolCallIds,
          toolCallResults
        );
        try {
          await chat.resumeStream();
        } catch (error) {
          transport.cancelToolResume(resolved.serverMessageId);
          activeChat.messages = activeChat.messages.filter(
            (item) => item.id !== responseMessageId
          );
          throw error;
        }
      } catch (error) {
        setHistoryError(
          error instanceof Error
            ? error
            : new Error("Unable to process the tool decision")
        );
        throw error;
      }
    },
    [
      activeChat,
      ai,
      chat,
      currentEmployee.username,
      refreshConversationMessages,
      resolveServerMessage,
    ]
  );

  useAutoToolApproval({
    mode: ai.mode,
    messages: chat.messages,
    status: chat.status,
    conversationId: state.activeConversationId,
    decideToolCall,
  });

  const startNewConversation = useCallback(() => {
    const snapshot = editingSnapshotRef.current;
    if (
      snapshot &&
      snapshot.conversationId === stateRef.current.activeConversationId
    ) {
      chat.setMessages(snapshot.messages);
      setConversationAttachments(snapshot.conversationId, snapshot.attachments);
    }
    chatsRef.current.delete(AI_DRAFT_CONVERSATION_ID);
    transportsRef.current.delete(AI_DRAFT_CONVERSATION_ID);
    taskRuntimeRef.current = undefined;
    setPendingTask(undefined);
    setEditingMessageId(undefined);
    editingSnapshotRef.current = undefined;
    setConversationAttachments(AI_DRAFT_CONVERSATION_ID, []);
    setActiveTaskSet(
      getConfiguredTaskSet(stateRef.current.selectedEmployeeUsername)
    );
    dispatch({ type: "start-new-conversation" });
    requestComposerFocus();
  }, [chat, getConfiguredTaskSet, setConversationAttachments]);

  const startEditingMessage = useCallback(
    async (message: AIChatMessage) => {
      if (
        message.role !== "user" ||
        chat.status === "streaming" ||
        chat.status === "submitted"
      ) {
        return;
      }
      let messages = chat.messages;
      let targetMessage = message;
      let index = messages.findIndex((item) => item.id === message.id);
      if (index < 0) return;
      const conversationId = stateRef.current.activeConversationId;
      if (ai.mode === "nocobase" && !message.metadata?.serverMessageId) {
        const userMessageIndex =
          messages.slice(0, index + 1).filter((item) => item.role === "user")
            .length - 1;
        try {
          messages = await refreshConversationMessages(
            conversationId,
            activeChat
          );
        } catch (error) {
          setHistoryError(
            error instanceof Error
              ? error
              : new Error("Unable to refresh conversation messages")
          );
          return;
        }
        targetMessage = messages.filter((item) => item.role === "user")[
          userMessageIndex
        ];
        if (!targetMessage?.metadata?.serverMessageId) return;
        index = messages.findIndex((item) => item.id === targetMessage.id);
        if (index < 0) return;
      }
      const serverMessageId = targetMessage.metadata?.serverMessageId;
      editingSnapshotRef.current = {
        conversationId,
        messages: [...messages],
        attachments: getConversationAttachments(conversationId),
      };
      setEditingMessageId(serverMessageId ?? targetMessage.id);
      chat.setMessages(messages.slice(0, index));
      setConversationAttachments(
        conversationId,
        targetMessage.metadata?.attachments ?? []
      );
      dispatch({
        type: "set-draft",
        conversationId,
        value: targetMessage.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n"),
      });
      requestComposerFocus();
    },
    [
      ai.mode,
      activeChat,
      chat,
      refreshConversationMessages,
      getConversationAttachments,
      setConversationAttachments,
    ]
  );

  const cancelEditingMessage = useCallback(() => {
    const snapshot = editingSnapshotRef.current;
    if (
      snapshot &&
      snapshot.conversationId === stateRef.current.activeConversationId
    ) {
      chat.setMessages(snapshot.messages);
      setConversationAttachments(snapshot.conversationId, snapshot.attachments);
      dispatch({
        type: "set-draft",
        conversationId: snapshot.conversationId,
        value: "",
      });
    }
    setEditingMessageId(undefined);
    editingSnapshotRef.current = undefined;
  }, [chat, setConversationAttachments]);

  const triggerTask = useCallback(
    (options: AIEmployeeTaskTrigger) => {
      cancelEditingMessage();
      const requestedEmployee = options.aiEmployee;
      const employee =
        typeof requestedEmployee === "string"
          ? ai.employees.find((item) => item.username === requestedEmployee)
          : ai.employees.find(
              (item) => item.username === requestedEmployee.username
            ) ?? requestedEmployee;

      if (!employee) {
        console.warn(
          `AI employee "${String(options.aiEmployee)}" was not found.`
        );
        return;
      }

      if (options.open !== false) controller?.open();

      const task =
        options.task ??
        (options.tasks?.length === 1 && options.auto !== false
          ? options.tasks[0]
          : undefined);
      const workContext = [
        ...(options.context ?? []),
        ...(task?.message?.workContext ?? []),
      ];
      taskRuntimeRef.current = task
        ? {
            systemMessage: task.message?.system,
            workContext,
            skillSettings: task.skillSettings,
            webSearch: task.webSearch,
          }
        : { workContext };

      chatsRef.current.delete(AI_DRAFT_CONVERSATION_ID);
      transportsRef.current.delete(AI_DRAFT_CONVERSATION_ID);
      dispatch({ type: "select-employee", username: employee.username });
      dispatch({ type: "start-new-conversation" });

      const taskModel = task?.model
        ? ai.models.find(
            (item) =>
              item.value === task.model?.model &&
              (!task.model.llmService ||
                item.llmService === task.model.llmService)
          )
        : undefined;
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
      triggerTask({
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
      if (ai.mode === "nocobase") {
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
      }
      chatsRef.current.delete(conversationId);
      transportsRef.current.delete(conversationId);
      removeConversationAttachments(conversationId);
      dispatch({ type: "remove-conversation", conversationId });
      conversationCatalogRef.current = conversationCatalogRef.current.filter(
        (conversation) => conversation.id !== conversationId
      );
      if (stateRef.current.activeConversationId === conversationId) {
        chatsRef.current.delete(AI_DRAFT_CONVERSATION_ID);
        transportsRef.current.delete(AI_DRAFT_CONVERSATION_ID);
        taskRuntimeRef.current = undefined;
        setPendingTask(undefined);
        setEditingMessageId(undefined);
        editingSnapshotRef.current = undefined;
        setConversationAttachments(AI_DRAFT_CONVERSATION_ID, []);
        setActiveTaskSet(
          getConfiguredTaskSet(stateRef.current.selectedEmployeeUsername)
        );
        dispatch({ type: "start-new-conversation" });
        requestComposerFocus();
      }
    },
    [
      ai,
      getConfiguredTaskSet,
      removeConversationAttachments,
      setConversationAttachments,
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
      if (ai.mode === "nocobase") {
        await ai.updateConversationTitle(conversationId, title);
      }
      dispatch({ type: "rename-conversation", conversationId, title });
      conversationCatalogRef.current = conversationCatalogRef.current.map(
        (item) => (item.id === conversationId ? { ...item, title } : item)
      );
    },
    [ai]
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
      conversationListOpen: state.conversationListOpen,
      availableTasks: activeTaskSet?.tasks ?? [],
      composerFocusRequest,
      draft,
      attachments,
      uploadingAttachments,
      editingMessageId,
      setDraft,
      uploadFiles,
      removeAttachment,
      send,
      stop: chat.stop,
      regenerate: chat.regenerate,
      retryMessage,
      decideToolCall,
      startNewConversation,
      selectConversation: (conversationId) => {
        cancelEditingMessage();
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
        chatsRef.current.delete(AI_DRAFT_CONVERSATION_ID);
        transportsRef.current.delete(AI_DRAFT_CONVERSATION_ID);
        taskRuntimeRef.current = undefined;
        setPendingTask(undefined);
        setActiveTaskSet(getConfiguredTaskSet(username));
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
      attachments,
      uploadingAttachments,
      editingMessageId,
      currentEmployee,
      currentModel,
      getConfiguredTaskSet,
      draft,
      id,
      removeConversation,
      searchConversations,
      renameConversation,
      removeAttachment,
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

export function useAIChat() {
  const value = useContext(AIChatContext);
  if (!value) throw new Error("useAIChat must be used inside AIChatProvider");
  return value;
}
