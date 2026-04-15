import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Truck,
  Plus,
  Loader2,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useUserLookup } from "@/hooks/useUserLookup";

// Delivery status timeline
function DeliveryTimeline({ delivery }: { delivery: any }) {
  const timeline = [
    {
      status: "draft",
      label: "Created",
      icon: <Package className="w-4 h-4" />,
      color: "bg-gray-200",
    },
    {
      status: "in_transit",
      label: "In Transit",
      icon: <Truck className="w-4 h-4" />,
      color: "bg-blue-200",
    },
    {
      status: "delivered",
      label: "Delivered",
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: "bg-green-200",
    },
  ];

  return (
    <div className="space-y-4">
      <h4 className="font-semibold">Delivery Progress</h4>
      <div className="flex items-center gap-2">
        {timeline.map((step, index) => (
          <div key={step.status} className="flex items-center gap-2">
            <div
              className={`p-2 rounded-full ${
                delivery.status === step.status || delivery.status > step.status
                  ? step.color
                  : "bg-gray-100"
              }`}
            >
              {step.icon}
            </div>
            {index < timeline.length - 1 && (
              <div
                className={`w-8 h-1 ${
                  delivery.status === step.status || delivery.status > step.status
                    ? "bg-blue-400"
                    : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-600 mt-2">
        Current Status: <span className="font-semibold">{delivery.status?.replace(/_/g, " ")}</span>
      </p>
    </div>
  );
}

// Key metrics for deliveries
function DeliveryMetrics() {
  const { data: deliveries = [] } = trpc.deliveryNotes.list.useQuery();

  const metrics = [
    {
      title: "On-Time Deliveries",
      value: deliveries?.filter((d: any) => d.status === "delivered")?.length || 0,
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: "text-green-600",
    },
    {
      title: "In Transit",
      value: deliveries?.filter((d: any) => d.status === "in_transit")?.length || 0,
      icon: <Truck className="w-5 h-5" />,
      color: "text-blue-600",
    },
    {
      title: "Delayed/Issues",
      value: deliveries?.filter((d: any) => d.status === "failed")?.length || 0,
      icon: <AlertCircle className="w-5 h-5" />,
      color: "text-red-600",
    },
    {
      title: "Total Deliveries",
      value: deliveries?.length || 0,
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold mt-1">{metric.value}</p>
              </div>
              <span className={metric.color}>{metric.icon}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Delivery creation form
function CreateDeliveryDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    dnNo: "",
    supplier: "",
    orderId: "",
    deliveryDate: "",
    items: 0,
    notes: "",
  });

  const { refetch } = trpc.deliveryNotes.list.useQuery();
  const createMutation = trpc.deliveryNotes.create.useMutation({
    onSuccess: () => {
      toast.success("Delivery note created successfully");
      setIsOpen(false);
      setFormData({
        dnNo: "",
        supplier: "",
        orderId: "",
        deliveryDate: "",
        items: 0,
        notes: "",
      });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create delivery note");
    },
  });

  const handleCreate = () => {
    if (!formData.dnNo || !formData.supplier) {
      toast.error("DN Number and Supplier are required");
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Delivery
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Delivery Note</DialogTitle>
          <DialogDescription>
            Record incoming delivery from supplier
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Delivery Note Number</Label>
            <Input
              value={formData.dnNo}
              onChange={(e) => setFormData({ ...formData, dnNo: e.target.value })}
              placeholder="DN-001"
            />
          </div>
          <div>
            <Label>Supplier</Label>
            <Input
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              placeholder="Supplier name or ID"
            />
          </div>
          <div>
            <Label>Expected Delivery Date</Label>
            <Input
              type="date"
              value={formData.deliveryDate}
              onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
            />
          </div>
          <div>
            <Label>Number of Items</Label>
            <Input
              type="number"
              value={formData.items}
              onChange={(e) => setFormData({ ...formData, items: parseInt(e.target.value) })}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Delivery Note
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main delivery tracking page
export default function DeliveryTracking() {
  const { getUserName } = useUserLookup();
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const { data: deliveries = [] } = trpc.deliveryNotes.list.useQuery();

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    in_transit: "bg-blue-100 text-blue-800",
    delivered: "bg-green-100 text-green-800",
    partially_delivered: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  const groupedByStatus = {
    in_transit: deliveries?.filter((d: any) => d.status === "in_transit") || [],
    delivered: deliveries?.filter((d: any) => d.status === "delivered") || [],
    draft: deliveries?.filter((d: any) => d.status === "draft") || [],
    issues: deliveries?.filter((d: any) => ["failed", "partially_delivered"]?.includes(d.status)) || [],
  };

  return (
    <ModuleLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Procurement", href: "/procurement" },
        { label: "Delivery Tracking", href: "/procurement/deliveries" },
      ]}
      title="Delivery Tracking"
      description="Real-time monitoring of supplier deliveries and logistics"
      icon={<Truck className="w-6 h-6" />}
    >
      <div className="space-y-8">
        {/* Metrics Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Delivery Metrics</h2>
          <DeliveryMetrics />
        </div>

        {/* Create New Delivery */}
        <div className="flex justify-end">
          <CreateDeliveryDialog />
        </div>

        {/* Tabbed View by Status */}
        <Tabs defaultValue="in_transit" className="w-full">
          <TabsList>
            <TabsTrigger value="in_transit">
              In Transit ({groupedByStatus.in_transit.length})
            </TabsTrigger>
            <TabsTrigger value="delivered">
              Delivered ({groupedByStatus.delivered.length})
            </TabsTrigger>
            <TabsTrigger value="draft">
              Draft ({groupedByStatus.draft.length})
            </TabsTrigger>
            <TabsTrigger value="issues">
              Issues ({groupedByStatus.issues.length})
            </TabsTrigger>
          </TabsList>

          {Object.entries(groupedByStatus).map(([status, deliveriesInStatus]) => (
            <TabsContent key={status} value={status} className="space-y-4">
              <div className="grid gap-4">
                {(deliveriesInStatus as any[])?.map((delivery) => (
                  <Card key={delivery.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{delivery.dnNo}</h3>
                            <Badge
                              className={
                                statusColors[delivery.status as keyof typeof statusColors]
                              }
                            >
                              {delivery.status?.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            Supplier: <span className="font-medium">{delivery.supplier}</span>
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {delivery.items} items •{" "}
                            {new Date(delivery.deliveryDate).toLocaleDateString()}
                          </p>
                          {delivery.notes && (
                            <p className="text-sm text-gray-600 mt-2 italic">
                              Note: {delivery.notes}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedDelivery(delivery)}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(!deliveriesInStatus || deliveriesInStatus.length === 0) && (
                  <Card>
                    <CardContent className="p-6 text-center text-gray-500">
                      No deliveries in this status
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Detailed View Dialog */}
        {selectedDelivery && (
          <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Delivery Details: {selectedDelivery.dnNo}</DialogTitle>
                <DialogDescription>
                  Complete delivery information and tracking
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Timeline */}
                <DeliveryTimeline delivery={selectedDelivery} />

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Supplier</p>
                    <p className="font-semibold">{selectedDelivery.supplier}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status</p>
                    <p className="font-semibold">{selectedDelivery.status?.replace(/_/g, " ")}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Expected Delivery</p>
                    <p className="font-semibold">
                      {new Date(selectedDelivery.deliveryDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Number of Items</p>
                    <p className="font-semibold">{selectedDelivery.items}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Created</p>
                    <p className="font-semibold">
                      {new Date(selectedDelivery.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Created By</p>
                    <p className="font-semibold">{getUserName(selectedDelivery.createdBy)}</p>
                  </div>
                </div>

                {/* Notes */}
                {selectedDelivery.notes && (
                  <div>
                    <p className="text-gray-600 mb-2">Notes</p>
                    <p className="bg-gray-50 p-3 rounded text-sm">{selectedDelivery.notes}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Quick Reference */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">Delivery Tracking Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex gap-2">
              <Badge>Draft</Badge>
              <span>Delivery note created but not yet sent to logistics</span>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-blue-100 text-blue-800">In Transit</Badge>
              <span>Goods are on the way to warehouse</span>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-green-100 text-green-800">Delivered</Badge>
              <span>Goods received at warehouse</span>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-yellow-100 text-yellow-800">Partially Delivered</Badge>
              <span>Some items received, others pending</span>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-red-100 text-red-800">Failed</Badge>
              <span>Delivery failed or returned</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
