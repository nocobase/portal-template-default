import { useEffect, useRef } from "react";
import {
  getChatToolParts,
  getNocoBaseToolMetadata,
} from "./chat-message-utils";
import type {
  AIChatMessage,
  AIToolCallDecision,
  AIProviderMode,
} from "./types";

export function useAutoToolApproval({
  mode,
  messages,
  status,
  conversationId,
  decideToolCall,
}: {
  mode: AIProviderMode;
  messages: AIChatMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  conversationId: string;
  decideToolCall: (decision: AIToolCallDecision) => Promise<void>;
}) {
  const approvedToolCallsRef = useRef(new Set<string>());

  useEffect(() => {
    approvedToolCallsRef.current.clear();
  }, [mode]);

  useEffect(() => {
    if (
      mode !== "nocobase" ||
      status === "streaming" ||
      status === "submitted"
    ) {
      return;
    }

    const pending = getChatToolParts(messages)
      .filter(({ part }) => getNocoBaseToolMetadata(part)?.autoApprove === true)
      .flatMap(({ message, part }) => {
        const key = `${conversationId}:${message.id}:${part.toolCallId}`;
        if (approvedToolCallsRef.current.has(key)) return [];
        return [{ key, message, part }];
      });
    if (!pending.length) return;

    for (const item of pending) approvedToolCallsRef.current.add(item.key);
    void (async () => {
      for (const { key, message, part } of pending) {
        try {
          await decideToolCall({
            messageId: message.id,
            toolCallId: part.toolCallId,
            toolName:
              part.type === "dynamic-tool" ? part.toolName : part.type.slice(5),
            decision: "approve",
          });
        } catch {
          approvedToolCallsRef.current.delete(key);
        }
      }
    })();
  }, [conversationId, decideToolCall, messages, mode, status]);
}
