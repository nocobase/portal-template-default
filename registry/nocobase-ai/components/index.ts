export { AIChatWindow, type AIChatWindowProps } from "./chat/chat-window";
export { ChatComposer, type AIChatComposerAction } from "./chat/chat-composer";
export { AIChatCompact } from "./chat/chat-compact";
export { AIChatHistoryDialog } from "./chat/chat-history-dialog";
export { AIChatMessageList, ChatMessages } from "./chat/chat-messages";
export { AIModelSelectOptions } from "./chat/model-select-options";
export { ChatDialog } from "./surfaces/chat-dialog";
export { ChatSurfaceActions } from "./surfaces/chat-surface-actions";
export { ChatInline } from "./surfaces/chat-inline";
export { ChatPage } from "./surfaces/chat-page";
export {
  ChatSidePanel,
  type ChatSidePanelProps,
} from "./surfaces/chat-side-panel";
export {
  ChatSidePanelLayout,
  type ChatSidePanelLayoutProps,
} from "./surfaces/chat-side-panel-layout";
export { AIChatFloatingTrigger } from "./triggers/ai-chat-floating-trigger";
export { AIEmployeeShortcut } from "./triggers/ai-employee-shortcut";
export {
  AIPageElementProvider,
  useAIPageElement,
  useAIPageElementPicker,
  type AIPageElementDescriptor,
  type AIPageElementPickerOptions,
} from "./page-elements/page-element-provider";
export {
  applyReactHookFormValues,
  useAIForm,
  type AIFormDescriptor,
} from "./page-elements/ai-form";
export {
  AIToolRendererProvider,
  useAIToolRenderer,
  type AIToolRenderer,
  type AIToolRendererDefinition,
  type AIToolRendererEntry,
  type AIToolRendererMap,
  type AIToolRendererProps,
} from "./tools/tool-renderer-provider";
