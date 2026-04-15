import { useState, useEffect, useRef } from "react";
import { Bell, X, AlertCircle, CheckCircle, Info, AlertTriangle, Zap, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface NotificationWithCategory {
  category?: string;
  priority?: "low" | "normal" | "high";
  type?: "info" | "success" | "warning" | "error" | "reminder";
  [key: string]: any;
}

export function NotificationBell() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState("all");
  const [isAnimating, setIsAnimating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Fetch unread count
  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent notifications
  const { data: notifications = [] } = trpc.notifications.list.useQuery(
    { limit: 15 },
    { refetchInterval: 30000 }
  );

  // Trigger animation when new notifications arrive
  useEffect(() => {
    if (unreadCount > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 600);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
      utils.notifications.unread.invalidate();
    },
  });

  const deleteMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
      utils.notifications.unread.invalidate();
    },
  });

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate({ id: notification.id });
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "reminder":
        return <Zap className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 border-red-200 dark:border-red-800";
      case "normal":
        return "bg-amber-500/10 border-amber-200 dark:border-amber-800";
      case "low":
        return "bg-blue-500/10 border-blue-200 dark:border-blue-800";
      default:
        return "bg-slate-500/10 border-slate-200 dark:border-slate-800";
    }
  };

  const getPriorityBadgeColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "normal":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      case "low":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200";
    }
  };

  // Filter notifications by tab
  const filterNotifications = (notificationList: any[], filter: string) => {
    switch (filter) {
      case "unread":
        return notificationList.filter((n) => !n.isRead);
      case "success":
        return notificationList.filter((n) => n.type === "success");
      case "alerts":
        return notificationList.filter((n) =>
          ["error", "warning"].includes(n.type)
        );
      case "all":
      default:
        return notificationList;
    }
  };

  const filteredNotifications = filterNotifications(
    notifications,
    activeTab
  );

  const unreadInTab =
    activeTab === "unread"
      ? filteredNotifications.length
      : filteredNotifications.filter((n) => !n.isRead).length;

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative transition-all duration-300",
          isAnimating && "animate-pulse"
        )}
      >
        <Bell className={cn("h-5 w-5 transition-transform", isAnimating && "scale-110")} />
        {unreadCount > 0 && (
          <Badge
            className={cn(
              "absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold animate-in fade-in zoom-in",
              unreadCount > 3 ? "bg-red-500" : "bg-blue-500"
            )}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 rounded-md border bg-popover text-popover-foreground shadow-lg z-[100] animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div>
              <h3 className="font-semibold text-base">Notifications</h3>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : "All caught up!"}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                className="text-xs h-7"
              >
                Mark all read
              </Button>
            )}
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 rounded-none border-b px-4 py-0 h-10 bg-transparent">
              <TabsTrigger
                value="all"
                className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Unread
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="alerts"
                className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Alerts
              </TabsTrigger>
              <TabsTrigger
                value="success"
                className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Success
              </TabsTrigger>
            </TabsList>

            {/* Notifications Content */}
            {["all", "unread", "alerts", "success"].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0">
                <ScrollArea className="h-96">
                  {!filteredNotifications || filteredNotifications.length === 0 ? (
                    <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto opacity-20 mb-2" />
                      <p>
                        {tab === "unread"
                          ? "No unread notifications"
                          : tab === "alerts"
                          ? "No alerts"
                          : tab === "success"
                          ? "No success notifications"
                          : "No notifications yet"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 p-2">
                      {filteredNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={cn(
                            "group relative flex gap-3 p-3 rounded-lg border transition-all hover:shadow-sm cursor-pointer",
                            getPriorityColor(notification.priority),
                            !notification.isRead && "border-current opacity-100",
                            notification.isRead && "opacity-75 hover:opacity-100"
                          )}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          {/* Icon */}
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type || "")}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-sm">
                                {typeof notification.title === "string"
                                  ? notification.title
                                  : "Notification"}
                              </p>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {notification.priority && notification.priority !== "low" && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-xs capitalize",
                                      getPriorityBadgeColor(notification.priority)
                                    )}
                                  >
                                    {String(notification.priority)}
                                  </Badge>
                                )}
                                {!notification.isRead && (
                                  <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                                )}
                              </div>
                            </div>

                            {/* Message */}
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {typeof notification.message === "string"
                                ? notification.message
                                : ""}
                            </p>

                            {/* Category & Time */}
                            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                              {notification.category && (
                                <span className="px-1.5 py-0.5 bg-muted rounded inline-block">
                                  {String(notification.category)}
                                </span>
                              )}
                              <span className="ml-auto flex-shrink-0">
                                {notification.createdAt
                                  ? formatDistanceToNow(new Date(notification.createdAt), {
                                      addSuffix: true,
                                    })
                                  : ""}
                              </span>
                            </div>
                          </div>

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate(notification.id);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>

          {/* Footer */}
          <Separator />
          <div className="px-2 py-2 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={() => { setIsOpen(false); navigate("/notifications"); }}
            >
              View all
            </Button>
            {notifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="px-2 h-8"
                onClick={() => {
                  notifications
                    .filter((n) => n.isRead)
                    .forEach((n) => deleteMutation.mutate(n.id));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

