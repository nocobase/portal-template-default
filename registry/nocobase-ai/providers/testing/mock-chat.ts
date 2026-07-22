import type { ChatTransport, UIMessageChunk } from "ai";
import type { AIChatMessage } from "../types";

const wait = (duration: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(resolve, duration);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeout);
        reject(new DOMException("The request was aborted", "AbortError"));
      },
      { once: true }
    );
  });

const getMessageText = (message?: AIChatMessage) =>
  message?.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n") ?? "";

const createReply = (prompt: string) => {
  const normalized = prompt.toLowerCase();

  if (normalized.includes("ticket") || prompt.includes("工单")) {
    return {
      reasoning:
        "I should turn the request into a small, verifiable application structure and keep the data model reusable.",
      tool: {
        name: "inspectDataModel",
        input: { collections: ["tickets", "categories", "comments"] },
        output: {
          collectionsFound: 3,
          reusableFields: ["status", "priority", "assignee", "createdAt"],
        },
      },
      text: `I can build that as a NocoBase ticketing workspace.\n\n- Create **Tickets**, **Categories**, and **Comments** collections\n- Add status, priority, assignee, and SLA fields\n- Build list, detail, and dashboard views\n- Keep permissions and workflows on the NocoBase side\n\nTell me who should be able to create and assign tickets, and I’ll refine the structure.`,
    };
  }

  if (normalized.includes("dashboard") || prompt.includes("仪表盘")) {
    return {
      reasoning:
        "The user wants a dashboard, so I should propose the minimum useful metrics before changing the page.",
      tool: {
        name: "analyzeCollections",
        input: {
          metrics: ["open", "unassigned", "slaWarning", "resolved"],
        },
        output: { availableMetrics: 4, dataSource: "main" },
      },
      text: `Here is a practical first dashboard:\n\n1. Open items\n2. Unassigned items\n3. SLA warnings\n4. Created and resolved trends\n\nNocoBase can keep the underlying collections, permissions, and workflow rules reliable while the frontend remains flexible.`,
    };
  }

  return {
    reasoning:
      "I should answer concisely and show how the AI employee and NocoBase responsibilities fit together.",
    text: `I’m ready to help build this workspace. Describe the page, data, or workflow you want, and I’ll turn it into a concrete frontend plan while NocoBase provides the data, permissions, and automation foundation.`,
  };
};

export class MockChatTransport implements ChatTransport<AIChatMessage> {
  async sendMessages({
    messages,
    abortSignal,
  }: Parameters<ChatTransport<AIChatMessage>["sendMessages"]>[0]) {
    const prompt = getMessageText(messages.at(-1));
    const reply = createReply(prompt);
    const messageId = `assistant-${crypto.randomUUID()}`;
    const reasoningId = `reasoning-${crypto.randomUUID()}`;
    const textId = `text-${crypto.randomUUID()}`;
    const toolCallId = `tool-${crypto.randomUUID()}`;

    return new ReadableStream<UIMessageChunk>({
      async start(controller) {
        try {
          controller.enqueue({ type: "start", messageId });
          controller.enqueue({ type: "reasoning-start", id: reasoningId });
          for (const word of reply.reasoning.split(/(?<=\s)/)) {
            await wait(18, abortSignal);
            controller.enqueue({
              type: "reasoning-delta",
              id: reasoningId,
              delta: word,
            });
          }
          controller.enqueue({ type: "reasoning-end", id: reasoningId });
          if ("tool" in reply && reply.tool) {
            controller.enqueue({
              type: "tool-input-start",
              toolCallId,
              toolName: reply.tool.name,
              dynamic: true,
            });
            await wait(180, abortSignal);
            controller.enqueue({
              type: "tool-input-available",
              toolCallId,
              toolName: reply.tool.name,
              input: reply.tool.input,
              dynamic: true,
            });
            await wait(520, abortSignal);
            controller.enqueue({
              type: "tool-output-available",
              toolCallId,
              output: reply.tool.output,
              dynamic: true,
            });
          }
          controller.enqueue({ type: "text-start", id: textId });
          for (const word of reply.text.split(/(?<=\s)/)) {
            await wait(28, abortSignal);
            controller.enqueue({ type: "text-delta", id: textId, delta: word });
          }
          controller.enqueue({ type: "text-end", id: textId });
          controller.enqueue({ type: "finish" });
          controller.close();
        } catch (error) {
          if ((error as DOMException).name === "AbortError") {
            controller.close();
            return;
          }
          controller.error(error);
        }
      },
    });
  }

  async reconnectToStream() {
    return null;
  }
}
