import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  type:
    | "invoice_paid"
    | "invoice_created"
    | "expense_approved"
    | "new_client"
    | "task_completed"
    | "payment_received"
    | "project_created"
    | "info";
  title: string;
  body: string;
  href?: string;
  timestamp: string;
  read: boolean;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clearAll: () => void;
}

// ─── Context ────────────────────────────────────────────────────────────────

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  markRead: () => {},
  clearAll: () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────────

const MAX_NOTIFICATIONS = 50;
const RECONNECT_DELAY_MS = 5_000;

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    // Build URL — include auth token as query param so EventSource can authenticate
    const token = localStorage.getItem("auth-token");
    const url = token
      ? `/api/sse/notifications?token=${encodeURIComponent(token)}`
      : "/api/sse/notifications";

    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data) as Omit<AppNotification, "read">;
        // Skip the initial "Connected" info ping from silent rendering
        if (data.type === "info" && data.title === "Connected") return;
        setNotifications((prev) => {
          const next: AppNotification[] = [
            { ...data, read: false },
            ...prev,
          ].slice(0, MAX_NOTIFICATIONS);
          return next;
        });
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      // Close the failed EventSource (stops browser's native retry too).
      // Schedule our own reconnect so we can build a fresh EventSource instance
      // with a new socket, avoiding HTTP/1.1 keep-alive socket reuse issues.
      es.close();
      esRef.current = null;
      if (!mountedRef.current) return;
      // Wait before reconnecting to avoid rapid retry storms
      retryRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      esRef.current?.close();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [connect]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, markAllRead, markRead, clearAll }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useNotifications() {
  return useContext(NotificationsContext);
}
