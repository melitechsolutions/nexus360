import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle,
  Info,
  AlertCircle,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Filter,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { StatsCard } from "@/components/ui/stats-card";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "reminder";
  category?: string;
  priority: "low" | "normal" | "high";
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  expiresAt?: string;
}

export default function Notifications() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const queryUtils = trpc.useUtils();

  // Fetch notifications
  const { data: notifications = [], isLoading, refetch } = trpc.notifications.list.useQuery({
    limit: 100,
  });

  // Mark as read mutation
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      toast.success("Notification marked as read");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to mark as read");
    },
  });

  // Mark as unread mutation
  const markAsUnreadMutation = trpc.notifications.markAsUnread.useMutation({
    onSuccess: () => {
      toast.success("Notification marked as unread");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to mark as unread");
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      toast.success("Notification deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete notification");
    },
  });

  // Filter notifications based on criteria
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif: any) => {
      const matchesSearch =
        notif.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notif.message?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === "all" || notif.type === typeFilter;
      const matchesRead = readFilter === "all" || (readFilter === "unread" ? !notif.isRead : notif.isRead);
      const matchesPriority = priorityFilter === "all" || notif.priority === priorityFilter;

      return matchesSearch && matchesType && matchesRead && matchesPriority;
    });
  }, [notifications, searchQuery, typeFilter, readFilter, priorityFilter]);

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      case "reminder":
        return <Bell className="h-4 w-4 text-blue-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      case "normal":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "low":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "error":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      case "warning":
        return "bg-amber-100 text-amber-800 hover:bg-amber-100";
      case "reminder":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      default:
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    }
  };

  return (
    <ModuleLayout
      title="Notifications"
      description="View and manage your notifications"
      icon={<Bell className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Notifications" },
      ]}
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard label="Total Notifications" value={notifications.length} description="All time" color="border-l-purple-500" />

          <StatsCard label="Unread" value={unreadCount} description="Need attention" color="border-l-green-500" />

          <StatsCard label="Read" value={notifications.length - unreadCount} description="Reviewed" color="border-l-blue-500" />
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={readFilter} onValueChange={setReadFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Table */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Showing {filteredNotifications.length} of {notifications.length} notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading notifications...</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No notifications found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="hidden md:table-cell">Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotifications.map((notif: any) => (
                      <TableRow key={notif.id} className={notif.isRead ? "opacity-60" : ""}>
                        <TableCell>{getTypeIcon(notif.type)}</TableCell>
                        <TableCell>
                          <Badge className={getTypeColor(notif.type)}>{notif.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{notif.title}</div>
                          <div className="text-sm text-muted-foreground line-clamp-1">{notif.message}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(notif.priority)}>{notif.priority}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (notif.isRead) {
                                markAsUnreadMutation.mutate({ id: notif.id });
                              } else {
                                markAsReadMutation.mutate({ id: notif.id });
                              }
                            }}
                            title={notif.isRead ? "Mark as unread" : "Mark as read"}
                          >
                            {notif.isRead ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotificationMutation.mutate(notif.id)}
                            title="Delete notification"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
