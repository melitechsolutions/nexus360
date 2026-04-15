import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
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
import { Plus, Download, Upload, Edit2, Trash2, Loader2, ShoppingCart, Search, Eye, Copy, DollarSign, Clock, CheckCircle2 } from "lucide-react";
import { useCurrencySettings } from "@/lib/currency";
import { Checkbox } from "@/components/ui/checkbox";
import { StatsCard } from "@/components/ui/stats-card";
import { ListPageToolbar } from "@/components/list-page/ListPageToolbar";
import { RowActionsMenu, actionIcons } from "@/components/list-page/RowActionsMenu";
import { TableColumnSettings, useColumnVisibility, type ColumnConfig } from "@/components/list-page/TableColumnSettings";
import { EnhancedBulkActions, bulkExportAction, bulkCopyIdsAction, bulkDeleteAction, bulkApproveAction, bulkEmailAction } from "@/components/list-page/EnhancedBulkActions";

export default function LPOsPage() {
  const { allowed, isLoading } = useRequireFeature("procurement:lpo:view");
  const { code: currencyCode } = useCurrencySettings();
  
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLPOs, setSelectedLPOs] = useState<Set<string>>(new Set());

  const lpoColumns: ColumnConfig[] = [
    { key: "lpoNumber", label: "LPO Number" },
    { key: "vendor", label: "Vendor" },
    { key: "amount", label: "Amount" },
    { key: "deliveryDate", label: "Delivery Date" },
    { key: "status", label: "Status" },
    { key: "requestedBy", label: "Requested By" },
  ];
  const { visibleColumns, toggleColumn, isVisible, pageSize, updatePageSize, reset } = useColumnVisibility(lpoColumns, "lpos");
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
  
  // QUERIES AND MUTATIONS - Called before conditional returns
  const { data: lpos = [], isLoading: isLoadingLpos, refetch } = trpc.lpo.list.useQuery();
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

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  if (!allowed) return null;

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

  // Filter LPOs AFTER all hooks are called
  if (!Array.isArray(lpos)) {
    return null;
  }
  
  const filteredLPOs = lpos.filter((lpo: any) => {
    const matchesSearch =
      lpo.lpoNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lpo.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lpo.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || lpo.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
        { label: "Procurement", href: "/procurement" },
        { label: "LPOs" },
      ]}
      actions={<></>}
    >
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard label="Total LPOs" value={filteredLPOs.length} icon={<ShoppingCart className="h-5 w-5" />} color="border-l-blue-500" />
          <StatsCard label="Total Value" value={<>{currencyCode} {(filteredLPOs.reduce((s: number, l: any) => s + (l.amount || 0), 0) / 100).toLocaleString()}</>} icon={<DollarSign className="h-5 w-5" />} color="border-l-green-500" />
          <StatsCard label="Approved" value={filteredLPOs.filter((l: any) => l.status === "approved").length} icon={<CheckCircle2 className="h-5 w-5" />} color="border-l-emerald-500" />
          <StatsCard label="Draft" value={filteredLPOs.filter((l: any) => l.status === "draft").length} icon={<Clock className="h-5 w-5" />} color="border-l-yellow-500" />
        </div>

        {/* Toolbar */}
        <ListPageToolbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search by LPO number, vendor, or description..."
          onCreateClick={() => { resetForm(); setIsCreateOpen(true); }}
          createLabel="New LPO"
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
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {/* Bulk Actions */}
        <EnhancedBulkActions
          selectedCount={selectedLPOs.size}
          onClear={() => setSelectedLPOs(new Set())}
          actions={[
            bulkExportAction(selectedLPOs, lpos, lpoColumns, "lpos"),
            bulkCopyIdsAction(selectedLPOs),
            bulkEmailAction(navigate),
            bulkDeleteAction(selectedLPOs, (ids) => { ids.forEach((id) => deleteMutation.mutate(id)); setSelectedLPOs(new Set()); }),
          ]}
        />

        {/* LPOs Table */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm text-muted-foreground">{filteredLPOs.length} LPOs</span>
              <TableColumnSettings columns={lpoColumns} visibleColumns={visibleColumns} onToggleColumn={toggleColumn} onReset={reset} pageSize={pageSize} onPageSizeChange={updatePageSize} />
            </div>
            {isLoadingLpos ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLPOs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No LPOs found. Click "+" to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"><Checkbox checked={selectedLPOs.size === filteredLPOs.length && filteredLPOs.length > 0} onCheckedChange={() => { if (selectedLPOs.size === filteredLPOs.length) setSelectedLPOs(new Set()); else setSelectedLPOs(new Set(filteredLPOs.map((l: any) => l.id))); }} /></TableHead>
                      {isVisible("lpoNumber") && <TableHead>LPO Number</TableHead>}
                      {isVisible("vendor") && <TableHead>Vendor</TableHead>}
                      {isVisible("amount") && <TableHead className="text-right">Amount</TableHead>}
                      {isVisible("deliveryDate") && <TableHead>Delivery Date</TableHead>}
                      {isVisible("status") && <TableHead>Status</TableHead>}
                      {isVisible("requestedBy") && <TableHead>Requested By</TableHead>}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLPOs.map((lpo: any) => (
                      <TableRow key={lpo.id} className={selectedLPOs.has(lpo.id) ? "bg-primary/5" : ""}>
                        <TableCell><Checkbox checked={selectedLPOs.has(lpo.id)} onCheckedChange={() => { const next = new Set(selectedLPOs); if (next.has(lpo.id)) next.delete(lpo.id); else next.add(lpo.id); setSelectedLPOs(next); }} /></TableCell>
                        {isVisible("lpoNumber") && <TableCell className="font-medium">{lpo.lpoNumber}</TableCell>}
                        {isVisible("vendor") && <TableCell>{lpo.vendorName}</TableCell>}
                        {isVisible("amount") && <TableCell className="text-right">
                          {new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format((lpo.amount || 0) / 100)}
                        </TableCell>}
                        {isVisible("deliveryDate") && <TableCell>{lpo.deliveryDate || "N/A"}</TableCell>}
                        {isVisible("status") && <TableCell>
                          <Badge className={getStatusColor(lpo.status)}>{lpo.status?.toUpperCase()}</Badge>
                        </TableCell>}
                        {isVisible("requestedBy") && <TableCell>{lpo.requestedBy || "N/A"}</TableCell>}
                        <TableCell className="text-right">
                          <RowActionsMenu
                            primaryActions={[
                              { label: "View", icon: actionIcons.view, onClick: () => navigate(`/lpos/${lpo.id}`) },
                              { label: "Delete", icon: actionIcons.delete, onClick: () => deleteMutation.mutate(lpo.id), variant: "destructive" },
                            ]}
                            menuActions={[
                              { label: "Duplicate LPO", icon: actionIcons.copy, onClick: () => navigate(`/lpos/create?clone=${lpo.id}`) },
                              { label: "Download PDF", icon: actionIcons.download, onClick: () => { navigate(`/lpos/${lpo.id}`); setTimeout(() => window.print(), 500); }, separator: true },
                              { label: "Update Status", icon: <Edit2 className="h-4 w-4" />, onClick: () => navigate(`/lpos/${lpo.id}/edit`) },
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

        {/* Create/Edit LPO Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New LPO</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new local purchase order
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* LPO Number */}
              <div className="grid grid-cols-2 gap-4">
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

                {/* Vendor Selection */}
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

              {/* Amount and Delivery Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (KES) *</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                  />
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

              {/* Delivery Location */}
              <div className="space-y-2">
                <Label htmlFor="deliveryLocation">Delivery Location</Label>
                <Input
                  id="deliveryLocation"
                  name="deliveryLocation"
                  value={formData.deliveryLocation}
                  onChange={handleInputChange}
                  placeholder="e.g., Warehouse A, Building 1"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description / Items</Label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(html) => setFormData(prev => ({ ...prev, description: html }))}
                  placeholder="List items or services to be procured"
                  minHeight="100px"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <RichTextEditor
                  value={formData.notes}
                  onChange={(html) => setFormData(prev => ({ ...prev, notes: html }))}
                  placeholder="Additional notes or special instructions"
                  minHeight="100px"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
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
