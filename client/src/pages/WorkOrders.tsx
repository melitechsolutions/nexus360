import { ModuleLayout } from "@/components/ModuleLayout";
import { useState } from "react";
import { useLocation } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Eye, Edit, Trash2, Download, Clock, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useUserLookup } from "@/hooks/useUserLookup";

interface WorkOrder {
  id: string;
  workOrderNumber: string;
  issueDate: Date;
  description: string;
  assignedTo: string;
  startDate: Date;
  targetEndDate: Date;
  priority: "low" | "medium" | "high" | "critical";
  status: "draft" | "open" | "in-progress" | "completed" | "cancelled";
  total: number;
  createdAt: Date;
}

export default function WorkOrders() {
  const { allowed, isLoading: permLoading } = useRequireFeature("operations:work-orders:view");
  const [, setLocation] = useLocation();
  const { getUserName } = useUserLookup();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const listQuery = trpc.workOrders.list.useQuery(undefined, {
    onSuccess: (data) => {
      setWorkOrders(data || []);
      setIsLoading(false);
    },
    onError: (error) => {
      toast.error(`Failed to load work orders: ${error.message}`);
      setIsLoading(false);
    },
  });

  const deleteMutation = trpc.workOrders.delete.useMutation({
    onSuccess: () => {
      toast.success("Work order deleted successfully");
      listQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this work order?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "open": return "bg-blue-100 text-blue-800";
      case "in-progress": return "bg-purple-100 text-purple-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (permLoading) return <Spinner />;
  if (!allowed) return <div className="text-center py-10">Access Denied</div>;

  return (
    <ModuleLayout
      title="Work Orders"
      description="Track service and maintenance work orders"
      icon={<Wrench className="h-6 w-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Operations", href: "/operations" },
        { label: "Work Orders" },
      ]}
      actions={
        <Button onClick={() => setLocation("/work-orders/create")}>
          <Plus className="w-4 h-4 mr-2" />
          New Work Order
        </Button>
      }
    >

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : workOrders.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            No work orders created yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {workOrders.map((wo) => (
            <Card key={wo.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{wo.workOrderNumber}</CardTitle>
                    <p className="text-sm text-gray-600">{wo.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(wo.priority)}`}>
                      {wo.priority}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(wo.status)}`}>
                      {wo.status}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600">Assigned To</p>
                    <p className="font-semibold">{getUserName(wo.assignedTo)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Start Date</p>
                    <p className="font-semibold">{new Date(wo.startDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Target End</p>
                    <p className="font-semibold">{new Date(wo.targetEndDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Cost Estimate</p>
                    <p className="font-bold">KES {wo.total.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setLocation(`/work-orders/${wo.id}`)}>
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setLocation(`/work-orders/${wo.id}/edit`)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { window.open(`/api/work-orders/${wo.id}/pdf`, "_blank"); }}>
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(wo.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ModuleLayout>
  );
}
