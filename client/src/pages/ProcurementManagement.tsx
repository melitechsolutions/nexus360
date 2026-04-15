import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useCurrencySettings } from "@/lib/currency";
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
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Download,
  FileText,
  Loader2,
  MapPin,
  Package,
  Plus,
  Search,
  ShoppingCart,
  StickyNote,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// Workflow visualization component
function ProcurementWorkflow() {
  const steps = [
    {
      title: "Supplier Selection",
      description: "Choose qualified suppliers",
      icon: <ShoppingCart className="w-5 h-5" />,
      color: "bg-blue-100 text-blue-800",
    },
    {
      title: "Create LPO",
      description: "Generate purchase order",
      icon: <FileText className="w-5 h-5" />,
      color: "bg-purple-100 text-purple-800",
    },
    {
      title: "Track Delivery",
      description: "Monitor goods in transit",
      icon: <Truck className="w-5 h-5" />,
      color: "bg-orange-100 text-orange-800",
    },
    {
      title: "Receive Goods",
      description: "Create GRN & quality check",
      icon: <Package className="w-5 h-5" />,
      color: "bg-green-100 text-green-800",
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Procurement Workflow</CardTitle>
          <CardDescription>End-to-end procurement process from order to receipt</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 flex-wrap md:flex-nowrap">
            {steps.map((step, index) => (
              <div key={step.title} className="flex flex-col items-center gap-2 flex-1">
                <div className={`p-3 rounded-full ${step.color}`}>{step.icon}</div>
                <div className="text-center">
                  <p className="font-semibold text-sm">{step.title}</p>
                  <p className="text-xs text-gray-600">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute ml-[10rem] w-16 h-0.5 bg-gray-300" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Key metrics dashboard
function ProcurementMetrics() {
  const { data: lpos = [] } = trpc.lpo.list.useQuery();
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery({});
  const { data: deliveries = [] } = trpc.deliveryNotes.list.useQuery();
  const { data: grns = [] } = trpc.grn.list.useQuery();

  const metrics = [
    {
      title: "Active Suppliers",
      value: suppliers?.filter((s: any) => s.isActive)?.length || 0,
      icon: <ShoppingCart className="w-5 h-5" />,
      color: "bg-blue-50 text-blue-700",
    },
    {
      title: "Active LPOs",
      value: lpos?.filter((l: any) => !["cancelled", "closed"]?.includes(l.status))?.length || 0,
      icon: <FileText className="w-5 h-5" />,
      color: "bg-purple-50 text-purple-700",
    },
    {
      title: "Pending Deliveries",
      value: deliveries?.filter((d: any) => d.status === "in_transit")?.length || 0,
      icon: <Truck className="w-5 h-5" />,
      color: "bg-orange-50 text-orange-700",
    },
    {
      title: "Total GRNs",
      value: grns?.length || 0,
      icon: <Package className="w-5 h-5" />,
      color: "bg-green-50 text-green-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold mt-2">{metric.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${metric.color}`}>{metric.icon}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// LPO Management Table
function LPOTable() {
  const [, setLocation] = useLocation();
  const { code: currencyCode } = useCurrencySettings();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    vendorId: "",
    description: "",
    amount: 0,
    deliveryDate: "",
    deliveryLocation: "",
    notes: "",
  });

  const { data: lpos = [], refetch } = trpc.lpo.list.useQuery();
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery({ limit: 100 });
  const createMutation = trpc.lpo.create.useMutation({
    onSuccess: () => {
      toast.success("LPO created successfully");
      setIsCreateOpen(false);
      setFormData({ vendorId: "", description: "", amount: 0, deliveryDate: "", deliveryLocation: "", notes: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create LPO");
    },
  });

  const handleCreateLPO = () => {
    if (!formData.vendorId) {
      toast.error("Please select a vendor");
      return;
    }
    if (formData.amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    createMutation.mutate({
      vendorId: formData.vendorId,
      description: formData.description,
      amount: formData.amount * 100,
      deliveryDate: formData.deliveryDate || undefined,
      deliveryLocation: formData.deliveryLocation || undefined,
      notes: formData.notes || undefined,
    } as any);
  };

  // Build a vendor lookup map
  const vendorMap = useMemo(() => {
    const map: Record<string, string> = {};
    suppliers.forEach((s: any) => { map[s.id] = s.companyName || s.name || s.id; });
    return map;
  }, [suppliers]);

  const filteredLPOs = useMemo(() => {
    if (!searchTerm) return lpos;
    const term = searchTerm.toLowerCase();
    return lpos.filter((lpo: any) =>
      lpo.lpoNumber?.toLowerCase().includes(term) ||
      (vendorMap[lpo.vendorId] || lpo.vendorId)?.toLowerCase().includes(term) ||
      lpo.description?.toLowerCase().includes(term)
    );
  }, [lpos, searchTerm, vendorMap]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search LPOs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New LPO
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Local Purchase Order</DialogTitle>
              <DialogDescription>Create a new purchase order for procurement</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Vendor & Amount Section */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Vendor & Order Value
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Select Vendor *</Label>
                      <Select value={formData.vendorId} onValueChange={(v) => setFormData({ ...formData, vendorId: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.companyName || s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount ({currencyCode}) *</Label>
                      <div className="relative">
                        <Coins className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          value={formData.amount || ""}
                          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                          step="0.01"
                          className="pl-8"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Details Section */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="w-4 h-4 text-orange-600" />
                    Delivery Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Delivery Date</Label>
                      <Input
                        type="date"
                        value={formData.deliveryDate}
                        onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Delivery Location</Label>
                      <div className="relative">
                        <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={formData.deliveryLocation}
                          onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
                          placeholder="e.g., Warehouse A"
                          className="pl-8"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Description & Notes Section */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-purple-600" />
                    Description & Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Description / Items</Label>
                    <RichTextEditor
                      value={formData.description}
                      onChange={(html) => setFormData((prev) => ({ ...prev, description: html }))}
                      placeholder="List items or services to be procured"
                      minHeight="100px"
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Additional Notes</Label>
                    <RichTextEditor
                      value={formData.notes}
                      onChange={(html) => setFormData((prev) => ({ ...prev, notes: html }))}
                      placeholder="Additional notes or special instructions"
                      minHeight="80px"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateLPO} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create LPO
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>LPO Number</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredLPOs?.map((lpo: any) => (
            <TableRow key={lpo.id}>
              <TableCell className="font-medium">{lpo.lpoNumber}</TableCell>
              <TableCell>{vendorMap[lpo.vendorId] || lpo.vendorId}</TableCell>
              <TableCell className="text-right">
                {new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format((lpo.amount || 0) / 100)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    lpo.status === "approved"
                      ? "default"
                      : lpo.status === "draft"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {lpo.status}
                </Badge>
              </TableCell>
              <TableCell>{new Date(lpo.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => setLocation(`/lpos/${lpo.id}`)}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {(!filteredLPOs || filteredLPOs.length === 0) && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                No LPOs found. Create one to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Delivery Notes Table
function DeliveryNotesTable() {
  const [, setLocation] = useLocation();
  const { data: deliveries = [] } = trpc.deliveryNotes.list.useQuery();

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    in_transit: "bg-blue-100 text-blue-800",
    delivered: "bg-green-100 text-green-800",
    partially_delivered: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Delivery Tracking</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>DN Number</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Expected Delivery</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries?.map((dn: any) => (
            <TableRow key={dn.id}>
              <TableCell className="font-medium">{dn.dnNo}</TableCell>
              <TableCell>{dn.supplier}</TableCell>
              <TableCell>{new Date(dn.deliveryDate).toLocaleDateString()}</TableCell>
              <TableCell>
                <Badge className={statusColors[dn.status as keyof typeof statusColors] || ""}>
                  {dn.status?.replace(/_/g, " ")}
                </Badge>
              </TableCell>
              <TableCell>{dn.items}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => setLocation(`/delivery-notes/${dn.id}`)}>
                  Track
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {(!deliveries || deliveries.length === 0) && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                No deliveries found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// GRN Table
function GRNTable() {
  const [, setLocation] = useLocation();
  const { data: grns = [] } = trpc.grn.list.useQuery();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Goods Receipt Notes (GRN)</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>GRN Number</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Received Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Quality Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grns?.map((grn: any) => (
            <TableRow key={grn.id}>
              <TableCell className="font-medium">{grn.grnNo}</TableCell>
              <TableCell>{grn.supplier}</TableCell>
              <TableCell>{new Date(grn.receivedDate).toLocaleDateString()}</TableCell>
              <TableCell>
                <Badge variant="outline">{grn.status}</Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={grn.status === "accepted" ? "default" : "secondary"}
                >
                  {grn.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => setLocation(`/grn/${grn.id}`)}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {(!grns || grns.length === 0) && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                No GRNs found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function ProcurementManagement() {
  return (
    <ModuleLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Procurement Management", href: "/procurement/management" },
      ]}
      title="Procurement Management"
      description="Complete procurement workflow management from supplier selection to goods receipt"
      icon={<ShoppingCart className="w-6 h-6" />}
    >
      <div className="space-y-8">
        {/* Workflow Visualization */}
        <ProcurementWorkflow />

        {/* Key Metrics */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Procurement Metrics</h2>
          <ProcurementMetrics />
        </div>

        {/* Tabbed Management Views */}
        <Tabs defaultValue="lpos" className="w-full">
          <TabsList>
            <TabsTrigger value="lpos">Purchase Orders</TabsTrigger>
            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
            <TabsTrigger value="grns">Goods Receipt</TabsTrigger>
          </TabsList>

          <TabsContent value="lpos" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <LPOTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deliveries" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <DeliveryNotesTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grns" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <GRNTable />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Reference Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">Procurement Flow Reference</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="font-semibold min-w-fit">1. Suppliers:</span>
              <span>Choose qualified suppliers and manage their information</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold min-w-fit">2. Create LPO:</span>
              <span>Generate purchase orders for required items</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold min-w-fit">3. Track Delivery:</span>
              <span>Monitor delivery status and update receipt information</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold min-w-fit">4. Create GRN:</span>
              <span>
                Record goods receipt, perform quality checks, and update inventory
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
