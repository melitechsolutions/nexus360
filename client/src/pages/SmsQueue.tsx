import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { MessageSquare, RefreshCw, Search, RotateCcw, Clock, CheckCircle, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  sent: "bg-green-100 text-green-800",
  delivered: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  queued: "bg-blue-100 text-blue-800",
};

export default function SmsQueue() {
  const [search, setSearch] = useState("");

  const statsQuery = trpc.smsQueue.getQueueStats.useQuery(undefined, { retry: false });
  const retrySms = trpc.smsQueue.retrySms.useMutation({
    onSuccess: () => {
      toast.success("SMS queued for retry");
      statsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const stats = statsQuery.data;

  return (
    <ModuleLayout
      title="SMS Queue"
      description="Monitor and manage outgoing SMS delivery"
      icon={<MessageSquare className="h-6 w-6" />}
      breadcrumbs={[{label: "Dashboard", href: "/crm-home"}, {label: "Admin"}, {label: "SMS Queue"}]}
      actions={
        <Button variant="outline" onClick={() => statsQuery.refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      }
    >
      <div className="space-y-6">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard label="Pending" value={stats.pending ?? 0} color="border-l-orange-500" />
            <StatsCard label="Sent" value={stats.sent ?? stats.delivered ?? 0} color="border-l-purple-500" />
            <StatsCard label="Failed" value={stats.failed ?? 0} color="border-l-green-500" />
            <StatsCard label="Total" value={stats.total ?? 0} color="border-l-blue-500" />
          </div>
        )}

        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">SMS Queue Management</h3>
            <p>View delivery status and manage outgoing SMS messages from the statistics above. Failed messages can be retried from the delivery history.</p>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
