import { useGetLocale } from "@refinedev/core";
import { resolvePortalUrl } from "@nocobase/portal-sdk/runtime";
import {
  ArrowUpRight,
  Bell,
  CheckCheck,
  Circle,
  CircleCheck,
  Inbox,
} from "lucide-react";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useNotificationInbox } from "./context";
import { useInAppMessageTranslation } from "./i18n";
import {
  formatRelativeTime,
  getChannelVisibleCount,
  isSafeInAppMessageUrl,
  sortChannelsNewestFirst,
  sortMessagesNewestFirst,
} from "./presentation";
import {
  useInAppChannels,
  useInAppMessages,
  useUpdateInAppMessageStatus,
} from "./queries";
import type {
  InAppChannelStatus,
  InAppMessage,
} from "./types";

const FILTERS: InAppChannelStatus[] = ["all", "unread", "read"];

export function NotificationInboxSheet() {
  const t = useInAppMessageTranslation();
  const getLocale = useGetLocale();
  const locale = getLocale() || undefined;
  const {
    open,
    selectedChannelName,
    closeInbox,
    openInbox,
    selectChannel,
  } = useNotificationInbox();
  const [status, setStatus] = useState<InAppChannelStatus>("all");
  const channelsQuery = useInAppChannels(status, open);
  const messagesQuery = useInAppMessages(selectedChannelName, status, open);
  const updateStatus = useUpdateInAppMessageStatus();
  const channels = useMemo(
    () => sortChannelsNewestFirst(channelsQuery.data ?? []),
    [channelsQuery.data]
  );
  const messages = useMemo(
    () => sortMessagesNewestFirst(messagesQuery.data ?? []),
    [messagesQuery.data]
  );
  const selectedChannel = channels.find(
    (channel) => channel.name === selectedChannelName
  );

  useEffect(() => {
    if (!open || channels.length === 0) return;
    if (!selectedChannelName || !selectedChannel) {
      selectChannel(channels[0].name);
    }
  }, [channels, open, selectChannel, selectedChannel, selectedChannelName]);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) openInbox();
    else closeInbox();
  }

  function handleMarkAllRead() {
    if (!selectedChannelName) return;
    updateStatus.mutate({ channelName: selectedChannelName, status: "read" });
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-4xl!">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>{t("inbox.title", "Messages")}</SheetTitle>
          <SheetDescription>
            {t(
              "inbox.description",
              "Notifications sent to you in this application."
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside className="flex min-h-48 flex-col border-b md:w-80 md:border-r md:border-b-0">
            <Tabs
              value={status}
              onValueChange={(value) => setStatus(value as InAppChannelStatus)}
              className="p-3 pb-2"
            >
              <TabsList className="grid w-full grid-cols-3">
                {FILTERS.map((filter) => (
                  <TabsTrigger key={filter} value={filter}>
                    {t(`inbox.filter.${filter}`, filter)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <ScrollArea className="min-h-0 flex-1 px-2 pb-2">
              {channelsQuery.isPending ? (
                <ChannelSkeletons />
              ) : channels.length === 0 ? (
                <EmptyState compact />
              ) : (
                <div role="list" className="space-y-1">
                  {channels.map((channel) => {
                    const active = channel.name === selectedChannelName;
                    const visibleCount = getChannelVisibleCount(
                      channel,
                      status
                    );
                    return (
                      <button
                        key={channel.name}
                        type="button"
                        role="listitem"
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "w-full rounded-lg px-3 py-2.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                          active && "bg-muted"
                        )}
                        onClick={() => selectChannel(channel.name)}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="truncate font-medium">
                            {channel.title || channel.name}
                          </span>
                          <time
                            dateTime={new Date(
                              channel.latestMsgReceiveTimestamp
                            ).toISOString()}
                            title={new Intl.DateTimeFormat(locale, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(
                              new Date(channel.latestMsgReceiveTimestamp)
                            )}
                            className="shrink-0 text-[11px] font-normal text-muted-foreground"
                          >
                            {formatRelativeTime(
                              channel.latestMsgReceiveTimestamp,
                              locale
                            )}
                          </time>
                        </span>
                        <span className="mt-0.5 flex min-h-5 items-center justify-between gap-3">
                          <span className="truncate text-xs text-muted-foreground">
                            {channel.latestMsgTitle}
                          </span>
                          {visibleCount > 0 && (
                            <span
                              title={`${t("inbox.status.unread", "Unread")}: ${visibleCount}`}
                              className="flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold leading-5 text-white"
                            >
                              {visibleCount > 99 ? "99+" : visibleCount}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </aside>
          <section className="flex min-h-0 flex-1 flex-col bg-muted/20">
            <div className="flex min-h-14 items-center justify-between gap-3 border-b px-4 py-3">
              <h2 className="truncate font-medium">
                {selectedChannel?.title || selectedChannel?.name ||
                  t("inbox.title", "Messages")}
              </h2>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  !selectedChannel ||
                  selectedChannel.unreadMsgCnt === 0 ||
                  updateStatus.isPending
                }
                onClick={handleMarkAllRead}
              >
                <CheckCheck />
                {t("inbox.markAllRead", "Mark all as read")}
              </Button>
            </div>
            <ScrollArea className="min-h-0 flex-1 p-4">
              {channelsQuery.isError || messagesQuery.isError ? (
                <LoadError
                  retry={() => {
                    channelsQuery.refetch();
                    messagesQuery.refetch();
                  }}
                />
              ) : messagesQuery.isPending && selectedChannelName ? (
                <MessageSkeletons />
              ) : messages.length === 0 ? (
                <EmptyState />
              ) : (
                <div role="list" className="space-y-2 pb-4">
                  {messages.map((message) => (
                    <MessageCard
                      key={message.id}
                      message={message}
                      pending={updateStatus.isPending}
                      updateStatus={updateStatus.mutateAsync}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MessageCard({
  message,
  pending,
  updateStatus,
}: {
  message: InAppMessage;
  pending: boolean;
  updateStatus: (values: {
    messageId: string;
    status: "read" | "unread";
  }) => Promise<unknown>;
}) {
  const t = useInAppMessageTranslation();
  const getLocale = useGetLocale();
  const receivedAt = new Intl.DateTimeFormat(getLocale() || undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(message.receiveTimestamp));
  const relativeTime = formatRelativeTime(
    message.receiveTimestamp,
    getLocale() || undefined
  );
  const toggleStatusLabel =
    message.status === "unread"
      ? t("inbox.markRead", "Mark as read")
      : t("inbox.markUnread", "Mark as unread");
  const statusLabel =
    message.status === "unread"
      ? t("inbox.status.unread", "Unread")
      : t("inbox.status.read", "Read");
  const hasContent = message.content.trim().length > 0;
  const safeMessageUrl =
    message.options?.url && isSafeInAppMessageUrl(message.options.url)
      ? resolvePortalUrl(message.options.url)
      : undefined;

  async function handleOpenMessage() {
    if (message.status === "unread") {
      await updateStatus({ messageId: message.id, status: "read" });
    }
    if (safeMessageUrl) {
      window.location.assign(safeMessageUrl);
    }
  }

  function handleToggleStatus(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    updateStatus({
      messageId: message.id,
      status: message.status === "unread" ? "read" : "unread",
    }).catch(() => undefined);
  }

  return (
    <article
      role="listitem"
      className={cn(
        "rounded-lg border border-l-2 px-3 py-2.5 transition-colors",
        message.status === "unread"
          ? "border-primary/30 border-l-primary bg-primary/[0.045] shadow-xs"
          : "border-border/60 border-l-muted-foreground/25 bg-background/70"
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Badge
            variant={message.status === "unread" ? "default" : "secondary"}
            className={cn(
              "h-4 rounded-sm px-1.5 text-[10px] leading-none",
              message.status === "read" && "text-muted-foreground"
            )}
          >
            {statusLabel}
          </Badge>
          <button
            type="button"
            className={cn(
              "min-w-0 truncate text-left text-sm leading-6 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50",
              message.status === "unread" && "font-semibold"
            )}
            onClick={handleOpenMessage}
          >
            {message.title}
          </button>
          <span className="flex size-6 shrink-0 items-center justify-center">
            {safeMessageUrl && (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t("inbox.view", "View")}
                title={t("inbox.view", "View")}
                onClick={handleOpenMessage}
              >
                <ArrowUpRight />
              </Button>
            )}
          </span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <time
            dateTime={new Date(message.receiveTimestamp).toISOString()}
            title={receivedAt}
            className="mr-1 text-[11px] text-muted-foreground"
          >
            {relativeTime}
          </time>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={pending}
            aria-label={toggleStatusLabel}
            title={toggleStatusLabel}
            onClick={handleToggleStatus}
          >
            {message.status === "unread" ? <CircleCheck /> : <Circle />}
          </Button>
        </div>
      </div>
      {hasContent ? (
        <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
          {message.content}
        </p>
      ) : (
        <p className="mt-1 flex min-h-8 items-center rounded-md bg-muted/30 px-2 text-xs italic text-muted-foreground">
          {t("inbox.emptyContent", "No content")}
        </p>
      )}
    </article>
  );
}

function EmptyState({ compact = false }: { compact?: boolean }) {
  const t = useInAppMessageTranslation();
  return (
    <Empty className={cn(compact ? "min-h-36" : "min-h-80")}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {compact ? <Bell /> : <Inbox />}
        </EmptyMedia>
        <EmptyTitle>{t("inbox.empty.title", "No messages")}</EmptyTitle>
        {!compact && (
          <EmptyDescription>
            {t(
              "inbox.empty.description",
              "New notifications will appear here."
            )}
          </EmptyDescription>
        )}
      </EmptyHeader>
    </Empty>
  );
}

function LoadError({ retry }: { retry: () => void }) {
  const t = useInAppMessageTranslation();
  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Bell />
        </EmptyMedia>
        <EmptyTitle>
          {t("inbox.error.title", "Unable to load messages")}
        </EmptyTitle>
        <EmptyDescription>
          {t(
            "inbox.error.description",
            "Check the notification plugins and try again."
          )}
        </EmptyDescription>
      </EmptyHeader>
      <Button variant="outline" onClick={retry}>
        {t("inbox.retry", "Try again")}
      </Button>
    </Empty>
  );
}

function ChannelSkeletons() {
  return (
    <div aria-hidden="true" className="space-y-2 p-1">
      {[0, 1, 2].map((item) => (
        <div key={item} className="space-y-2 rounded-lg p-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

function MessageSkeletons() {
  const t = useInAppMessageTranslation();
  return (
    <div
      role="status"
      aria-label={t("inbox.loading", "Loading messages")}
      className="space-y-3"
    >
      {[0, 1, 2].map((item) => (
        <div key={item} className="space-y-2 rounded-lg border bg-background p-3">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}
