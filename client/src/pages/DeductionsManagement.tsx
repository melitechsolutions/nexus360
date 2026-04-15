import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Minus,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";

interface DeductionRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  deductionType: string;
  amount: number;
  frequency: "monthly" | "quarterly" | "annual" | "one_time";
  isActive: boolean;
  notes?: string;
  effectiveDate: string;
}

export default function DeductionsManagement() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("__all__");
  const [activeOnly, setActiveOnly] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<DeductionRecord | null>(null);
  const [formData, setFormData] = useState({
    employeeId: "",
    deductionType: "",
    amount: "",
    frequency: "monthly" as const,
    notes: "",
  });

  const { data: employees = [] } = trpc.employees.list.useQuery();
  const { data: deductions = [] } = trpc.payroll.deductions.list.useQuery();
  const createMutation = trpc.payroll.deductions.create.useMutation({
    onSuccess: () => {
      toast.success("Deduction created successfully!");
      utils.payroll.deductions.list.invalidate();
      setFormData({ employeeId: "", deductionType: "", amount: "", frequency: "monthly", notes: "" });
      setIsCreateOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to create deduction: ${error.message}`);
    },
  });

  const updateMutation = trpc.payroll.deductions.update.useMutation({
    onSuccess: () => {
      toast.success("Deduction updated successfully!");
      utils.payroll.deductions.list.invalidate();
      setEditingDeduction(null);
      setIsEditOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to update deduction: ${error.message}`);
    },
  });

  const deleteMutation = trpc.payroll.deductions.delete.useMutation({
    onSuccess: () => {
      toast.success("Deduction deleted successfully!");
      utils.payroll.deductions.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Failed to delete deduction: ${error.message}`);
    },
  });

  const records: DeductionRecord[] = deductions.map((d: any) => ({
    ...d,
    employeeName: employees.find((e: any) => e.id === d.employeeId)
      ? `${employees.find((e: any) => e.id === d.employeeId).firstName || ""} ${employees.find((e: any) => e.id === d.employeeId).lastName || ""}`.trim()
      : "Unknown Employee",
  }));

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.deductionType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEmployee = !employeeFilter || employeeFilter === "__all__" || record.employeeId === employeeFilter;
    const matchesActive = !activeOnly || record.isActive;
    return matchesSearch && matchesEmployee && matchesActive;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.deductionType || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    createMutation.mutate({
      employeeId: formData.employeeId,
      deductionType: formData.deductionType,
      amount: Math.round(parseFloat(formData.amount)),
      frequency: formData.frequency,
      notes: formData.notes || undefined,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeduction) return;

    updateMutation.mutate({
      id: editingDeduction.id,
      deductionType: formData.deductionType || undefined,
      amount: formData.amount ? Math.round(parseFloat(formData.amount)) : undefined,
      frequency: formData.frequency,
      notes: formData.notes || undefined,
    });
  };

  const handleEditClick = (deduction: DeductionRecord) => {
    setEditingDeduction(deduction);
    setFormData({
      employeeId: deduction.employeeId,
      deductionType: deduction.deductionType,
      amount: String(deduction.amount),
      frequency: deduction.frequency,
      notes: deduction.notes || "",
    });
    setIsEditOpen(true);
  };

  const totalAmount = filteredRecords.reduce((sum, r) => sum + r.amount, 0);
  const activeCount = records.filter((r) => r.isActive).length;
  const deductionTypes = [...new Set(records.map((r) => r.deductionType))];

  return (
    <ModuleLayout
      title="Deductions Management"
      description="Manage employee deductions (loans, insurance, etc.)"
      icon={<Minus className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "HR", href: "/hr" },
        { label: "Payroll", href: "/payroll" },
        { label: "Deductions" },
      ]}
      backLink={{ label: "Payroll", href: "/payroll" }}
    >
      <div className="space-y-6">
        {/* Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard label="Active Deductions" value={activeCount} color="border-l-purple-500" />

          <StatsCard label="Deduction Types" value={deductionTypes.length} color="border-l-green-500" />

          <StatsCard label="Filtered Total" value={<>Ksh {totalAmount.toLocaleString()}</>} color="border-l-blue-500" />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Impact on Salary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Reduces take-home by
              </p>
              <p className="text-lg font-semibold overflow-hidden text-ellipsis">
                Ksh {(totalAmount * 12).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Deductions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by type or employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Employees</SelectItem>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="activeOnly"
                  checked={activeOnly}
                  onCheckedChange={(checked) => setActiveOnly(checked as boolean)}
                />
                <Label htmlFor="activeOnly" className="font-normal">Active Only</Label>
              </div>

              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Deduction
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Deduction</DialogTitle>
                    <DialogDescription>Add a new deduction for an employee</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="emp">Employee *</Label>
                      <Select value={formData.employeeId} onValueChange={(v) => setFormData({ ...formData, employeeId: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp: any) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.firstName} {emp.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="type">Deduction Type *</Label>
                      <Input
                        id="type"
                        placeholder="e.g., Loan, Insurance, Tax"
                        value={formData.deductionType}
                        onChange={(e) => setFormData({ ...formData, deductionType: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="amount">Amount (Ksh) *</Label>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="0"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          min="0"
                        />
                      </div>

                      <div>
                        <Label htmlFor="freq">Frequency *</Label>
                        <Select value={formData.frequency} onValueChange={(v: any) => setFormData({ ...formData, frequency: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="annual">Annual</SelectItem>
                            <SelectItem value="one_time">One-time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Input
                        id="notes"
                        placeholder="Optional notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creating..." : "Create"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Deduction Type</TableHead>
                    <TableHead>Amount (Ksh)</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No deductions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.employeeName}</TableCell>
                        <TableCell>{record.deductionType}</TableCell>
                        <TableCell>{record.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {record.frequency.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={record.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {record.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(record)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Delete this deduction?")) {
                                  deleteMutation.mutate(record.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Deduction</DialogTitle>
            <DialogDescription>Update deduction details</DialogDescription>
          </DialogHeader>
          {editingDeduction && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <Label>Employee</Label>
                <p className="text-sm text-gray-600 mt-1">{editingDeduction.employeeName}</p>
              </div>

              <div>
                <Label htmlFor="editType">Deduction Type</Label>
                <Input
                  id="editType"
                  value={formData.deductionType}
                  onChange={(e) => setFormData({ ...formData, deductionType: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editAmount">Amount (Ksh)</Label>
                  <Input
                    id="editAmount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="editFreq">Frequency</Label>
                  <Select value={formData.frequency} onValueChange={(v: any) => setFormData({ ...formData, frequency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="one_time">One-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="editNotes">Notes</Label>
                <Input
                  id="editNotes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
