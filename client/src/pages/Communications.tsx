import { useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  MessageSquare,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Filter,
  Calendar,
  Eye,
  RefreshCw,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";

type CommunicationType = "email" | "sms" | "call" | "meeting" | "all";
type CommunicationStatus = "pending" | "sent" | "failed" | "all";

interface TreeNode {
  id: string;
  label: string;
  icon: ReactNode;
  count?: number;
  type: "category" | "subcategory";
  children?: TreeNode[];
  onClick: () => void;
}

interface CommunicationLog {
  id: string;
  type: "email" | "sms";
  recipient: string;
  subject?: string;
  body?: string;
  status: "pending" | "sent" | "failed";
  error?: string;
  referenceType?: string;
  referenceId?: string;
  sentAt?: string;
  createdBy?: string;
  createdAt?: string;
}

export default function Communications() {
  const [, navigate] = useLocation();
  const { allowed, isLoading: permissionLoading } = useRequireFeature("communications:view");
  const [selectedType, setSelectedType] = useState<CommunicationType>("all");
  const [selectedStatus, setSelectedStatus] = useState<CommunicationStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["types", "status"]));
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");

  // Fetch communications - CALLED BEFORE CONDITIONAL RETURNS
  const { data: communicationData } = trpc.communications?.list?.useQuery?.(
    { limit: 1000, offset: 0 },
    { enabled: true }
  ) || { data: { communications: [] } };

  if (permissionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  const communicationsArray = communicationData?.communications || [];

  // Use plainCommunications directly without memoization to avoid hooks issues
  const plainCommunications = Array.isArray(communicationsArray)
    ? communicationsArray.map((comm: any) => JSON.parse(JSON.stringify(comm)))
    : [];

  // Calculate statistics directly
  const total = plainCommunications.length;
  const sent = plainCommunications.filter((c: CommunicationLog) => c.status === "sent").length;
  const pending = plainCommunications.filter((c: CommunicationLog) => c.status === "pending").length;
  const failed = plainCommunications.filter((c: CommunicationLog) => c.status === "failed").length;
  const emails = plainCommunications.filter((c: CommunicationLog) => c.type === "email").length;
  const sms = plainCommunications.filter((c: CommunicationLog) => c.type === "sms").length;
  
  const stats = { total, sent, pending, failed, emails, sms };

  // Filter communications based on selected filters
  let filtered = [...plainCommunications];

  // Filter by type
  if (selectedType !== "all") {
    filtered = filtered.filter((c: CommunicationLog) => c.type === selectedType);
  }

  // Filter by status
  if (selectedStatus !== "all") {
    filtered = filtered.filter((c: CommunicationLog) => c.status === selectedStatus);
  }

  // Filter by search query
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (c: CommunicationLog) =>
        c.recipient?.toLowerCase().includes(query) ||
        c.subject?.toLowerCase().includes(query) ||
        c.body?.toLowerCase().includes(query)
    );
  }

  // Filter by date
  const now = new Date();
  if (dateFilter !== "all") {
    const startDate = new Date();
    if (dateFilter === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (dateFilter === "week") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (dateFilter === "month") {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    filtered = filtered.filter((c: CommunicationLog) => {
      if (c.createdAt) {
        const date = new Date(c.createdAt);
        return date >= startDate && date <= now;
      }
      return false;
    });
  }

  const filteredCommunications = filtered.sort(
    (a: CommunicationLog, b: CommunicationLog) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  // Toggle node expansion
  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Navigation tree structure
  const navigationTree: TreeNode[] = [
    {
      id: "types",
      label: "Communication Types",
      icon: <MessageSquare size={16} />,
      type: "category",
      onClick: () => {},
      children: [
        {
          id: "email",
          label: `Emails`,
          icon: <Mail size={14} />,
          count: stats.emails,
          type: "subcategory",
          onClick: () => setSelectedType("email"),
        },
        {
          id: "sms",
          label: `SMS`,
          icon: <Phone size={14} />,
          count: stats.sms,
          type: "subcategory",
          onClick: () => setSelectedType("sms"),
        },
        {
          id: "all-types",
          label: "All Communications",
          icon: <MessageSquare size={14} />,
          count: stats.total,
          type: "subcategory",
          onClick: () => setSelectedType("all"),
        },
      ],
    },
    {
      id: "status",
      label: "Communication Status",
      icon: <Filter size={16} />,
      type: "category",
      onClick: () => {},
      children: [
        {
          id: "sent",
          label: `Sent`,
          icon: <CheckCircle size={14} />,
          count: stats.sent,
          type: "subcategory",
          onClick: () => setSelectedStatus("sent"),
        },
        {
          id: "pending",
          label: `Pending`,
          icon: <Clock size={14} />,
          count: stats.pending,
          type: "subcategory",
          onClick: () => setSelectedStatus("pending"),
        },
        {
          id: "failed",
          label: `Failed`,
          icon: <AlertCircle size={14} />,
          count: stats.failed,
          type: "subcategory",
          onClick: () => setSelectedStatus("failed"),
        },
        {
          id: "all-status",
          label: "All Statuses",
          icon: <Filter size={14} />,
          count: stats.total,
          type: "subcategory",
          onClick: () => setSelectedStatus("all"),
        },
      ],
    },
    {
      id: "date",
      label: "Time Period",
      icon: <Calendar size={16} />,
      type: "category",
      onClick: () => {},
      children: [
        {
          id: "today",
          label: "Today",
          icon: <Calendar size={14} />,
          type: "subcategory",
          onClick: () => setDateFilter("today"),
        },
        {
          id: "week",
          label: "Last 7 Days",
          icon: <Calendar size={14} />,
          type: "subcategory",
          onClick: () => setDateFilter("week"),
        },
        {
          id: "month",
          label: "Last 30 Days",
          icon: <Calendar size={14} />,
          type: "subcategory",
          onClick: () => setDateFilter("month"),
        },
        {
          id: "all-dates",
          label: "All Time",
          icon: <Calendar size={14} />,
          type: "subcategory",
          onClick: () => setDateFilter("all"),
        },
      ],
    },
  ];

  // Render tree node
  const renderTreeNode = (node: TreeNode, depth: number = 0): ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
            depth === 0
              ? "hover:bg-accent font-medium text-sm"
              : selectedType === node.id ||
                selectedStatus === node.id ||
                dateFilter === node.id
              ? "bg-accent text-accent-foreground"
              : "hover:bg-muted text-sm"
          }`}
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.id);
            }
            node.onClick();
          }}
        >
          {hasChildren && (
            <span className="flex items-center justify-center w-4">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
          {!hasChildren && <span className="w-4" />}
          <span className="flex-shrink-0">{node.icon}</span>
          <span className="flex-1">{node.label}</span>
          {node.count !== undefined && (
            <Badge variant="outline" className="ml-auto">
              {node.count}
            </Badge>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-2 border-l border-border pl-2">
            {node.children?.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Status color and icon
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge className="bg-green-100 text-green-800" variant="outline">
            <CheckCircle size={12} className="mr-1" /> Sent
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800" variant="outline">
            <Clock size={12} className="mr-1" /> Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800" variant="outline">
            <AlertCircle size={12} className="mr-1" /> Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail size={14} />;
      case "sms":
        return <Phone size={14} />;
      default:
        return <MessageSquare size={14} />;
    }
  };

  return (
    <ModuleLayout
      title="Communications"
      description="Track and manage all communications with clients and team"
      icon={<MessageSquare className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Communications" },
      ]}
    >
      <div className="space-y-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  {selectedType === "all" ? (
                    <MessageSquare size={16} />
                  ) : selectedType === "email" ? (
                    <Mail size={16} />
                  ) : (
                    <Phone size={16} />
                  )}
                  {selectedType === "all"
                    ? "All Communications"
                    : selectedType === "email"
                    ? "Emails"
                    : "SMS"}
                  <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Filter size={14} />
                  Communication Types
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setSelectedType("email")}
                  className="cursor-pointer gap-2"
                >
                  <Mail size={14} />
                  <div className="flex-1">
                    <div>Emails</div>
                    <div className="text-xs text-muted-foreground">{stats.emails} total</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedType("sms")}
                  className="cursor-pointer gap-2"
                >
                  <Phone size={14} />
                  <div className="flex-1">
                    <div>SMS</div>
                    <div className="text-xs text-muted-foreground">{stats.sms} total</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setSelectedType("all")}
                  className="cursor-pointer gap-2"
                >
                  <MessageSquare size={14} />
                  <div className="flex-1">
                    <div>All Communications</div>
                    <div className="text-xs text-muted-foreground">{stats.total} total</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  {selectedStatus === "all" ? (
                    <Filter size={16} />
                  ) : selectedStatus === "sent" ? (
                    <CheckCircle size={16} className="text-green-600" />
                  ) : selectedStatus === "pending" ? (
                    <Clock size={16} className="text-yellow-600" />
                  ) : (
                    <AlertCircle size={16} className="text-red-600" />
                  )}
                  {selectedStatus === "all"
                    ? "All Statuses"
                    : selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}
                  <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Filter size={14} />
                  Status
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setSelectedStatus("sent")}
                  className="cursor-pointer gap-2"
                >
                  <CheckCircle size={14} className="text-green-600" />
                  <div className="flex-1">
                    <div>Sent</div>
                    <div className="text-xs text-muted-foreground">{stats.sent} total</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedStatus("pending")}
                  className="cursor-pointer gap-2"
                >
                  <Clock size={14} className="text-yellow-600" />
                  <div className="flex-1">
                    <div>Pending</div>
                    <div className="text-xs text-muted-foreground">{stats.pending} total</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedStatus("failed")}
                  className="cursor-pointer gap-2"
                >
                  <AlertCircle size={14} className="text-red-600" />
                  <div className="flex-1">
                    <div>Failed</div>
                    <div className="text-xs text-muted-foreground">{stats.failed} total</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setSelectedStatus("all")}
                  className="cursor-pointer gap-2"
                >
                  <Filter size={14} />
                  <div>All Statuses</div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Calendar size={16} />
                  {dateFilter === "all"
                    ? "All Time"
                    : dateFilter === "today"
                    ? "Today"
                    : dateFilter === "week"
                    ? "Last 7 Days"
                    : "Last 30 Days"}
                  <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Calendar size={14} />
                  Time Period
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDateFilter("today")}
                  className="cursor-pointer"
                >
                  Today
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDateFilter("week")}
                  className="cursor-pointer"
                >
                  Last 7 Days
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDateFilter("month")}
                  className="cursor-pointer"
                >
                  Last 30 Days
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDateFilter("all")}
                  className="cursor-pointer"
                >
                  All Time
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => navigate("/communications/new")}>
              <Plus size={16} className="mr-2" /> New Communication
            </Button>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 py-4 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatsCard label="Total Communications" value={stats.total} description="All communications" color="border-l-blue-500" />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle size={16} className="text-green-600" /> Sent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {((stats.sent / stats.total) * 100).toFixed(0)}% success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock size={16} className="text-yellow-600" /> Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">Waiting to be sent</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600" /> Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Mail size={16} className="text-blue-600" /> Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.emails + stats.sms}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.emails} emails, {stats.sms} SMS
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Tree Sidebar */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter size={18} /> Filters
              </CardTitle>
              <CardDescription>Navigate and filter communications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {navigationTree.map((node) => renderTreeNode(node))}
              </div>

              {/* Clear Filters Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={() => {
                  setSelectedType("all");
                  setSelectedStatus("all");
                  setDateFilter("all");
                  setSearchQuery("");
                }}
              >
                Clear All Filters
              </Button>
            </CardContent>
          </Card>

          {/* Communications List */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Communications List
                    {filteredCommunications.length < communicationsArray.length && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ({filteredCommunications.length} of {communicationsArray.length})
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {filteredCommunications.length} communication{filteredCommunications.length !== 1 ? "s" : ""}
                  </CardDescription>
                </div>
              </div>

              {/* Search Input */}
              <div className="flex items-center gap-2 mt-4">
                <Search size={16} className="text-muted-foreground" />
                <Input
                  placeholder="Search by recipient, subject, or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardHeader>

            <CardContent>
              {filteredCommunications.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare size={32} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No communications found</p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your filters or search criteria
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Type</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-32">Date</TableHead>
                      <TableHead className="w-20 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCommunications.map((comm: CommunicationLog) => (
                      <TableRow key={comm.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(comm.type)}
                            {comm.type.toUpperCase()}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{comm.recipient}</TableCell>
                        <TableCell className="max-w-xs truncate">{comm.subject || "-"}</TableCell>
                        <TableCell>{getStatusBadge(comm.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {comm.createdAt
                            ? new Date(comm.createdAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(`/communications/${comm.id}`)
                              }
                              title="View details"
                            >
                              <Eye size={14} />
                            </Button>
                            {comm.status === "failed" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  toast.promise(
                                    Promise.resolve(),
                                    {
                                      loading: "Retrying...",
                                      success: "Communication queued for resend",
                                      error: "Failed to retry",
                                    }
                                  );
                                }}
                                title="Retry sending"
                              >
                                <RefreshCw size={14} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
