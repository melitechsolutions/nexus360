import { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
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
import { Plus, Download, Upload, Trash2, Loader2, Wallet, Search, User, Coins, CalendarDays, StickyNote, Eye } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useCurrencySettings } from "@/lib/currency";

export default function ImprestsPage() {
  // CALL ALL HOOKS UNCONDITIONALLY AT TOP LEVEL
  const { allowed, isLoading } = useRequireFeature("procurement:imprest:view");
  const { code: currencyCode } = useCurrencySettings();
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSurrenderOpen, setIsSurrenderOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedImprest, setSelectedImprest] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    imprestNumber: "",
    userId: "",
    userName: "",
    purpose: "",
    amount: 0,
    dateRequested: new Date().toISOString().split("T")[0],
    dateNeeded: "",
    approvalStatus: "pending",
    notes: "",
  });

  const [surrenderData, setSurrenderData] = useState({
    amount: 0,
    notes: "",
  });

  // ALL HOOKS MUST BE CALLED BEFORE CONDITIONAL RETURNS
  // Queries - Fetch users/employees for dropdown
  const { data: imprests = [], isLoading: isLoadingImprests, refetch } = trpc.imprest.list.useQuery();
  const { data: surrenders = [], refetch: refetchSurrenders } = trpc.imprestSurrender.list.useQuery();
  const { data: employees = [] } = trpc.users.list.useQuery({ limit: 100 });

  // Mutations
  const createMutation = trpc.imprest.create.useMutation({
    onSuccess: () => {
      toast.success("Imprest request created successfully");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create imprest");
    },
  });

  const deleteMutation = trpc.imprest.delete.useMutation({
    onSuccess: () => {
      toast.success("Imprest deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete imprest");
    },
  });

  const surrenderMutation = trpc.imprestSurrender.create.useMutation({
    onSuccess: () => {
      toast.success("Surrender recorded successfully");
      setIsSurrenderOpen(false);
      setSurrenderData({ amount: 0, notes: "" });
      refetch();
      refetchSurrenders();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to record surrender");
    },
  });

  // NOW SAFE TO CHECK CONDITIONAL RETURNS (ALL HOOKS ALREADY CALLED)
  if (isLoading) return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  if (!allowed) return null;

  const resetForm = () => {
    setFormData({
      imprestNumber: "",
      userId: "",
      userName: "",
      purpose: "",
      amount: 0,
      dateRequested: new Date().toISOString().split("T")[0],
      dateNeeded: "",
      approvalStatus: "pending",
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

  const handleEmployeeSelect = (userId: string) => {
    const selectedEmployee = employees.find((e: any) => e.id === userId);
    setFormData((prev) => ({
      ...prev,
      userId,
      userName: selectedEmployee?.name || "",
    }));
  };

  const handleCreateImprest = () => {
    if (!formData.imprestNumber.trim() || !formData.userId || formData.amount <= 0) {
      toast.error("Imprest Number, Employee, and Amount are required");
      return;
    }

    createMutation.mutate({
      imprestNumber: formData.imprestNumber,
      userId: formData.userId,
      purpose: formData.purpose,
      amount: formData.amount * 100,
      dateRequested: formData.dateRequested || undefined,
      dateNeeded: formData.dateNeeded || undefined,
      approvalStatus: formData.approvalStatus,
      notes: formData.notes || undefined,
    } as any);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const csv = [
        ["Imprest Number", "Employee", "Amount", "Purpose", "Status", "Date Requested", "Date Needed"],
        ...filteredImprests.map((imp: any) => [
          imp.imprestNumber,
          imp.userName,
          imp.amount / 100,
          imp.purpose,
          imp.approvalStatus,
          imp.dateRequested || "",
          imp.dateNeeded || "",
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const element = document.createElement("a");
      const file = new Blob([csv], { type: "text/csv" });
      element.href = URL.createObjectURL(file);
      element.download = `imprests-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success("Imprests exported successfully");
    } catch (error) {
      toast.error("Failed to export imprests");
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
          const [imprestNumber, userId, amount, purpose] = line.split(",");
          if (imprestNumber && userId && amount) {
            try {
              await createMutation.mutateAsync({
                imprestNumber,
                userId,
                purpose,
                amount: Number(amount) * 100,
              } as any);
              imported++;
            } catch (err) {
              console.error("Error importing row:", err);
            }
          }
        }
        toast.success(`Imported ${imported} imprests successfully`);
        refetch();
      } catch (error) {
        toast.error("Failed to import imprests");
      } finally {
        setIsImporting(false);
      }
    };
    input.click();
  };

  // Filter imprests AFTER all hooks are called
  if (!Array.isArray(imprests)) {
    return null;
  }
  
  const filteredImprests = imprests.filter((imp: any) => {
    const matchesSearch =
      imp.imprestNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      imp.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      imp.purpose?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || imp.approvalStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "settled":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <ModuleLayout
      title="Imprests"
      description="Manage cash advances and imprest requests for employees"
      icon={<Wallet className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Procurement", href: "/procurement" },
        { label: "Imprests" },
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
            New Request
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
                    placeholder="Search by imprest number, employee, or purpose..."
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Imprests Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Imprests ({filteredImprests.length})</CardTitle>
            <CardDescription>Manage employee cash advances and imprest requests</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingImprests ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredImprests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No imprests found. Click "New Request" to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imprest Number</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Date Needed</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredImprests.map((imp: any) => {
                      const surrendered = surrenders
                        .filter((s: any) => s.imprestId === imp.id)
                        .reduce((sum, s) => sum + (s.amount || 0), 0);
                      return (
                        <TableRow key={imp.id}>
                          <TableCell className="font-medium">{imp.imprestNumber}</TableCell>
                          <TableCell>{imp.userName}</TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: currencyCode,
                            }).format((imp.amount || 0) / 100)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{imp.purpose}</TableCell>
                          <TableCell>{imp.dateNeeded ? new Date(imp.dateNeeded).toLocaleDateString() : "N/A"}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(imp.approvalStatus)}>
                              {imp.approvalStatus?.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setLocation(`/imprests/${imp.id}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedImprest(imp);
                                  setSurrenderData({ amount: 0, notes: "" });
                                  setIsSurrenderOpen(true);
                                }}
                              >
                                Surrender
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMutation.mutate(imp.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Imprest Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Imprest Request</DialogTitle>
              <DialogDescription>
                Submit a cash advance or imprest request for an employee
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Request Details */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Request Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="imprestNumber">Imprest Number *</Label>
                      <Input
                        id="imprestNumber"
                        name="imprestNumber"
                        value={formData.imprestNumber}
                        onChange={handleInputChange}
                        placeholder="e.g., IMP-2026-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="userId">Select Employee *</Label>
                      <Select value={formData.userId} onValueChange={handleEmployeeSelect}>
                        <SelectTrigger id="userId">
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp: any) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name}
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
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (KES) *</Label>
                      <div className="relative">
                        <Coins className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="amount"
                          name="amount"
                          type="number"
                          value={formData.amount}
                          onChange={handleInputChange}
                          placeholder="0.00"
                          step="0.01"
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateRequested">Date Requested</Label>
                      <Input
                        id="dateRequested"
                        name="dateRequested"
                        type="date"
                        value={formData.dateRequested}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateNeeded">Date Needed</Label>
                      <Input
                        id="dateNeeded"
                        name="dateNeeded"
                        type="date"
                        value={formData.dateNeeded}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Purpose & Notes */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-purple-600" />
                    Purpose & Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose *</Label>
                    <RichTextEditor
                      value={formData.purpose}
                      onChange={(html) => setFormData(prev => ({ ...prev, purpose: html }))}
                      placeholder="Describe the purpose of this imprest"
                      minHeight="100px"
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <RichTextEditor
                      value={formData.notes}
                      onChange={(html) => setFormData(prev => ({ ...prev, notes: html }))}
                      placeholder="Additional notes or comments"
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
                onClick={handleCreateImprest}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Surrender Imprest Dialog */}
        {selectedImprest && (
          <Dialog open={isSurrenderOpen} onOpenChange={setIsSurrenderOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Surrender Imprest {selectedImprest.imprestNumber}</DialogTitle>
                <DialogDescription>
                  Record the surrender/return of cash from this imprest
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Original Amount</p>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: currencyCode,
                    }).format((selectedImprest.amount || 0) / 100)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="surrenderAmount">Amount Returned (KES) *</Label>
                  <Input
                    id="surrenderAmount"
                    type="number"
                    value={surrenderData.amount}
                    onChange={(e) =>
                      setSurrenderData((prev) => ({
                        ...prev,
                        amount: Number(e.target.value),
                      }))
                    }
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="surrenderNotes">Notes</Label>
                  <RichTextEditor
                    value={surrenderData.notes}
                    onChange={(html) => setSurrenderData(prev => ({ ...prev, notes: html }))}
                    placeholder="Any notes about the surrender"
                    minHeight="100px"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSurrenderOpen(false);
                    setSelectedImprest(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (surrenderData.amount <= 0) {
                      toast.error("Amount must be greater than 0");
                      return;
                    }
                    surrenderMutation.mutate({
                      imprestId: selectedImprest.id,
                      amount: surrenderData.amount * 100,
                      notes: surrenderData.notes || undefined,
                    } as any);
                  }}
                  disabled={surrenderMutation.isPending}
                >
                  {surrenderMutation.isPending ? "Recording..." : "Record Surrender"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </ModuleLayout>
  );
}
