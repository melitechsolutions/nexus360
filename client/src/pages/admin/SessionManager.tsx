import { useState } from "react";
import { useRequireRole } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import {
  LogOut,
  Filter,
  Search,
  Globe,
  Clock,
  MoreVertical,
  Monitor,
  RefreshCw,
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
import { useToast } from "@/components/ui/use-toast";

export default function SessionManager() {
  const { allowed, isLoading: roleLoading } = useRequireRole(["ict_manager", "super_admin", "admin"]);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const sessionsQ = trpc.ictManagement.getActiveSessions.useQuery(undefined, {
    refetchInterval: 15000,
  });

  const terminateSession = trpc.ictManagement.terminateSession.useMutation({
    onSuccess: () => {
      toast({ title: "Session Terminated" });
      sessionsQ.refetch();
    },
    onError: (err) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const allSessions: any[] = sessionsQ.data ?? [];

  const filteredSessions = allSessions.filter((s: any) => {
    const matchesSearch = !searchTerm ||
      (s.userId || "").toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.userAgent || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.ipAddress || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.organizationName || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || true; // All returned sessions are active
    return matchesSearch && matchesStatus;
  });

  const formatTimeAgo = (date: string | Date | null) => {
    if (!date) return "—";
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getStatusColor = (s: any) => {
    if (!s.lastActivity) return "bg-gray-100 text-gray-800";
    const idleMinutes = (Date.now() - new Date(s.lastActivity).getTime()) / 60000;
    if (idleMinutes < 15) return "bg-green-100 text-green-800";
    if (idleMinutes < 60) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (s: any) => {
    if (!s.lastActivity) return "Unknown";
    const idleMinutes = (Date.now() - new Date(s.lastActivity).getTime()) / 60000;
    if (idleMinutes < 15) return "Active";
    if (idleMinutes < 60) return "Idle";
    return "Inactive";
  };

  if (roleLoading) {
    return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  }
  if (!allowed) return null;

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
        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard label="Total Sessions" value={allSessions.length} description="Active sessions" icon={<Globe className="h-5 w-5 text-green-500" />} color="border-l-green-500" />
          <StatsCard label="Recent Active" value={allSessions.filter((s: any) => s.lastActivity && (Date.now() - new Date(s.lastActivity).getTime()) < 900000).length} description="Active in last 15 min" icon={<Clock className="h-5 w-5 text-yellow-500" />} color="border-l-yellow-500" />
          <StatsCard label="Filtered" value={filteredSessions.length} description="Matching your filters" icon={<Monitor className="h-5 w-5" />} color="border-l-blue-500" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Filter className="w-5 h-5" /> Filters & Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                <Input placeholder="Search by user, IP, organization..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Button variant="outline" className="gap-2" onClick={() => sessionsQ.refetch()}>
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Sessions</CardTitle>
            <CardDescription>Showing {filteredSessions.length} of {allSessions.length} sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {sessionsQ.isLoading ? (
              <div className="flex justify-center py-8"><Spinner className="size-6" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">User / Organization</th>
                      <th className="text-left py-3 px-4">Device</th>
                      <th className="text-left py-3 px-4">IP Address</th>
                      <th className="text-left py-3 px-4">Last Active</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-right py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.length > 0 ? (
                      filteredSessions.map((session: any) => (
                        <tr key={session.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <p className="font-medium">User #{session.userId}</p>
                            {session.organizationName && <p className="text-xs text-muted-foreground">{session.organizationName}</p>}
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm truncate max-w-[200px]" title={session.userAgent}>{session.userAgent || "—"}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm">{session.ipAddress || "—"}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm">{formatTimeAgo(session.lastActivity)}</p>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className={getStatusColor(session)}>{getStatusLabel(session)}</Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm"><MoreVertical className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => terminateSession.mutate({ sessionId: session.id })}
                                  className="flex items-center gap-2 text-red-600"
                                >
                                  <LogOut className="w-4 h-4" /> Terminate Session
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={6} className="py-8 px-4 text-center text-muted-foreground">No sessions found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
