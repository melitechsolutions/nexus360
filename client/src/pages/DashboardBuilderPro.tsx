import { useState } from "react";
import { LayoutDashboard, Loader2 } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function DashboardBuilderPro() {
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");

  const dashboardsQuery = trpc.dashboardBuilder.listDashboards.useQuery();
  const createMutation = trpc.dashboardBuilder.createDashboard.useMutation({
    onSuccess: () => {
      toast.success("Dashboard created");
      setNewName("");
      setShowNew(false);
      dashboardsQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to create dashboard"),
  });

  const handleCreate = () => {
    if (newName.trim()) {
      createMutation.mutate({ name: newName } as any);
    }
  };

  const dashboards = (dashboardsQuery.data as any[]) ?? [];

  return (
    <ModuleLayout
      title="Dashboard Builder"
      icon={<LayoutDashboard className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Tools" },
        { label: "Dashboard Builder" },
      ]}
    >
      <div className="flex justify-between items-center">
        <Button onClick={() => setShowNew(true)}>+ Create Dashboard</Button>
      </div>

      {showNew && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Dashboard name..."
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create
              </Button>
              <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {dashboardsQuery.isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {dashboardsQuery.error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Error: {dashboardsQuery.error.message}</div>
      )}

      {!dashboardsQuery.isLoading && !dashboardsQuery.error && dashboards.length === 0 && (
        <p className="text-center text-gray-500 py-8">No data found.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {dashboards.map((d: any) => (
          <Card key={d.id ?? d.name}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-base">{d.name ?? "—"}</CardTitle>
                {d.shared && <Badge className="bg-green-100 text-green-800 border-0">Shared</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Widgets:</span>
                  <span className="font-medium">{d.widgets ?? d.widgetCount ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Views:</span>
                  <span className="font-medium">{d.views ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Modified:</span>
                  <span className="font-medium text-xs">{d.lastModified ?? d.updatedAt ?? "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ModuleLayout>
  );
}
