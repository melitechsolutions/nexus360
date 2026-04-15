import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Download, Upload, Trash2, Loader2, Package, Search, Eye, Edit, Copy, DollarSign, Clock, CheckCircle2, XCircle, RefreshCw, Building2, Coins, Truck, MapPin, StickyNote, CalendarDays } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useCurrencySettings } from "@/lib/currency";
import { ListPageToolbar } from "@/components/list-page/ListPageToolbar";
import { RowActionsMenu, actionIcons } from "@/components/list-page/RowActionsMenu";
import { TableColumnSettings, useColumnVisibility, type ColumnConfig } from "@/components/list-page/TableColumnSettings";
import { EnhancedBulkActions, bulkExportAction, bulkCopyIdsAction, bulkDeleteAction, bulkEmailAction } from "@/components/list-page/EnhancedBulkActions";
import { Checkbox } from "@/components/ui/checkbox";
import { StatsCard } from "@/components/ui/stats-card";

export default function OrdersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { code: currencyCode } = useCurrencySettings();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  const orderColumns: ColumnConfig[] = [
    { key: "orderNumber", label: "Order Number" },
    { key: "supplier", label: "Supplier" },
    { key: "amount", label: "Amount" },
    { key: "deliveryDate", label: "Delivery Date" },
    { key: "deliveryAddress", label: "Delivery Address" },
    { key: "poDate", label: "PO Date" },
    { key: "status", label: "Status" },
  ];
  const { visibleColumns, toggleColumn, isVisible, pageSize, updatePageSize, reset } = useColumnVisibility(orderColumns, "orders");
  const [, navigate] = useLocation();
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [formData, setFormData] = useState({
    orderNumber: "",
    supplierId: "",
    supplierName: "",
    description: "",
    totalAmount: 0,
    status: "draft",
    deliveryDate: "",
    deliveryAddress: "",
    poDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Queries
  const { data: orders = [], isLoading, refetch } = trpc.procurementMgmt.orderList.useQuery();
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery({ limit: 100 });

  // Mutations
  const createMutation = trpc.procurementMgmt.orderCreate.useMutation({
    onSuccess: () => {
      toast.success("Order created successfully");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create order");
    },
  });

  const updateMutation = trpc.procurementMgmt.orderUpdate.useMutation({
    onSuccess: () => {
      toast.success("Order updated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update order");
    },
  });

  const deleteMutation = trpc.procurementMgmt.orderDelete.useMutation({
    onSuccess: () => {
      toast.success("Order deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete order");
    },
  });

  const resetForm = () => {
    setFormData({
      orderNumber: "",
      supplierId: "",
      supplierName: "",
      description: "",
      totalAmount: 0,
      status: "draft",
      deliveryDate: "",
      deliveryAddress: "",
      poDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "totalAmount" ? Number(value) : value,
    }));
  };

  const handleSupplierSelect = (supplierId: string) => {
    const selectedSupplier = suppliers.find((s: any) => s.id === supplierId);
    setFormData((prev) => ({
      ...prev,
      supplierId,
      supplierName: selectedSupplier?.companyName || "",
    }));
  };

  const handleCreateOrder = () => {
    if (!formData.orderNumber.trim() || !formData.supplierId || formData.totalAmount <= 0) {
      toast.error("Order Number, Supplier, and Amount are required");
      return;
    }

    createMutation.mutate({
      orderNumber: formData.orderNumber,
      supplierId: formData.supplierId,
      supplierName: formData.supplierName,
      description: formData.description,
      items: [],
      totalAmount: formData.totalAmount * 100,
      status: formData.status,
      deliveryDate: formData.deliveryDate || undefined,
      deliveryAddress: formData.deliveryAddress,
      poDate: formData.poDate || undefined,
      notes: formData.notes || undefined,
    } as any);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const csv = [
        ["Order Number", "Supplier", "Amount", "Status", "Delivery Date", "Delivery Address", "PO Date"],
        ...filteredOrders.map((order: any) => [
          order.orderNumber,
          order.supplierName,
          order.totalAmount / 100,
          order.status,
          order.deliveryDate || "",
          order.deliveryAddress || "",
          order.poDate || "",
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const element = document.createElement("a");
      const file = new Blob([csv], { type: "text/csv" });
      element.href = URL.createObjectURL(file);
      element.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success("Orders exported successfully");
    } catch (error) {
      toast.error("Failed to export orders");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsImporting(true);
      try {
        const text = await file.text();
        const lines = text.split("\n").slice(1);
        let imported = 0;

        for (const line of lines) {
          if (!line.trim()) continue;
          const [orderNumber, supplierId, totalAmount, status] = line.split(",");
          if (orderNumber && supplierId && totalAmount) {
            try {
              await createMutation.mutateAsync({
                orderNumber,
                supplierId,
                supplierName: "",
                description: "",
                items: [],
                totalAmount: Number(totalAmount) * 100,
                status: status || "draft",
              } as any);
              imported++;
            } catch (err) {
              console.error("Error importing row:", err);
            }
          }
        }
        toast.success(`Imported ${imported} orders successfully`);
        refetch();
      } catch (error) {
        toast.error("Failed to import orders");
      } finally {
        setIsImporting(false);
      }
    };
    input.click();
  };

  const filteredOrders = useMemo(() => {
    return (Array.isArray(orders) ? orders : []).filter((order: any) => {
      const matchesSearch =
        order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "sent":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "invoiced":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <ModuleLayout
      title="Purchase Orders"
      description="Create and manage purchase orders from selected suppliers"
      icon={<Package className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Procurement", href: "/procurement" },
        { label: "Orders" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImport}
            disabled={isImporting}
            className="gap-2"
          >
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className="gap-2"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export
          </Button>
          <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            New Order
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard label="Total Orders" value={filteredOrders.length} icon={<Package className="h-5 w-5" />} color="border-l-blue-500" />
          <StatsCard label="Total Value" value={<>{currencyCode} {(filteredOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0) / 100).toLocaleString()}</>} icon={<DollarSign className="h-5 w-5" />} color="border-l-green-500" />
          <StatsCard label="Pending" value={filteredOrders.filter((o: any) => ["draft", "sent"].includes(o.status)).length} icon={<Clock className="h-5 w-5" />} color="border-l-yellow-500" />
          <StatsCard label="Delivered" value={filteredOrders.filter((o: any) => o.status === "delivered").length} icon={<CheckCircle2 className="h-5 w-5" />} color="border-l-emerald-500" />
        </div>

        {/* Toolbar */}
        <ListPageToolbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search orders..."
          onCreateClick={() => { resetForm(); setIsCreateOpen(true); }}
          createLabel="New Order"
          onExportClick={handleExport}
          onImportClick={handleImport}
          onPrintClick={() => window.print()}
          filterContent={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="invoiced">Invoiced</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {/* Bulk Actions Bar */}
        <EnhancedBulkActions
          selectedCount={selectedOrders.size}
          onClear={() => setSelectedOrders(new Set())}
          actions={[
            { id: "updateStatus", label: "Update Status", icon: <RefreshCw className="h-3.5 w-3.5" />, onClick: async () => { const status = prompt("Enter new status (draft, sent, confirmed, delivered, invoiced):"); if (!status || !['draft','sent','confirmed','delivered','invoiced'].includes(status)) { toast.error("Invalid status"); return; } let count = 0; for (const id of selectedOrders) { try { await updateMutation.mutateAsync({ id, status: status as any }); count++; } catch {} } toast.success(`Updated ${count} orders to ${status}`); setSelectedOrders(new Set()); } },
            bulkExportAction(selectedOrders, orders, orderColumns, "orders"),
            bulkCopyIdsAction(selectedOrders),
            bulkEmailAction(navigate),
            bulkDeleteAction(selectedOrders, async (ids) => { let count = 0; for (const id of ids) { try { await deleteMutation.mutateAsync(id); count++; } catch {} } toast.success(`Deleted ${count} orders`); setSelectedOrders(new Set()); }),
          ]}
        />

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm text-muted-foreground">{filteredOrders.length} orders</span>
              <TableColumnSettings columns={orderColumns} visibleColumns={visibleColumns} onToggleColumn={toggleColumn} onReset={reset} pageSize={pageSize} onPageSizeChange={updatePageSize} />
            </div>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No orders found. Click "+" to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"><Checkbox checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0} onCheckedChange={() => { if (selectedOrders.size === filteredOrders.length) setSelectedOrders(new Set()); else setSelectedOrders(new Set(filteredOrders.map((o: any) => o.id))); }} /></TableHead>
                      {isVisible("orderNumber") && <TableHead>Order Number</TableHead>}
                      {isVisible("supplier") && <TableHead>Supplier</TableHead>}
                      {isVisible("amount") && <TableHead className="text-right">Amount</TableHead>}
                      {isVisible("deliveryDate") && <TableHead>Delivery Date</TableHead>}
                      {isVisible("deliveryAddress") && <TableHead>Delivery Address</TableHead>}
                      {isVisible("status") && <TableHead>Status</TableHead>}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order: any) => (
                      <TableRow key={order.id} className={selectedOrders.has(order.id) ? "bg-primary/5" : ""}>
                        <TableCell><Checkbox checked={selectedOrders.has(order.id)} onCheckedChange={() => { const next = new Set(selectedOrders); if (next.has(order.id)) next.delete(order.id); else next.add(order.id); setSelectedOrders(next); }} /></TableCell>
                        {isVisible("orderNumber") && <TableCell className="font-medium">{order.orderNumber}</TableCell>}
                        {isVisible("supplier") && <TableCell>{order.supplierName}</TableCell>}
                        {isVisible("amount") && <TableCell className="text-right">
                          {new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format((order.totalAmount || 0) / 100)}
                        </TableCell>}
                        {isVisible("deliveryDate") && <TableCell>{order.deliveryDate || "N/A"}</TableCell>}
                        {isVisible("deliveryAddress") && <TableCell className="max-w-xs truncate">{order.deliveryAddress || "N/A"}</TableCell>}
                        {isVisible("status") && <TableCell>
                          <Badge className={getStatusColor(order.status)}>{order.status?.toUpperCase()}</Badge>
                        </TableCell>}
                        <TableCell className="text-right">
                          <RowActionsMenu
                            primaryActions={[
                              { label: "View Details", icon: actionIcons.view, onClick: () => navigate(`/orders/${order.id}`) },
                              { label: "Delete", icon: actionIcons.delete, onClick: () => { if (confirm("Delete this order?")) deleteMutation.mutate(order.id); }, variant: "destructive" },
                            ]}
                            menuActions={[
                              { label: "Duplicate Order", icon: actionIcons.copy, onClick: () => {
                                createMutation.mutate({ orderNumber: `${order.orderNumber}-COPY`, supplierId: order.supplierId || '', supplierName: order.supplierName || '', description: order.description || '', items: [], totalAmount: order.totalAmount || 0, status: 'draft', deliveryAddress: order.deliveryAddress || '' } as any);
                              }},
                              { label: "Download PDF", icon: actionIcons.download, onClick: () => { setViewOrder(order); setTimeout(() => window.print(), 300); }, separator: true },
                              { label: "Update Status", icon: <Edit className="h-4 w-4" />, onClick: () => {
                                const status = prompt("Enter status (draft, sent, confirmed, delivered, invoiced):", order.status);
                                if (status && ['draft','sent','confirmed','delivered','invoiced'].includes(status)) updateMutation.mutate({ id: order.id, status: status as any });
                              }},
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Order Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Purchase Order</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new purchase order
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Order Identification */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Order Identification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="orderNumber">Order Number *</Label>
                      <Input
                        id="orderNumber"
                        name="orderNumber"
                        value={formData.orderNumber}
                        onChange={handleInputChange}
                        placeholder="e.g., PO-2026-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplierId">Select Supplier *</Label>
                      <Select value={formData.supplierId} onValueChange={handleSupplierSelect}>
                        <SelectTrigger id="supplierId">
                          <SelectValue placeholder="Select a supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier: any) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial & Schedule */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Coins className="w-4 h-4 text-green-600" />
                    Financial & Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="totalAmount">Total Amount (KES) *</Label>
                      <div className="relative">
                        <Coins className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="totalAmount"
                          name="totalAmount"
                          type="number"
                          value={formData.totalAmount}
                          onChange={handleInputChange}
                          placeholder="0.00"
                          step="0.01"
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="poDate">PO Date</Label>
                      <Input
                        id="poDate"
                        name="poDate"
                        type="date"
                        value={formData.poDate}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}>
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="invoiced">Invoiced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Details */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="w-4 h-4 text-orange-600" />
                    Delivery Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="deliveryDate">Delivery Date</Label>
                      <Input
                        id="deliveryDate"
                        name="deliveryDate"
                        type="date"
                        value={formData.deliveryDate}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deliveryAddress">Delivery Address *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="deliveryAddress"
                          name="deliveryAddress"
                          value={formData.deliveryAddress}
                          onChange={handleInputChange}
                          placeholder="e.g., Warehouse 1, Nairobi"
                          className="pl-8"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Description & Notes */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-purple-600" />
                    Description & Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Description / Items</Label>
                    <RichTextEditor
                      value={formData.description}
                      onChange={(html) => setFormData(prev => ({ ...prev, description: html }))}
                      placeholder="List items or services included in this order"
                      minHeight="100px"
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <RichTextEditor
                      value={formData.notes}
                      onChange={(html) => setFormData(prev => ({ ...prev, notes: html }))}
                      placeholder="Additional notes or special instructions"
                      minHeight="80px"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateOrder}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Order"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Order Dialog */}
        <Dialog open={!!viewOrder} onOpenChange={(open) => !open && setViewOrder(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
            </DialogHeader>
            {viewOrder && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-medium">Order #:</span> {viewOrder.orderNumber}</div>
                  <div><span className="font-medium">Status:</span> <Badge className={getStatusColor(viewOrder.status)}>{viewOrder.status?.toUpperCase()}</Badge></div>
                  <div><span className="font-medium">Supplier:</span> {viewOrder.supplierName}</div>
                  <div><span className="font-medium">Amount:</span> {new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format((viewOrder.totalAmount || 0) / 100)}</div>
                  <div><span className="font-medium">PO Date:</span> {viewOrder.poDate || "N/A"}</div>
                  <div><span className="font-medium">Delivery:</span> {viewOrder.deliveryDate || "N/A"}</div>
                </div>
                {viewOrder.deliveryAddress && <div><span className="font-medium">Address:</span> {viewOrder.deliveryAddress}</div>}
                {viewOrder.description && <div><span className="font-medium">Description:</span> {viewOrder.description}</div>}
                {viewOrder.notes && <div><span className="font-medium">Notes:</span> {viewOrder.notes}</div>}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ModuleLayout>
  );
}
