import { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useRequireFeature } from "@/lib/permissions";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Plus } from "lucide-react";

export default function CreateWorkOrder() {
  const [, setLocation] = useLocation();
  const { allowed, isLoading: permLoading } = useRequireFeature("operations:work-orders:create");
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    workOrderNumber: "",
    issueDate: new Date().toISOString().split("T")[0],
    description: "",
    assignedTo: "",
    priority: "medium",
    startDate: new Date().toISOString().split("T")[0],
    targetEndDate: new Date().toISOString().split("T")[0],
    laborCost: "0",
    serviceCost: "0",
    notes: "",
    status: "draft",
  });

  const createMutation = trpc.workOrders.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("Work order created successfully!");
      setLocation(`/work-orders/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(`Failed to create work order: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const laborCost = parseFloat(formData.laborCost) || 0;
      const serviceCost = parseFloat(formData.serviceCost) || 0;
      const total = laborCost + serviceCost;

      createMutation.mutate({
        workOrderNumber: formData.workOrderNumber,
        issueDate: new Date(formData.issueDate),
        description: formData.description,
        assignedTo: formData.assignedTo,
        priority: formData.priority as any,
        startDate: new Date(formData.startDate),
        targetEndDate: new Date(formData.targetEndDate),
        laborCost,
        serviceCost,
        total,
        notes: formData.notes,
        status: formData.status as any,
      });
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (permLoading) return <Spinner />;
  if (!allowed) return <div className="text-center py-10">Access Denied</div>;

  return (
    <ModuleLayout
      title="Create Work Order"
      description="Create a new work order"
      icon={<Plus className="w-5 h-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Work Orders", href: "/work-orders" }, { label: "Create" }]}
      backLink={{ label: "Work Orders", href: "/work-orders" }}
    >
      <Card>
        <CardHeader>
          <CardTitle>New Work Order</CardTitle>
          <CardDescription>Enter the details for the new work order</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="workOrderNumber">Work Order Number *</Label>
                <Input
                  id="workOrderNumber"
                  value={formData.workOrderNumber}
                  onChange={(e) => setFormData({ ...formData, workOrderNumber: e.target.value })}
                  required
                  placeholder="WO-2026-001"
                />
              </div>

              <div>
                <Label htmlFor="issueDate">Issue Date *</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="targetEndDate">Target End Date *</Label>
                <Input
                  id="targetEndDate"
                  type="date"
                  value={formData.targetEndDate}
                  onChange={(e) => setFormData({ ...formData, targetEndDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="assignedTo">Assigned To *</Label>
                <Input
                  id="assignedTo"
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  placeholder="Employee name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="laborCost">Labor Cost (KES)</Label>
                <Input
                  id="laborCost"
                  type="number"
                  step="0.01"
                  value={formData.laborCost}
                  onChange={(e) => setFormData({ ...formData, laborCost: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="serviceCost">Service Cost (KES)</Label>
                <Input
                  id="serviceCost"
                  type="number"
                  step="0.01"
                  value={formData.serviceCost}
                  onChange={(e) => setFormData({ ...formData, serviceCost: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the work to be done"
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes and comments"
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading || createMutation.isPending}>
                {isLoading || createMutation.isPending ? "Creating..." : "Create Work Order"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/work-orders")}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </ModuleLayout>
  );
}
