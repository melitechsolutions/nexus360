import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  Bell,
  CheckCircle,
  Info,
  AlertTriangle,
  Clock,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationSubscription } from "@/hooks/useNotificationSubscription";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "reminder";
  isRead: number;
  priority: "low" | "normal" | "high";
  actionUrl: string | null;
  createdAt: string | null;
  userId: string;
  category: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  expiresAt: string | null;
  metadata: string | null;
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [displayNotifications, setDisplayNotifications] = useState<Notification[]>([]);
  const utils = trpc.useUtils();

  // Fetch notifications
  const { data: notificationsData = [] } = trpc.notifications.list.useQuery({
    limit: 10,
  });

  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery({});

  // Subscribe to real-time notifications
  const { isConnected, reconnect } = useNotificationSubscription({
    onNotificationReceived: (event) => {
      // Refetch notifications when new one arrives
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
    onNotificationRead: (notificationId) => {
      // Update local state to mark as read
      setDisplayNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: 1 } : n))
      );
    },
    onNotificationDeleted: (notificationId) => {
      // Remove from local state
      setDisplayNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    },
    onUnreadCountChanged: () => {
      // Refetch unread count
      utils.notifications.unreadCount.invalidate();
    },
  });

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const deleteNotificationMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  // Update display notifications when data changes
  useEffect(() => {
    setDisplayNotifications(notificationsData);
  }, [notificationsData]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate({ id: notification.id });
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "reminder":
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -right-2 -top-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
              variant="destructive"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span>Notifications</span>
            {isConnected ? (
              <Wifi className="h-3 w-3 text-green-500" title="Connected" />
            ) : (
              <WifiOff className="h-3 w-3 text-red-500" title="Disconnected" />
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto p-0"
              onClick={() => markAllAsReadMutation.mutate()}
            >
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {displayNotifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No notifications
          </div>
        ) : (
          displayNotifications.map((notification: Notification) => (
            <div key={notification.id}>
              <div
                className={cn(
                  "flex gap-3 px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                  notification.isRead === 0 && "bg-blue-50 dark:bg-blue-900/20"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex-shrink-0 mt-1">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {notification.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {notification.createdAt ? new Date(notification.createdAt).toLocaleDateString() : 'Recently'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotificationMutation.mutate({ id: notification.id });
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <DropdownMenuSeparator />
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
