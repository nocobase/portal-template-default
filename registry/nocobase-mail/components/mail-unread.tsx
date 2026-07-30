import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { Mail } from "lucide-react";
import { mailApi } from "./mail-api";
import { cn } from "@/lib/utils";

interface MailUnreadContextValue {
  count: number;
  refresh: () => void;
}

const MailUnreadContext = createContext<MailUnreadContextValue>({
  count: 0,
  refresh: () => undefined,
});

export interface MailUnreadProviderProps extends PropsWithChildren {
  pollIntervalMs?: number;
}

export function MailUnreadProvider({
  children,
  pollIntervalMs = 60_000,
}: MailUnreadProviderProps) {
  const [count, setCount] = useState(0);
  const inFlight = useRef<Promise<void> | undefined>(undefined);

  const refresh = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = mailApi
      .unreadCount()
      .then(setCount)
      .catch(() => undefined)
      .finally(() => {
        inFlight.current = undefined;
      });
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, pollIntervalMs);
    const handleFocus = () => refresh();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [pollIntervalMs, refresh]);

  const value = useMemo(() => ({ count, refresh }), [count, refresh]);
  return <MailUnreadContext.Provider value={value}>{children}</MailUnreadContext.Provider>;
}

export function useMailUnread() {
  return useContext(MailUnreadContext);
}

export interface MailUnreadIndicatorProps {
  icon?: ReactNode;
  label?: string;
  showZero?: boolean;
  max?: number;
  className?: string;
}

export function MailUnreadIndicator({
  icon = <Mail />,
  label,
  showZero = false,
  max = 99,
  className,
}: MailUnreadIndicatorProps) {
  const { count } = useMailUnread();
  const visible = showZero || count > 0;
  const displayCount = count > max ? `${max}+` : String(count);

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      aria-label={`${count} unread ${count === 1 ? "message" : "messages"}`}
    >
      <span className="relative inline-flex">
        {icon}
        {visible && (
          <span className="absolute -top-2 -right-2 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold leading-4 text-destructive-foreground ring-2 ring-sidebar">
            {displayCount}
          </span>
        )}
      </span>
      {label && <span>{label}</span>}
    </span>
  );
}

export function MailUnreadIcon() {
  return <MailUnreadIndicator />;
}
