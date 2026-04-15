import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
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
import { Plus, Download, Upload, Edit2, Eye, Trash2, Loader2, ShoppingCart, Search, Building2, Coins, Truck, MapPin, StickyNote } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useCurrencySettings } from "@/lib/currency";

export default function LPOsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { code: currencyCode } = useCurrencySettings();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formData, setFormData] = useState({
    lpoNumber: "",
    vendorId: "",
    vendorName: "",
    description: "",
    amount: 0,
    status: "draft",
    deliveryDate: "",
    deliveryLocation: "",
    requestedBy: user?.name || "",
    notes: "",
  });

  // Queries
  const { data: lpos = [], isLoading, refetch } = trpc.lpo.list.useQuery();
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery({ limit: 100 });

  // Mutations
  const createMutation = trpc.lpo.create.useMutation({
    onSuccess: () => {
      toast.success("LPO created successfully");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create LPO");
    },
  });

  const deleteMutation = trpc.lpo.delete.useMutation({
    onSuccess: () => {
      toast.success("LPO deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete LPO");
    },
  });

  const resetForm = () => {
    setFormData({
      lpoNumber: "",
      vendorId: "",
      vendorName: "",
      description: "",
      amount: 0,
      status: "draft",
      deliveryDate: "",
      deliveryLocation: "",
      requestedBy: user?.name || "",
      notes: "",
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "amount" ? Number(value) : value,
    }));
  };

  const handleVendorSelect = (vendorId: string) => {
    const selectedVendor = suppliers.find((s: any) => s.id === vendorId);
    setFormData((prev) => ({
      ...prev,
      vendorId,
      vendorName: selectedVendor?.companyName || "",
    }));
  };

  const handleCreateLPO = () => {
    if (!formData.lpoNumber.trim() || !formData.vendorId || formData.amount <= 0) {
      toast.error("LPO Number, Vendor, and Amount are required");
      return;
    }

    createMutation.mutate({
      lpoNumber: formData.lpoNumber,
      vendorId: formData.vendorId,
      description: formData.description,
      amount: formData.amount * 100,
      deliveryDate: formData.deliveryDate || undefined,
      deliveryLocation: formData.deliveryLocation || undefined,
      requestedBy: formData.requestedBy,
      notes: formData.notes || undefined,
    } as any);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const csv = [
        ["LPO Number", "Vendor", "Amount", "Status", "Delivery Date", "Delivery Location", "Requested By"],
        ...filteredLPOs.map((lpo: any) => [
          lpo.lpoNumber,
          lpo.vendorName,
          lpo.amount / 100,
          lpo.status,
          lpo.deliveryDate || "",
          lpo.deliveryLocation || "",
          lpo.requestedBy || "",
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const element = document.createElement("a");
      const file = new Blob([csv], { type: "text/csv" });
      element.href = URL.createObjectURL(file);
      element.download = `lpos-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success("LPOs exported successfully");
    } catch (error) {
      toast.error("Failed to export LPOs");
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
        const lines = text.split("\n").slice(1); // Skip header
        let imported = 0;

        for (const line of lines) {
          if (!line.trim()) continue;
          const [lpoNumber, vendorId, amount, status] = line.split(",");
          if (lpoNumber && vendorId && amount) {
            try {
              await createMutation.mutateAsync({
                lpoNumber,
                vendorId,
                amount: Number(amount) * 100,
                status: status || "draft",
              } as any);
              imported++;
            } catch (err) {
              console.error("Error importing row:", err);
            }
          }
        }
        toast.success(`Imported ${imported} LPOs successfully`);
        refetch();
      } catch (error) {
        toast.error("Failed to import LPOs");
      } finally {
        setIsImporting(false);
      }
    };
    input.click();
  };

  const filteredLPOs = useMemo(() => {
    return (Array.isArray(lpos) ? lpos : []).filter((lpo: any) => {
      const matchesSearch =
        lpo.lpoNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lpo.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lpo.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || lpo.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [lpos, searchTerm, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "submitted":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <ModuleLayout
      title="Local Purchase Orders"
      description="Create and manage local purchase orders for vendor procurement"
      icon={<ShoppingCart className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Procurement", href: "#" },
        { label: "LPOs" },
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
            New LPO
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by LPO number, vendor, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* LPOs Table */}
        <Card>
          <CardHeader>
            <CardTitle>All LPOs ({filteredLPOs.length})</CardTitle>
            <CardDescription>Click on an LPO to view or edit details</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLPOs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No LPOs found. Click "New LPO" to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>LPO Number</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLPOs.map((lpo: any) => (
                      <TableRow key={lpo.id}>
                        <TableCell className="font-medium">{lpo.lpoNumber}</TableCell>
                        <TableCell>{lpo.vendorName}</TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: currencyCode,
                          }).format((lpo.amount || 0) / 100)}
                        </TableCell>
                        <TableCell>{lpo.deliveryDate || "N/A"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(lpo.status)}>
                            {lpo.status?.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{lpo.requestedBy || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/lpos/${lpo.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/lpos/${lpo.id}/edit`)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMutation.mutate(lpo.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create LPO Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New LPO</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new local purchase order
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
                      <Label htmlFor="lpoNumber">LPO Number *</Label>
                      <Input
                        id="lpoNumber"
                        name="lpoNumber"
                        value={formData.lpoNumber}
                        onChange={handleInputChange}
                        placeholder="e.g., LPO-2026-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vendorId">Select Vendor *</Label>
                      <Select value={formData.vendorId} onValueChange={handleVendorSelect}>
                        <SelectTrigger id="vendorId">
                          <SelectValue placeholder="Select a vendor" />
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

              {/* Financial & Delivery */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Coins className="w-4 h-4 text-green-600" />
                    Financial & Delivery
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (KES) *</Label>
                      <div className="relative">
                        <Coins className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="amount"
                          name="amount"
                          type="number"
                          value={formData.amount || ""}
                          onChange={handleInputChange}
                          placeholder="0.00"
                          step="0.01"
                          className="pl-8"
                        />
                      </div>
                    </div>
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryLocation">Delivery Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="deliveryLocation"
                        name="deliveryLocation"
                        value={formData.deliveryLocation}
                        onChange={handleInputChange}
                        placeholder="e.g., Warehouse A, Building 1"
                        className="pl-8"
                      />
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
                      placeholder="List items or services to be procured"
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
                onClick={handleCreateLPO}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create LPO"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleLayout>
  );
}
