import { useState, useMemo } from "react";
import { useRequireRole } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertCircle,
  Download,
  Filter,
  Search,
  Clock,
  Eye,
  ChevronDown,
  Monitor,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Badge } from "@/components/ui/badge";

interface AuditLog {
  id: string;
  timestamp: Date;
  level: "info" | "warning" | "error" | "debug";
  category: string;
  user: string;
  action: string;
  message: string;
  details: string;
  ipAddress: string;
}

type FilterLevel = "all" | "info" | "warning" | "error" | "debug";

export default function SystemLogsViewer() {
  const { allowed, isLoading } = useRequireRole(["ict_manager", "super_admin", "admin"]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState<FilterLevel>("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Mock data - in production this would come from tRPC
  const mockLogs: AuditLog[] = [
    {
      id: "1",
      timestamp: new Date(Date.now() - 5 * 60000),
      level: "info",
      category: "Authentication",
      user: "admin@example.com",
      action: "Login",
      message: "User successfully logged in",
      details: "Session created with token: abc123...",
      ipAddress: "192.168.1.100",
    },
    {
      id: "2",
      timestamp: new Date(Date.now() - 15 * 60000),
      level: "warning",
      category: "Security",
      user: "system",
      action: "Failed Login Attempt",
      message: "Multiple failed login attempts detected",
      details: "3 failed attempts from IP 192.168.1.50 in last 10 minutes",
      ipAddress: "192.168.1.50",
    },
    {
      id: "3",
      timestamp: new Date(Date.now() - 30 * 60000),
      level: "info",
      category: "Database",
      user: "backup-service",
      action: "Backup Started",
      message: "Automatic database backup initiated",
      details: "Full backup of production database started",
      ipAddress: "10.0.0.1",
    },
    {
      id: "4",
      timestamp: new Date(Date.now() - 1 * 60 * 60000),
      level: "error",
      category: "API",
      user: "system",
      action: "API Error",
      message: "High error rate detected on /api/invoices",
      details: "Error rate: 5.2% (threshold: 2%)",
      ipAddress: "10.0.0.2",
    },
    {
      id: "5",
      timestamp: new Date(Date.now() - 2 * 60 * 60000),
      level: "info",
      category: "System",
      user: "admin@example.com",
      action: "System Configuration",
      message: "System settings updated",
      details: "Email retention period changed from 30 to 60 days",
      ipAddress: "192.168.1.100",
    },
  ];

  // Filter logs
  const filteredLogs = useMemo(() => {
    return mockLogs.filter((log) => {
      const matchesSearch =
        searchTerm === "" ||
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesLevel = filterLevel === "all" || log.level === filterLevel;
      const matchesCategory =
        filterCategory === "all" || log.category === filterCategory;

      return matchesSearch && matchesLevel && matchesCategory;
    });
  }, [searchTerm, filterLevel, filterCategory]);

  const categories = ["all", ...new Set(mockLogs.map((log) => log.category))];

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "info":
        return "bg-blue-100 text-blue-800";
      case "debug":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error":
        return <AlertCircle className="w-4 h-4" />;
      case "warning":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <ModuleLayout
      title="System Logs"
      description="View and audit system activity and events"
      icon={<Monitor className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "ICT", href: "/dashboards/ict" },
        { label: "System Logs" },
      ]}
    >
      <div className="space-y-6">
        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex gap-2">
                <Search className="w-5 h-5 text-gray-400 absolute ml-2 mt-3" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterLevel} onValueChange={(value) => setFilterLevel(value as FilterLevel)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCategory} onValueChange={(value) => setFilterCategory(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === "all" ? "All Categories" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Logs</CardTitle>
            <CardDescription>
              Showing {filteredLogs.length} of {mockLogs.length} logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() =>
                        setExpandedLogId(expandedLogId === log.id ? null : log.id)
                      }
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge
                            variant="outline"
                            className={`flex items-center gap-1 ${getLevelColor(
                              log.level
                            )}`}
                          >
                            {getLevelIcon(log.level)}
                            {log.level.charAt(0).toUpperCase() + log.level.slice(1)}
                          </Badge>
                          <span className="text-sm text-gray-600">{log.category}</span>
                          <span className="text-xs text-gray-400">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="font-medium text-sm mb-1">{log.action}</p>
                        <p className="text-sm text-gray-600">{log.message}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>User: {log.user}</span>
                          <span>IP: {log.ipAddress}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                        onClick={() =>
                          setExpandedLogId(
                            expandedLogId === log.id ? null : log.id
                          )
                        }
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            expandedLogId === log.id ? "rotate-180" : ""
                          }`}
                        />
                      </Button>
                    </div>

                    {/* Expanded Details */}
                    {expandedLogId === log.id && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="bg-gray-50 rounded p-3">
                          <p className="text-sm font-medium mb-2">Details:</p>
                          <p className="text-sm text-gray-700 font-mono break-words">
                            {log.details}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No logs matching your criteria</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
