import type { AIChatMessage, AISubAgentConversation } from "./types";

export type AIToolPart = Extract<
  AIChatMessage["parts"][number],
  { type: `tool-${string}` | "dynamic-tool" }
>;

export type AISubAgentPart = Extract<
  AIChatMessage["parts"][number],
  { type: "data-subAgent" }
>;

export const isAIToolPart = (
  part: AIChatMessage["parts"][number]
): part is AIToolPart =>
  part.type === "dynamic-tool" || part.type.startsWith("tool-");

export const isAISubAgentPart = (
  part: AIChatMessage["parts"][number]
): part is AISubAgentPart => part.type === "data-subAgent";

export const getNocoBaseToolMetadata = (part: AIToolPart) => {
  if (!("callProviderMetadata" in part)) return undefined;
  const metadata = part.callProviderMetadata?.nocobase;
  return metadata && typeof metadata === "object"
    ? (metadata as { autoApprove?: unknown })
    : undefined;
};

const getMessageToolCallIds = (message: AIChatMessage) =>
  new Set(
    message.parts
      .filter(isAIToolPart)
      .map((part) => part.toolCallId)
      .filter(Boolean)
  );

const getMessageText = (message: AIChatMessage) =>
  message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");

const getSubAgentSessionIds = (message: AIChatMessage) =>
  new Set(
    message.parts
      .filter(isAISubAgentPart)
      .map((part) => part.data.sessionId)
      .filter(Boolean)
  );

const reconcileConversation = (
  current: AISubAgentConversation,
  refreshed: AISubAgentConversation
): AISubAgentConversation => ({
  ...refreshed,
  messages: reconcileRefreshedMessages(current.messages, refreshed.messages),
});

const reconcileSubAgents = (
  currentMessage: AIChatMessage,
  refreshedMessage: AIChatMessage
) => {
  const current = currentMessage.parts.filter(isAISubAgentPart);
  return refreshedMessage.parts.map((part) => {
    if (!isAISubAgentPart(part)) return part;
    const currentPart = current.find(
      (item) => item.data.sessionId === part.data.sessionId
    );
    return currentPart
      ? {
          ...part,
          data: reconcileConversation(currentPart.data, part.data),
        }
      : part;
  });
};

export const reconcileRefreshedMessages = (
  current: AIChatMessage[],
  refreshed: AIChatMessage[]
) => {
  const usedCurrentIds = new Set<string>();
  return refreshed.map((serverMessage) => {
    const serverToolCallIds = getMessageToolCallIds(serverMessage);
    const match = current.find((localMessage) => {
      if (usedCurrentIds.has(localMessage.id)) return false;
      if (
        serverMessage.metadata?.serverMessageId &&
        localMessage.metadata?.serverMessageId ===
          serverMessage.metadata.serverMessageId
      ) {
        return true;
      }
      if (localMessage.role !== serverMessage.role) return false;
      const serverSubAgentSessionIds = getSubAgentSessionIds(serverMessage);
      if (serverSubAgentSessionIds.size) {
        return [...getSubAgentSessionIds(localMessage)].some((sessionId) =>
          serverSubAgentSessionIds.has(sessionId)
        );
      }
      if (serverToolCallIds.size) {
        return [...getMessageToolCallIds(localMessage)].some((toolCallId) =>
          serverToolCallIds.has(toolCallId)
        );
      }
      const serverText = getMessageText(serverMessage);
      return Boolean(serverText) && getMessageText(localMessage) === serverText;
    });
    if (!match) return serverMessage;
    usedCurrentIds.add(match.id);
    return {
      ...serverMessage,
      id: match.id,
      parts: reconcileSubAgents(match, serverMessage),
    };
  });
};

export type ResolvedChatMessage = {
  rootMessage: AIChatMessage;
  targetMessage: AIChatMessage;
  rootIndex: number;
};

export const findChatMessage = (
  messages: AIChatMessage[],
  messageId: string
): ResolvedChatMessage | undefined => {
  const findNestedMessage = (
    message: AIChatMessage
  ): AIChatMessage | undefined => {
    if (message.id === messageId) return message;
    for (const part of message.parts) {
      if (!isAISubAgentPart(part)) continue;
      for (const nestedMessage of part.data.messages) {
        const match = findNestedMessage(nestedMessage);
        if (match) return match;
      }
    }
    return undefined;
  };

  for (const [rootIndex, rootMessage] of messages.entries()) {
    const targetMessage = findNestedMessage(rootMessage);
    if (targetMessage) return { rootMessage, targetMessage, rootIndex };
  }
  return undefined;
};

export const getChatToolParts = (messages: AIChatMessage[]) => {
  const result: Array<{ message: AIChatMessage; part: AIToolPart }> = [];
  const visit = (items: AIChatMessage[]) => {
    for (const message of items) {
      for (const part of message.parts) {
        if (isAIToolPart(part)) {
          result.push({ message, part });
        } else if (isAISubAgentPart(part)) {
          visit(part.data.messages);
        }
      }
    }
  };
  visit(messages);
  return result;
};
