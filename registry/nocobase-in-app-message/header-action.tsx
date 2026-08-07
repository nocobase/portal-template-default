import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNotificationInbox } from "./context";
import { useInAppMessageTranslation } from "./i18n";
import { NotificationInboxSheet } from "./inbox-sheet";
import { useUnreadMessageCount } from "./queries";

export function NotificationHeaderAction() {
  const t = useInAppMessageTranslation();
  const { openInbox } = useNotificationInbox();
  const unreadQuery = useUnreadMessageCount();
  const unreadCount = unreadQuery.data ?? 0;
  const label = unreadCount
    ? t("inbox.openWithCount", "Open messages, {{count}} unread", {
        count: unreadCount,
      })
    : t("inbox.open", "Open messages");

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className="relative size-9 rounded-xl border-border/70 bg-background/60 md:size-10"
              aria-label={label}
              onClick={() => openInbox()}
            />
          }
        >
          <Bell />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold leading-4 text-destructive-foreground ring-2 ring-background">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <NotificationInboxSheet />
    </>
  );
}
