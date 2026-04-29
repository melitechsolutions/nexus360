import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Briefcase, Filter } from "lucide-react";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";
import { formatCurrency } from "@/utils/format";

interface Allowance {
  id: string;
  employeeId?: string;
  type: string;
  amount: number;
  frequency: "monthly" | "quarterly" | "annual";
  isActive: boolean;
}

interface Deduction {
  id: string;
  employeeId?: string;
  type: string;
  amount: number;
  frequency: "monthly" | "quarterly" | "annual";
  reference?: string;
  isActive: boolean;
}

export default function AllowancesDeductions() {
  const [activeTab, setActiveTab] = useState<"allowances" | "deductions">("allowances");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: "",
    amount: 0,
    frequency: "monthly" as const,
    reference: "",
  });

  // Fetch allowances and deductions
  const { data: allowances = [], isLoading: allowLoading } =
    trpc.payroll.salaryAllowances.list.useQuery({});
  const { data: deductions = [], isLoading: dedLoading } =
    trpc.payroll.salaryDeductions.list.useQuery({});

  // Mutations
  const createAllowMut = trpc.payroll.salaryAllowances.create.useMutation();
  const updateAllowMut = trpc.payroll.salaryAllowances.update.useMutation();
  const deleteAllowMut = trpc.payroll.salaryAllowances.delete.useMutation();

  const createDedMut = trpc.payroll.salaryDeductions.create.useMutation();
  const updateDedMut = trpc.payroll.salaryDeductions.update.useMutation();
  const deleteDedMut = trpc.payroll.salaryDeductions.delete.useMutation();

  const utils = trpc.useUtils();

  const isLoading = activeTab === "allowances" ? allowLoading : dedLoading;
  const items = activeTab === "allowances" ? allowances : deductions;

  const filteredItems = items.filter((item: any) => {
    const matchesSearch = item.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterType === "all" || item.frequency === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleSave = async () => {
    if (!formData.type.trim()) {
      toast.error("Please enter a type/name");
      return;
    }
    if (formData.amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      if (activeTab === "allowances") {
        if (editingId) {
          await updateAllowMut.mutateAsync({
            id: editingId,
            ...formData,
            amount: Math.round(formData.amount * 100),
          });
        } else {
          await createAllowMut.mutateAsync({
            ...formData,
            amount: Math.round(formData.amount * 100),
          });
        }
        utils.payroll.salaryAllowances.list.refetch();
      } else {
        if (editingId) {
          await updateDedMut.mutateAsync({
            id: editingId,
            ...formData,
            amount: Math.round(formData.amount * 100),
          });
        } else {
          await createDedMut.mutateAsync({
            ...formData,
            amount: Math.round(formData.amount * 100),
          });
        }
        utils.payroll.salaryDeductions.list.refetch();
      }

      toast.success(
        `${activeTab === "allowances" ? "Allowance" : "Deduction"} ${editingId ? "updated" : "created"}`
      );
      setIsDialogOpen(false);
      setFormData({ type: "", amount: 0, frequency: "monthly", reference: "" });
      setEditingId(null);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save");
    }
  };

  const handleEdit = (item: any) => {
    setFormData({
      type: item.type,
      amount: item.amount / 100,
      frequency: item.frequency,
      reference: item.reference || "",
    });
    setEditingId(item.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete this ${activeTab === "allowances" ? "allowance" : "deduction"}?`)) return;
    try {
      if (activeTab === "allowances") {
        await deleteAllowMut.mutateAsync(id);
        utils.payroll.salaryAllowances.list.refetch();
      } else {
        await deleteDedMut.mutateAsync(id);
        utils.payroll.salaryDeductions.list.refetch();
      }
      toast.success("Deleted successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete");
    }
  };

  const totalAmount = filteredItems.reduce((sum: number, item: any) => sum + item.amount, 0);

  return (
    <ModuleLayout
      title="Allowances & Deductions"
      description="Manage employee salary allowances and deductions"
      icon={<Briefcase className="h-6 w-6" />}
      breadcrumbs={[
        { label: "HR", href: "/hr" },
        { label: "Payroll", href: "/payroll" },
        { label: "Allowances & Deductions" },
      ]}
    >
      <div className="space-y-6">
        {/* Tab Selection */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === "allowances" ? "default" : "outline"}
            onClick={() => {
              setActiveTab("allowances");
              setSearchQuery("");
              setFilterType("all");
            }}
          >
            Allowances
          </Button>
          <Button
            variant={activeTab === "deductions" ? "default" : "outline"}
            onClick={() => {
              setActiveTab("deductions");
              setSearchQuery("");
              setFilterType("all");
            }}
          >
            Deductions
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatsCard
            title={`Total ${activeTab === "allowances" ? "Allowances" : "Deductions"}`}
            value={filteredItems.length}
            icon={<Briefcase className="h-5 w-5" />}
          />
          <StatsCard
            title="Total Amount (Monthly)"
            value={formatCurrency(totalAmount)}
            icon={<Filter className="h-5 w-5" />}
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Input
              placeholder="Search by type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-4"
            />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Frequencies</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="gap-2"
                onClick={() => {
                  setEditingId(null);
                  setFormData({ type: "", amount: 0, frequency: "monthly", reference: "" });
                }}
              >
                <Plus className="h-4 w-4" />
                New {activeTab === "allowances" ? "Allowance" : "Deduction"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit" : "Create"}{" "}
                  {activeTab === "allowances" ? "Allowance" : "Deduction"}
                </DialogTitle>
                <DialogDescription>
                  Add a new {activeTab === "allowances" ? "allowance" : "deduction"} component
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type/Name</label>
                  <Input
                    placeholder={activeTab === "allowances" ? "e.g., Housing Allowance" : "e.g., Health Insurance"}
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Amount (KES)</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Frequency</label>
                  <Select value={formData.frequency} onValueChange={(value: any) =>
                    setFormData({ ...formData, frequency: value })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {activeTab === "deductions" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Reference (Optional)</label>
                    <Input
                      placeholder="e.g., Insurance Policy #"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    />
                  </div>
                )}

                <Button onClick={handleSave} className="w-full">
                  {editingId ? "Update" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === "allowances" ? "Salary Allowances" : "Salary Deductions"}
            </CardTitle>
            <CardDescription>{filteredItems.length} items configured</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No {activeTab === "allowances" ? "allowances" : "deductions"} found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Frequency</TableHead>
                      {activeTab === "deductions" && <TableHead className="hidden md:table-cell">Reference</TableHead>}
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.type}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(item.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.frequency}</Badge>
                        </TableCell>
                        {activeTab === "deductions" && (
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {item.reference || "-"}
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          <Badge variant={item.isActive ? "default" : "secondary"}>
                            {item.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
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
      </div>
    </ModuleLayout>
  );
}
