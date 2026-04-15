import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageCircle, X, Send, ChevronDown, Bell, AlertTriangle,
  CheckCircle, Info, CreditCard, FolderOpen, Users, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(userId: string) {
  const colors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
    "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-rose-500",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const typeIcon: Record<string, React.ReactNode> = {
  info: <Info className="w-3.5 h-3.5 text-blue-500" />,
  success: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
  error: <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
  reminder: <Bell className="w-3.5 h-3.5 text-purple-500" />,
  payment: <CreditCard className="w-3.5 h-3.5 text-emerald-500" />,
  project: <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />,
  client: <Users className="w-3.5 h-3.5 text-cyan-500" />,
  financial: <CreditCard className="w-3.5 h-3.5 text-orange-500" />,
  system: <Settings className="w-3.5 h-3.5 text-slate-500" />,
  chat: <MessageCircle className="w-3.5 h-3.5 text-blue-500" />,
};

const typeBg: Record<string, string> = {
  info: "border-l-blue-500",
  success: "border-l-green-500",
  warning: "border-l-amber-500",
  error: "border-l-red-500",
  reminder: "border-l-purple-500",
  payment: "border-l-emerald-500",
  project: "border-l-indigo-500",
  client: "border-l-cyan-500",
  financial: "border-l-orange-500",
  system: "border-l-slate-500",
  chat: "border-l-blue-500",
};

interface FloatingNotif {
  id: string;
  type: "chat" | string;
  title: string;
  message: string;
  userName?: string;
  userId?: string;
  channelId?: string;
  actionUrl?: string;
  timestamp: string;
  fadingOut?: boolean;
}

const FADE_DURATION = 10000; // 10 seconds before fade-out starts
const FADE_ANIM_MS = 600; // fade animation duration

export default function FloatingChatNotifications() {
  const [notifications, setNotifications] = useState<FloatingNotif[]>([]);
  const [expandedNotif, setExpandedNotif] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [lastSeenChatId, setLastSeenChatId] = useState<string>("");
  const [shownChatIds, setShownChatIds] = useState<Set<string>>(new Set());
  const [lastSeenNotifIds, setLastSeenNotifIds] = useState<Set<string>>(new Set());
  const [location, navigate] = useLocation();
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const isOnChatPage = location === "/staff-chat" || location === "/communications/staff-chat";

  const { data: profileData } = trpc.auth.me.useQuery();
  const currentUserId = profileData?.id || "";

  // Poll unread chat messages (only show notifications for unread messages)
  const { data: unreadMessagesData, refetch: refetchUnread } = trpc.staffChat.getUnreadMessages.useQuery(
    { channelId: "general", limit: 10 },
    { refetchInterval: 5000, enabled: !isOnChatPage }
  );

  // Poll system notifications (unread)
  const { data: sysNotifs } = trpc.notifications.unread.useQuery(undefined, {
    refetchInterval: 6000,
  });

  const markRead = trpc.notifications.markAsRead.useMutation();
  const markChatRead = trpc.staffChat.markChatRead.useMutation();

  const sendMut = trpc.staffChat.sendMessage.useMutation({
    onSuccess: () => {
      setReplyInput("");
      setExpandedNotif(null);
    },
  });

  // Schedule fade-out for a notification
  const scheduleFade = (id: string) => {
    if (timersRef.current.has(id)) return;
    const t = setTimeout(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, fadingOut: true } : n))
      );
      // After animation, remove it
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        timersRef.current.delete(id);
      }, FADE_ANIM_MS);
    }, FADE_DURATION);
    timersRef.current.set(id, t);
  };

  // Track new unread chat messages
  useEffect(() => {
    if (!unreadMessagesData || isOnChatPage) return;
    const msgs = unreadMessagesData;
    if (msgs.length === 0) return;

    const latestMsg = msgs[0]; // Unread messages are already sorted by newest first by backend
    // Only show notification if we haven't already shown it for this message
    if (!shownChatIds.has(latestMsg.id) && latestMsg.userId !== currentUserId) {
      setLastSeenChatId(latestMsg.id);
      // Mark this message as shown so we don't show it again
      setShownChatIds((prev) => {
        const next = new Set(prev);
        next.add(latestMsg.id);
        return next;
      });
      
      const chatNotif: FloatingNotif = {
        id: `chat-${latestMsg.id}`,
        type: "chat",
        title: `Message from ${latestMsg.userName}`,
        message: latestMsg.content,
        userName: latestMsg.userName,
        userId: latestMsg.userId,
        channelId: latestMsg.channelId || "general",
        actionUrl: "/staff-chat",
        timestamp: latestMsg.createdAt || new Date().toISOString(),
      };
      setNotifications((prev) => {
        const updated = [chatNotif, ...prev.filter((n) => n.id !== chatNotif.id)].slice(0, 5);
        return updated;
      });
      // Immediately mark as read so it doesn't come back on next poll
      markChatRead.mutate(
        { channelId: latestMsg.channelId || "general", lastReadMessageId: latestMsg.id },
        { onSuccess: () => refetchUnread() }
      );
      scheduleFade(chatNotif.id);
    }
  }, [unreadMessagesData, shownChatIds, currentUserId, isOnChatPage]);

  // Track system notifications
  useEffect(() => {
    if (!sysNotifs || sysNotifs.length === 0) return;
    const newNotifs: FloatingNotif[] = [];
    for (const n of sysNotifs) {
      if (!lastSeenNotifIds.has(n.id)) {
        newNotifs.push({
          id: `sys-${n.id}`,
          type: n.type || "info",
          title: n.title,
          message: n.message,
          actionUrl: n.actionUrl || undefined,
          timestamp: n.createdAt || new Date().toISOString(),
        });
      }
    }
    if (newNotifs.length > 0) {
      // Mark as read on server immediately so they don't reappear on navigation
      newNotifs.forEach((n) => {
        const realId = n.id.replace("sys-", "");
        markRead.mutate({ id: realId });
      });
      setLastSeenNotifIds((prev) => {
        const next = new Set(prev);
        sysNotifs.forEach((n: any) => next.add(n.id));
        return next;
      });
      setNotifications((prev) => {
        const updated = [...newNotifs, ...prev].slice(0, 5);
        return updated;
      });
      newNotifs.forEach((n) => scheduleFade(n.id));
    }
  }, [sysNotifs]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  // Auto-dismiss chat notifications when user navigates to chat page
  useEffect(() => {
    if (isOnChatPage) {
      const chatNotifs = notifications.filter((n) => n.id.startsWith("chat-"));
      chatNotifs.forEach((n) => {
        const msgId = n.id.replace("chat-", "");
        markChatRead.mutate(
          { channelId: n.channelId || "general", lastReadMessageId: msgId },
          { onSuccess: () => refetchUnread() }
        );
        const t = timersRef.current.get(n.id);
        if (t) { clearTimeout(t); timersRef.current.delete(n.id); }
      });
      if (chatNotifs.length > 0) {
        setNotifications((prev) => prev.filter((n) => !n.id.startsWith("chat-")));
      }
    }
  }, [isOnChatPage]);

  const handleReply = (channelId: string) => {
    if (!replyInput.trim()) return;
    sendMut.mutate({ content: replyInput.trim(), channelId });
  };

  const dismiss = (id: string) => {
    const t = timersRef.current.get(id);
    if (t) { clearTimeout(t); timersRef.current.delete(id); }
    // If it's a system notification, mark as read
    if (id.startsWith("sys-")) {
      const realId = id.replace("sys-", "");
      markRead.mutate({ id: realId });
    }
    // If it's a chat notification, mark as read and refetch unread messages
    if (id.startsWith("chat-")) {
      const msgId = id.replace("chat-", "");
      const notif = notifications.find((n) => n.id === id);
      markChatRead.mutate(
        { channelId: notif?.channelId || "general", lastReadMessageId: msgId },
        { onSuccess: () => refetchUnread() }
      );
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (expandedNotif === id) setExpandedNotif(null);
  };

  const dismissAll = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
    notifications.forEach((n) => {
      if (n.id.startsWith("sys-")) markRead.mutate({ id: n.id.replace("sys-", "") });
      if (n.id.startsWith("chat-")) {
        const msgId = n.id.replace("chat-", "");
        markChatRead.mutate(
          { channelId: n.channelId || "general", lastReadMessageId: msgId },
          { onSuccess: () => refetchUnread() }
        );
      }
    });
    setNotifications([]);
    setExpandedNotif(null);
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 max-w-[360px] pointer-events-none">
      {/* Clear all button */}
      {notifications.length > 1 && (
        <div className="flex justify-end pointer-events-auto">
          <Button variant="secondary" size="sm" className="h-6 text-[10px] px-2 shadow" onClick={dismissAll}>
            Clear all
          </Button>
        </div>
      )}

      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={cn(
            "border border-l-4 rounded-xl overflow-hidden transition-all pointer-events-auto",
            "bg-white/80 dark:bg-gray-900/80",
            "backdrop-blur-sm hover:bg-white dark:hover:bg-gray-900",
            "hover:shadow-lg shadow-md",
            typeBg[notif.type] || "border-l-blue-500",
            notif.fadingOut
              ? "opacity-0 translate-x-8 transition-all duration-500 ease-in"
              : "animate-in slide-in-from-right-5 opacity-100"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50">
            {notif.type === "chat" && notif.userId ? (
              <Avatar className="w-6 h-6">
                <AvatarFallback className={`${getAvatarColor(notif.userId)} text-white text-[9px]`}>
                  {getInitials(notif.userName || "?")}
                </AvatarFallback>
              </Avatar>
            ) : (
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted">
                {typeIcon[notif.type] || <Bell className="w-3.5 h-3.5" />}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{notif.title}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(notif.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
              onClick={() => dismiss(notif.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Body */}
          <div
            className={cn("px-3 py-2", notif.actionUrl && "cursor-pointer hover:bg-muted/30")}
            onClick={() => { if (notif.actionUrl) { dismiss(notif.id); navigate(notif.actionUrl); } }}
          >
            <p className="text-sm line-clamp-2">{notif.message}</p>
          </div>

          {/* Quick reply for chat */}
          {notif.type === "chat" && (
            <div className="px-3 pb-2">
              {expandedNotif === notif.id ? (
                <div className="flex gap-1">
                  <Input
                    placeholder="Quick reply..."
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    className="h-7 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleReply(notif.channelId || "general");
                      }
                    }}
                  />
                  <Button size="sm" className="h-7 w-7 p-0" onClick={() => handleReply(notif.channelId || "general")} disabled={sendMut.isPending}>
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] w-full"
                  onClick={() => setExpandedNotif(notif.id)}
                >
                  Reply
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
