import { useState, useMemo } from "react";
import { useRequireRole } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertCircle,
  LogOut,
  Filter,
  Search,
  Globe,
  Clock,
  MoreVertical,
  Monitor,
  Trash2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/ui/stats-card";

interface UserSession {
  id: string;
  userId: string;
  userName: string;
  email: string;
  ipAddress: string;
  device: string;
  browser: string;
  location: string;
  loginTime: Date;
  lastActive: Date;
  expiresAt: Date;
  status: "active" | "idle" | "expired";
}

export default function SessionManager() {
  const { allowed, isLoading } = useRequireRole(["ict_manager", "super_admin", "admin"]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

  // Mock data - in production this would come from tRPC
  const mockSessions: UserSession[] = [
    {
      id: "session-1",
      userId: "user-1",
      userName: "John Admin",
      email: "john.admin@example.com",
      ipAddress: "192.168.1.100",
      device: "Windows",
      browser: "Chrome",
      location: "Nairobi, Kenya",
      loginTime: new Date(Date.now() - 2 * 60 * 60000),
      lastActive: new Date(Date.now() - 5 * 60000),
      expiresAt: new Date(Date.now() + 22 * 60 * 60000),
      status: "active",
    },
    {
      id: "session-2",
      userId: "user-2",
      userName: "Jane Manager",
      email: "jane.manager@example.com",
      ipAddress: "192.168.1.101",
      device: "MacOS",
      browser: "Safari",
      location: "Nakuru, Kenya",
      loginTime: new Date(Date.now() - 4 * 60 * 60000),
      lastActive: new Date(Date.now() - 1 * 60 * 60000),
      expiresAt: new Date(Date.now() + 20 * 60 * 60000),
      status: "active",
    },
    {
      id: "session-3",
      userId: "user-3",
      userName: "Peter Accountant",
      email: "peter.accountant@example.com",
      ipAddress: "192.168.1.102",
      device: "Android",
      browser: "Mobile Chrome",
      location: "Mombasa, Kenya",
      loginTime: new Date(Date.now() - 6 * 60 * 60000),
      lastActive: new Date(Date.now() - 2 * 60 * 60000),
      expiresAt: new Date(Date.now() + 18 * 60 * 60000),
      status: "idle",
    },
    {
      id: "session-4",
      userId: "user-4",
      userName: "Alice User",
      email: "alice.user@example.com",
      ipAddress: "192.168.1.103",
      device: "Windows",
      browser: "Firefox",
      location: "Kisumu, Kenya",
      loginTime: new Date(Date.now() - 25 * 60 * 60000),
      lastActive: new Date(Date.now() - 24 * 60 * 60000),
      expiresAt: new Date(Date.now() - 1 * 60 * 60000),
      status: "expired",
    },
  ];

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return mockSessions.filter((session) => {
      const matchesSearch =
        searchTerm === "" ||
        session.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.ipAddress.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === "all" || session.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, filterStatus]);

  const activeSessions = mockSessions.filter((s) => s.status === "active").length;
  const idleSessions = mockSessions.filter((s) => s.status === "idle").length;
  const expiredSessions = mockSessions.filter((s) => s.status === "expired").length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "idle":
        return "bg-yellow-100 text-yellow-800";
      case "expired":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleTerminateSession = (sessionId: string) => {
    // In production, this would call a tRPC endpoint to terminate the session
    console.log("Terminating session:", sessionId);
  };

  const handleTerminateSelected = () => {
    // In production, this would call a tRPC endpoint to terminate multiple sessions
    console.log("Terminating sessions:", selectedSessions);
    setSelectedSessions([]);
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
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
      title="Active Sessions"
      description="Monitor and manage user login sessions"
      icon={<Monitor className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "ICT", href: "/dashboards/ict" },
        { label: "Sessions" },
      ]}
    >
      <div className="space-y-6">
        {/* Session Statistics */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            label="Active Sessions"
            value={activeSessions}
            description="Currently logged in users"
            icon={<Globe className="h-5 w-5 text-green-500" />}
            color="border-l-green-500"
          />
          <StatsCard
            label="Idle Sessions"
            value={idleSessions}
            description="Inactive for more than 1 hour"
            icon={<Clock className="h-5 w-5 text-yellow-500" />}
            color="border-l-yellow-500"
          />
          <StatsCard
            label="Total Sessions"
            value={mockSessions.length}
            description="All user sessions"
            icon={<Monitor className="h-5 w-5" />}
            color="border-l-blue-500"
          />
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex gap-2">
                <Search className="w-5 h-5 text-gray-400 absolute ml-2 mt-3" />
                <Input
                  placeholder="Search by name, email, or IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="idle">Idle</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>

              {selectedSessions.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleTerminateSelected}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Terminate ({selectedSessions.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>User Sessions</CardTitle>
            <CardDescription>
              Showing {filteredSessions.length} of {mockSessions.length} sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSessions(filteredSessions.map((s) => s.id));
                          } else {
                            setSelectedSessions([]);
                          }
                        }}
                      />
                    </th>
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Device</th>
                    <th className="text-left py-3 px-4">Location</th>
                    <th className="text-left py-3 px-4">Last Active</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.length > 0 ? (
                    filteredSessions.map((session) => (
                      <tr key={session.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedSessions.includes(session.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSessions([...selectedSessions, session.id]);
                              } else {
                                setSelectedSessions(
                                  selectedSessions.filter((id) => id !== session.id)
                                );
                              }
                            }}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{session.userName}</p>
                            <p className="text-xs text-gray-500">{session.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm">{session.browser}</p>
                            <p className="text-xs text-gray-500">{session.device}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm">{session.location}</p>
                            <p className="text-xs text-gray-500">{session.ipAddress}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm">{formatTimeAgo(session.lastActive)}</p>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            className={getStatusColor(session.status)}
                          >
                            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleTerminateSession(session.id)}
                                className="flex items-center gap-2 text-red-600"
                              >
                                <LogOut className="w-4 h-4" />
                                Terminate Session
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 px-4 text-center text-gray-500">
                        No sessions matching your criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
