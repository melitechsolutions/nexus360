import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Mail, RefreshCw, Search, RotateCcw, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatsCard } from "@/components/ui/stats-card";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  sent: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  queued: "bg-blue-100 text-blue-800",
};

const statusIcons: Record<string, any> = {
  pending: Clock,
  sent: CheckCircle,
  failed: XCircle,
  queued: AlertTriangle,
};

export default function EmailQueue() {
  const [search, setSearch] = useState("");

  const queueQuery = trpc.emailQueue.getQueue.useQuery(
    { limit: 50 },
    { retry: false, refetchInterval: 30000 }
  );
  const statsQuery = trpc.emailQueue.getStatus.useQuery(undefined, { retry: false });
  const processQueue = trpc.emailQueue.processQueue.useMutation({
    onSuccess: () => {
      toast.success("Queue processing started");
      queueQuery.refetch();
      statsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const retryEmail = trpc.emailQueue.retryEmail.useMutation({
    onSuccess: () => {
      toast.success("Email queued for retry");
      queueQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const stats = statsQuery.data;
  const emails = queueQuery.data?.items || queueQuery.data || [];
  const filteredEmails = Array.isArray(emails)
    ? emails.filter((e: any) =>
        !search || e.to?.toLowerCase().includes(search.toLowerCase()) || e.subject?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <ModuleLayout
      title="Email Queue"
      description="Monitor and manage outgoing email delivery"
      icon={<Mail className="h-6 w-6" />}
      breadcrumbs={[{label: "Dashboard", href: "/crm-home"}, {label: "Admin"}, {label: "Email Queue"}]}
      actions={
        <Button onClick={() => processQueue.mutate()} disabled={processQueue.isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${processQueue.isLoading ? "animate-spin" : ""}`} /> Process Queue
        </Button>
      }
    >
      <div className="space-y-6">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard label="Pending" value={stats.pending ?? stats.queued ?? 0} color="border-l-orange-500" />
            <StatsCard label="Sent" value={stats.sent ?? stats.delivered ?? 0} color="border-l-purple-500" />
            <StatsCard label="Failed" value={stats.failed ?? 0} color="border-l-green-500" />
            <StatsCard label="Total" value={stats.total ?? 0} color="border-l-blue-500" />
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by recipient or subject…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {/* Table */}
        {queueQuery.isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : filteredEmails.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">No emails in queue.</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmails.map((email: any) => {
                      const Icon = statusIcons[email.status] || Clock;
                      return (
                        <TableRow key={email.id}>
                          <TableCell>{email.to || email.recipient}</TableCell>
                          <TableCell>{email.subject}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[email.status] || "bg-gray-100 text-gray-800"}>
                              <Icon className="h-3 w-3 mr-1" /> {email.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{email.createdAt ? new Date(email.createdAt).toLocaleString() : "—"}</TableCell>
                          <TableCell className="text-right">
                            {email.status === "failed" && (
                              <Button variant="ghost" size="sm" onClick={() => retryEmail.mutate({ emailId: email.id })}>
                                <RotateCcw className="h-4 w-4 mr-1" /> Retry
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
