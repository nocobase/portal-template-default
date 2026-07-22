import { AIChatPage } from "./demo";
import { FloatingChatPage } from "./demo/floating";
import { ShortcutPage } from "./demo/shortcut";
import { ToolCardsPage } from "./demo/tool-cards";
import { NocoBaseAIExtensionProvider } from "./global-ai-chat";
import type { AppExtension } from "@/app/extension";
import { Bot, MessageSquare, PanelRight, Sparkles, Wrench } from "lucide-react";
import { Outlet, Route } from "react-router";

const nocobaseAIExtension: AppExtension = {
  id: "nocobase-ai",
  Provider: NocoBaseAIExtensionProvider,
  resources: [
    {
      name: "ai-components",
      meta: {
        label: "AI Components",
        icon: <Bot />,
      },
    },
    {
      name: "ai-chat-window",
      list: "/ai-chat",
      meta: {
        parent: "ai-components",
        label: "Chat window",
        icon: <MessageSquare />,
        description:
          "Build freely with AI while NocoBase keeps the application reliable.",
      },
    },
    {
      name: "ai-floating-chat",
      list: "/ai-chat/floating",
      meta: {
        parent: "ai-components",
        label: "Floating chat",
        icon: <PanelRight />,
      },
    },
    {
      name: "ai-employee-tasks",
      list: "/ai-chat/shortcut",
      meta: {
        parent: "ai-components",
        label: "Employee tasks",
        icon: <Sparkles />,
      },
    },
    {
      name: "ai-tool-cards",
      list: "/ai-chat/tools",
      meta: {
        parent: "ai-components",
        label: "Tool cards",
        icon: <Wrench />,
      },
    },
  ],
  routes: (
    <Route key="nocobase-ai" path="/ai-chat" element={<Outlet />}>
      <Route index element={<AIChatPage />} />
      <Route path="floating" element={<FloatingChatPage />} />
      <Route path="shortcut" element={<ShortcutPage />} />
      <Route path="tools" element={<ToolCardsPage />} />
    </Route>
  ),
};

export default nocobaseAIExtension;
