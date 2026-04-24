import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Edit,
  Loader2,
  ClipboardList,
  User,
  Calendar,
  DollarSign,
  Package,
} from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { useCurrency } from "@/lib/currency";

const priorityColors: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  open: "bg-blue-100 text-blue-700",
  "in-progress": "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

export default function WorkOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { format } = useCurrency();

  const { data: wo, isLoading } = trpc.workOrders.get.useQuery({ id: id || "" });

  if (isLoading) {
    return (
      <ModuleLayout
        title="Work Order"
        icon={<ClipboardList className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Work Orders", href: "/work-orders" },
          { label: "Loading..." },
        ]}
        backLink={{ label: "Work Orders", href: "/work-orders" }}
      >
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ModuleLayout>
    );
  }

  if (!wo) {
    return (
      <ModuleLayout
        title="Work Order Not Found"
        icon={<ClipboardList className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Work Orders", href: "/work-orders" },
          { label: "Not Found" },
        ]}
        backLink={{ label: "Work Orders", href: "/work-orders" }}
      >
        <div className="text-center py-16 text-muted-foreground">
          Work order not found or you don't have permission to view it.
        </div>
      </ModuleLayout>
    );
  }

  const materials: any[] = Array.isArray(wo.materials) ? wo.materials : [];

  return (
    <ModuleLayout
      title={wo.workOrderNumber}
      icon={<ClipboardList className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Work Orders", href: "/work-orders" },
        { label: wo.workOrderNumber },
      ]}
      backLink={{ label: "Work Orders", href: "/work-orders" }}
      actions={
        <Button
          onClick={() => navigate(`/work-orders/${id}/edit`)}
          className="flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          Edit
        </Button>
      }
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-xl">{wo.workOrderNumber}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge className={priorityColors[wo.priority] || "bg-gray-100 text-gray-700"}>
                  {wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)} Priority
                </Badge>
                <Badge className={statusColors[wo.status] || "bg-gray-100 text-gray-700"}>
                  {wo.status.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{wo.description}</p>
          </CardContent>
        </Card>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Assignment & Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assigned To</span>
                <span className="font-medium">{wo.assignedTo || "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issue Date</span>
                <span>{fmt(wo.issueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start Date</span>
                <span>{fmt(wo.startDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target End Date</span>
                <span>{fmt(wo.targetEndDate)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Materials Table */}
        {materials.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Materials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Description</th>
                      <th className="text-right py-2 px-4 font-medium text-muted-foreground">Qty</th>
                      <th className="text-right py-2 px-4 font-medium text-muted-foreground">Unit Cost</th>
                      <th className="text-right py-2 pl-4 font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m: any, i: number) => (
                      <tr key={m.id || i} className="border-b last:border-0">
                        <td className="py-2 pr-4">{m.description}</td>
                        <td className="text-right py-2 px-4">{m.quantity}</td>
                        <td className="text-right py-2 px-4">{format(m.unitCost)}</td>
                        <td className="text-right py-2 pl-4">{format(m.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cost Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Cost Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Labor Cost</span>
              <span>{format(wo.laborCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Cost</span>
              <span>{format(wo.serviceCost)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>{format(wo.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {wo.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{wo.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
