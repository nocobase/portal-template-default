import type { ChatTransport, InferUIMessageChunk } from "ai";
import type { AIService } from "../services";
import { parseNocoBaseSSE, type NocoBaseStreamEvent } from "./stream-parser";
import type { AIChatMessage, AIChatRequestContext } from "./types";
import { SubAgentStreamAccumulator } from "./sub-agent-stream";
import {
  getToolCallState,
  getToolProviderMetadata,
  isRecord,
  parseToolInput,
  toolCallsFromEvent,
  type NocoBaseToolCall,
} from "./stream-event-utils";

const messageText = (message?: AIChatMessage) =>
  message?.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n") ?? "";

const reasoningContent = (event: NocoBaseStreamEvent) => {
  if (typeof event.body === "object" && event.body) {
    const content = (event.body as { content?: unknown }).content;
    return typeof content === "string" ? content : "";
  }
  return "";
};

const VISUAL_DELTAS_PER_RENDER = 2;
const MAX_VISUAL_DELTA_LENGTH = 48;
type AIChatChunk = InferUIMessageChunk<AIChatMessage>;

const yieldToRenderer = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 16);
  });

const splitVisualDelta = (delta: string) => {
  if (delta.length <= MAX_VISUAL_DELTA_LENGTH) return [delta];
  const characters = Array.from(delta);
  const chunks: string[] = [];
  for (
    let index = 0;
    index < characters.length;
    index += MAX_VISUAL_DELTA_LENGTH
  ) {
    chunks.push(
      characters.slice(index, index + MAX_VISUAL_DELTA_LENGTH).join("")
    );
  }
  return chunks;
};

const splitSubAgentVisualEvents = (event: NocoBaseStreamEvent) => {
  if (event.type === "content" && typeof event.body === "string") {
    return splitVisualDelta(event.body).map((body) => ({ ...event, body }));
  }
  if (event.type === "reasoning" && isRecord(event.body)) {
    const content = event.body.content;
    if (typeof content === "string") {
      return splitVisualDelta(content).map((delta) => ({
        ...event,
        body: { ...(event.body as Record<string, unknown>), content: delta },
      }));
    }
  }
  return [event];
};

export class NocoBaseChatTransport implements ChatTransport<AIChatMessage> {
  private pendingResend?: { messageId: string };
  private pendingToolResume?: {
    messageId: string;
    responseMessageId: string;
    toolCallIds: string[];
    toolCallResults: Array<{ id: string; result: unknown }>;
  };

  constructor(
    private readonly options: {
      service: AIService;
      getContext: () => AIChatRequestContext;
      onSessionCreated?: (sessionId: string) => void;
    }
  ) {}

  prepareResend(messageId: string) {
    this.pendingResend = { messageId };
  }

  cancelResend(messageId: string) {
    if (this.pendingResend?.messageId === messageId) {
      this.pendingResend = undefined;
    }
  }

  prepareToolResume(
    messageId: string,
    responseMessageId: string,
    toolCallIds: string[],
    toolCallResults: Array<{ id: string; result: unknown }>
  ) {
    this.pendingToolResume = {
      messageId,
      responseMessageId,
      toolCallIds,
      toolCallResults,
    };
  }

  cancelToolResume(messageId: string) {
    if (this.pendingToolResume?.messageId === messageId) {
      this.pendingToolResume = undefined;
    }
  }

  async sendMessages({
    messages,
    abortSignal,
  }: Parameters<ChatTransport<AIChatMessage>["sendMessages"]>[0]) {
    const context = this.options.getContext();
    if (context.model.configured === false) {
      throw new Error(
        "No enabled LLM model is configured in NocoBase. Enable Mock conversation to preview responses, or configure an LLM service before using the live API."
      );
    }
    let sessionId = context.sessionId;

    const pendingResend = this.pendingResend;
    this.pendingResend = undefined;
    if (pendingResend) {
      if (!sessionId) {
        throw new Error("A conversation is required to retry a message.");
      }
      const stream = await this.options.service.resendMessagesStream(
        {
          sessionId,
          messageId: pendingResend.messageId,
          model: {
            llmService: context.model.llmService,
            model: context.model.value,
          },
          webSearch: context.task?.webSearch,
        },
        abortSignal
      );
      return this.toUIMessageStream(stream);
    }

    if (!sessionId) {
      sessionId = await this.options.service.createConversation({
        employee: context.employee,
        model: context.model,
        systemMessage: context.task?.systemMessage,
        skillSettings: context.task?.skillSettings,
      });
      this.options.onSessionCreated?.(sessionId);
    }

    const lastMessage = messages.at(-1);
    const attachments = lastMessage?.metadata?.attachments?.filter(
      (attachment) => attachment.status === "done"
    );
    const workContext = [
      ...(context.task?.workContext ?? []),
      ...(lastMessage?.metadata?.workContext ?? []),
    ];
    const stream = await this.options.service.sendMessagesStream(
      {
        sessionId,
        aiEmployee: context.employee.username,
        model: {
          llmService: context.model.llmService,
          model: context.model.value,
        },
        systemMessage: context.task?.systemMessage,
        skillSettings: context.task?.skillSettings,
        webSearch: context.task?.webSearch,
        editingMessageId: lastMessage?.metadata?.editingMessageId,
        messages: [
          {
            key: lastMessage?.id ?? crypto.randomUUID(),
            role: "user",
            content: { type: "text", content: messageText(lastMessage) },
            attachments: attachments?.length ? attachments : undefined,
            workContext: workContext.length ? workContext : undefined,
          },
        ],
      },
      abortSignal
    );

    return this.toUIMessageStream(stream);
  }

  async reconnectToStream() {
    const pendingToolResume = this.pendingToolResume;
    this.pendingToolResume = undefined;
    if (!pendingToolResume) return null;

    const context = this.options.getContext();
    if (!context.sessionId) {
      throw new Error("A conversation is required to resume a tool call.");
    }
    const stream = await this.options.service.resumeToolCallStream({
      sessionId: context.sessionId,
      messageId: pendingToolResume.messageId,
      toolCallIds: pendingToolResume.toolCallIds,
      toolCallResults: pendingToolResume.toolCallResults,
      model: {
        llmService: context.model.llmService,
        model: context.model.value,
      },
      webSearch: context.task?.webSearch,
    });
    return this.toUIMessageStream(stream, pendingToolResume.responseMessageId, {
      waitForNewMessage: true,
    });
  }

  private toUIMessageStream(
    stream: ReadableStream<Uint8Array>,
    messageId = `assistant-${crypto.randomUUID()}`,
    options: { waitForNewMessage?: boolean } = {}
  ) {
    return new ReadableStream<AIChatChunk>({
      async start(controller) {
        let textId = `text-${crypto.randomUUID()}`;
        let reasoningId = `reasoning-${crypto.randomUUID()}`;
        let textStarted = false;
        let reasoningStarted = false;
        let currentToolCallId: string | undefined;
        let visualDeltaCount = 0;
        let responseStarted = options.waitForNewMessage !== true;
        const announcedToolCalls = new Set<string>();
        const toolCallNames = new Map<string, string>();
        const toolCallInputs = new Map<string, unknown>();
        const subAgents = new SubAgentStreamAccumulator();
        controller.enqueue({ type: "start", messageId });

        const enqueueVisualDelta = async (
          chunk:
            | { type: "text-delta"; id: string; delta: string }
            | { type: "reasoning-delta"; id: string; delta: string }
        ) => {
          for (const delta of splitVisualDelta(chunk.delta)) {
            controller.enqueue({ ...chunk, delta });
            visualDeltaCount += 1;
            if (visualDeltaCount >= VISUAL_DELTAS_PER_RENDER) {
              visualDeltaCount = 0;
              await yieldToRenderer();
            }
          }
        };

        const finishActiveText = () => {
          if (!textStarted) return;
          controller.enqueue({ type: "text-end", id: textId });
          textStarted = false;
          textId = `text-${crypto.randomUUID()}`;
        };

        const finishActiveReasoning = () => {
          if (!reasoningStarted) return;
          controller.enqueue({ type: "reasoning-end", id: reasoningId });
          reasoningStarted = false;
          reasoningId = `reasoning-${crypto.randomUUID()}`;
        };

        const finishActiveNarrative = () => {
          finishActiveReasoning();
          finishActiveText();
        };

        try {
          for await (const event of parseNocoBaseSSE(stream)) {
            if (event.from === "sub-agent") {
              finishActiveNarrative();
              for (const visualEvent of splitSubAgentVisualEvents(event)) {
                for (const chunk of subAgents.process(visualEvent)) {
                  controller.enqueue(chunk);
                }
                if (
                  visualEvent.type === "content" ||
                  visualEvent.type === "reasoning"
                ) {
                  visualDeltaCount += 1;
                  if (visualDeltaCount >= VISUAL_DELTAS_PER_RENDER) {
                    visualDeltaCount = 0;
                    await yieldToRenderer();
                  }
                }
              }
              continue;
            }

            if (event.type === "new_message") {
              responseStarted = true;
              continue;
            }

            if (!responseStarted && event.type !== "error") {
              continue;
            }

            if (event.type === "content" && typeof event.body === "string") {
              finishActiveReasoning();
              if (!textStarted) {
                controller.enqueue({ type: "text-start", id: textId });
                textStarted = true;
              }
              await enqueueVisualDelta({
                type: "text-delta",
                id: textId,
                delta: event.body,
              });
            }

            if (event.type === "reasoning") {
              finishActiveText();
              const delta = reasoningContent(event);
              if (delta && !reasoningStarted) {
                controller.enqueue({
                  type: "reasoning-start",
                  id: reasoningId,
                });
                reasoningStarted = true;
              }
              if (delta) {
                await enqueueVisualDelta({
                  type: "reasoning-delta",
                  id: reasoningId,
                  delta,
                });
              }
            }

            if (event.type === "tool_call_chunks") {
              finishActiveNarrative();
              for (const chunk of toolCallsFromEvent(event)) {
                const toolCallId = chunk.id ?? currentToolCallId;
                if (!toolCallId) continue;
                currentToolCallId = toolCallId;
                if (chunk.name && !announcedToolCalls.has(toolCallId)) {
                  toolCallNames.set(toolCallId, chunk.name);
                  controller.enqueue({
                    type: "tool-input-start",
                    toolCallId,
                    toolName: chunk.name,
                    dynamic: true,
                  });
                  announcedToolCalls.add(toolCallId);
                }
                if (typeof chunk.args === "string" && chunk.args) {
                  const previousInput = toolCallInputs.get(toolCallId);
                  toolCallInputs.set(
                    toolCallId,
                    `${typeof previousInput === "string" ? previousInput : ""}${
                      chunk.args
                    }`
                  );
                  controller.enqueue({
                    type: "tool-input-delta",
                    toolCallId,
                    inputTextDelta: chunk.args,
                  });
                }
              }
            }

            if (event.type === "tool_calls") {
              finishActiveNarrative();
              for (const toolCall of toolCallsFromEvent(event)) {
                const toolCallId = toolCall.id ?? `tool-${crypto.randomUUID()}`;
                const toolName = toolCall.name ?? "tool";
                const toolState = getToolCallState(toolCall);
                const { invokeStatus, resultStatus } = toolState;
                const toolInput = parseToolInput(
                  toolCall.args ?? toolCall.input ?? {}
                );
                toolCallNames.set(toolCallId, toolName);
                toolCallInputs.set(toolCallId, toolInput);
                controller.enqueue({
                  type: "tool-input-available",
                  toolCallId,
                  toolName,
                  input: toolInput,
                  providerMetadata: getToolProviderMetadata(toolCall),
                  dynamic: true,
                });
                announcedToolCalls.add(toolCallId);

                if (toolState.failed) {
                  controller.enqueue({
                    type: "tool-output-error",
                    toolCallId,
                    errorText: String(
                      toolCall.content ?? toolCall.output ?? "Tool call failed"
                    ),
                    dynamic: true,
                  });
                } else if (toolState.completed) {
                  controller.enqueue({
                    type: "tool-output-available",
                    toolCallId,
                    output: toolCall.output ??
                      toolCall.content ?? {
                        status: invokeStatus || resultStatus,
                      },
                    dynamic: true,
                  });
                }
              }
            }

            if (event.type === "tool_call_status" && isRecord(event.body)) {
              finishActiveNarrative();
              const toolCall = isRecord(event.body.toolCall)
                ? (event.body.toolCall as NocoBaseToolCall)
                : undefined;
              const toolCallId = toolCall?.id;
              if (toolCallId) {
                const mergedToolCall = {
                  ...toolCall,
                  invokeStatus:
                    typeof event.body.invokeStatus === "string"
                      ? event.body.invokeStatus
                      : toolCall.invokeStatus,
                  status:
                    typeof event.body.status === "string"
                      ? event.body.status
                      : toolCall.status,
                  content: event.body.content ?? toolCall.content,
                } satisfies NocoBaseToolCall;
                const toolState = getToolCallState(mergedToolCall);
                const { invokeStatus, resultStatus } = toolState;
                const toolName =
                  toolCall.name ?? toolCallNames.get(toolCallId) ?? "tool";
                const toolInput =
                  toolCall.args !== undefined || toolCall.input !== undefined
                    ? parseToolInput(toolCall.args ?? toolCall.input)
                    : parseToolInput(toolCallInputs.get(toolCallId) ?? {});
                toolCallNames.set(toolCallId, toolName);
                toolCallInputs.set(toolCallId, toolInput);
                controller.enqueue({
                  type: "tool-input-available",
                  toolCallId,
                  toolName,
                  input: toolInput,
                  providerMetadata: getToolProviderMetadata(mergedToolCall),
                  dynamic: true,
                });
                announcedToolCalls.add(toolCallId);
                if (toolState.failed) {
                  controller.enqueue({
                    type: "tool-output-error",
                    toolCallId,
                    errorText: String(event.body.content ?? "Tool call failed"),
                    dynamic: true,
                  });
                } else if (toolState.completed) {
                  controller.enqueue({
                    type: "tool-output-available",
                    toolCallId,
                    output: event.body.content ?? {
                      status: invokeStatus || resultStatus,
                    },
                    dynamic: true,
                  });
                }
              }
            }

            if (event.type === "error") {
              controller.enqueue({
                type: "error",
                errorText: String(event.body ?? "AI response failed"),
              });
            }
          }

          finishActiveNarrative();
          controller.enqueue({ type: "finish" });
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }
}
