import { Button } from "@/components/ui/button";
import {
  useAIChat,
  type AIChatMessage,
  type AIToolCallDecision,
} from "../../providers";
import { cn } from "@/lib/utils";
import { ArrowDown, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatMessage } from "./chat-message";

export function ChatMessages({
  onToolCallDecision,
}: {
  onToolCallDecision?: (decision: AIToolCallDecision) => void | Promise<void>;
}) {
  const {
    messages,
    status,
    error,
    messagesLoading,
    historyError,
    interactionError,
    retryMessage,
    decideToolCall,
    startEditingMessage,
    focusComposer,
  } = useAIChat();

  return (
    <AIChatMessageList
      messages={messages}
      status={status}
      loading={messagesLoading}
      error={error}
      historyError={historyError}
      interactionError={interactionError}
      onToolCallDecision={onToolCallDecision}
      retryMessage={retryMessage}
      decideToolCall={decideToolCall}
      startEditingMessage={startEditingMessage}
      focusComposer={focusComposer}
    />
  );
}

export type AIChatMessageListProps = {
  messages: AIChatMessage[];
  status?: "submitted" | "streaming" | "ready" | "error";
  loading?: boolean;
  error?: Error | null;
  historyError?: Error | null;
  interactionError?: Error | null;
  emptyState?: ReactNode;
  className?: string;
  onToolCallDecision?: (decision: AIToolCallDecision) => void | Promise<void>;
  showMessageActions?: boolean;
  retryMessage?: (message: AIChatMessage) => Promise<void>;
  decideToolCall?: (decision: AIToolCallDecision) => Promise<void>;
  startEditingMessage?: (message: AIChatMessage) => Promise<void>;
  focusComposer?: () => void;
};

export function AIChatMessageList({
  messages,
  status = "ready",
  loading = false,
  error,
  historyError,
  interactionError,
  emptyState,
  className,
  onToolCallDecision,
  showMessageActions = true,
  retryMessage,
  decideToolCall,
  startEditingMessage,
  focusComposer,
}: AIChatMessageListProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
  };

  useEffect(() => {
    if (atBottom) scrollToBottom(status === "streaming" ? "auto" : "smooth");
  }, [atBottom, messages, status]);

  return (
    <div className={cn("relative min-h-0 flex-1 bg-background", className)}>
      <div
        ref={viewportRef}
        role="log"
        aria-live="polite"
        className="absolute inset-0 overflow-y-auto overscroll-contain"
        onScroll={(event) => {
          const element = event.currentTarget;
          setAtBottom(
            element.scrollHeight - element.scrollTop - element.clientHeight < 48
          );
        }}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" /> Loading messages…
          </div>
        ) : (
          <>
            {messages.length ? (
              <div className="mx-auto w-full max-w-3xl py-2">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onToolCallDecision={onToolCallDecision}
                    showActions={showMessageActions}
                    status={status}
                    retryMessage={retryMessage}
                    decideToolCall={decideToolCall}
                    startEditingMessage={startEditingMessage}
                    focusComposer={focusComposer}
                  />
                ))}
              </div>
            ) : (
              emptyState ?? <ChatEmptyState />
            )}
            {error ? (
              <div
                role="alert"
                className="mx-5 my-3 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {error.message}
              </div>
            ) : null}
            {historyError ? (
              <div
                role="alert"
                className="mx-5 my-3 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {historyError.message}
              </div>
            ) : null}
            {interactionError ? (
              <div
                role="alert"
                className="mx-5 my-3 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {interactionError.message}
              </div>
            ) : null}
          </>
        )}
      </div>
      {!atBottom ? (
        <Button
          size="icon-sm"
          variant="outline"
          className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-background shadow-sm"
          aria-label="Scroll to bottom"
          onClick={() => scrollToBottom()}
        >
          <ArrowDown />
        </Button>
      ) : null}
    </div>
  );
}
