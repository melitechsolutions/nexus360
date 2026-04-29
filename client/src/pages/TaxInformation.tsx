import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Edit2, Trash2, FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";

interface TaxInfo {
  id: string;
  employeeId: string;
  employeeName: string;
  taxNumber: string;
  taxBracket: string;
  exemptions: number;
  effectiveDate: string;
  notes?: string;
}

export default function TaxInformation() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [formData, setFormData] = useState({
    taxNumber: "",
    taxBracket: "25%",
    exemptions: 0,
    notes: "",
  });

  // Fetch employees for dropdown
  const { data: employees = [], isLoading: empLoading } = trpc.employees.list.useQuery({});

  // Fetch tax information
  const { data: taxInfo = [], isLoading } = trpc.payroll.employeeTaxInfo.list.useQuery({});

  // Mutations
  const createMut = trpc.payroll.employeeTaxInfo.create.useMutation();
  const updateMut = trpc.payroll.employeeTaxInfo.update.useMutation();
  const deleteMut = trpc.payroll.employeeTaxInfo.delete.useMutation();
  const utils = trpc.useUtils();

  const filteredTaxInfo = taxInfo.filter((t: any) => {
    const emp = employees.find((e: any) => e.id === t.employeeId);
    const empName = emp ? `${emp.firstName} ${emp.lastName}` : "";
    return (
      empName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.taxNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleSave = async () => {
    if (!selectedEmployeeId && !editingId) {
      toast.error("Please select an employee");
      return;
    }
    if (!formData.taxNumber.trim()) {
      toast.error("Please enter a tax number");
      return;
    }

    try {
      if (editingId) {
        await updateMut.mutateAsync({
          id: editingId,
          ...formData,
        });
        toast.success("Tax information updated");
      } else {
        await createMut.mutateAsync({
          employeeId: selectedEmployeeId,
          ...formData,
        });
        toast.success("Tax information created");
      }
      setIsDialogOpen(false);
      setFormData({
        taxNumber: "",
        taxBracket: "25%",
        exemptions: 0,
        notes: "",
      });
      setSelectedEmployeeId("");
      setEditingId(null);
      utils.payroll.employeeTaxInfo.list.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save tax information");
    }
  };

  const handleEdit = (taxRecord: TaxInfo) => {
    setFormData({
      taxNumber: taxRecord.taxNumber,
      taxBracket: taxRecord.taxBracket,
      exemptions: taxRecord.exemptions,
      notes: taxRecord.notes || "",
    });
    setSelectedEmployeeId(taxRecord.employeeId);
    setEditingId(taxRecord.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tax record?")) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Tax information deleted");
      utils.payroll.employeeTaxInfo.list.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete");
    }
  };

  const employeesWithTax = filteredTaxInfo.length;
  const avgExemptions =
    filteredTaxInfo.length > 0
      ? Math.round(
          filteredTaxInfo.reduce((sum: number, t: any) => sum + (t.exemptions || 0), 0) /
            filteredTaxInfo.length
        )
      : 0;

  return (
    <ModuleLayout
      title="Tax Information"
      description="Manage employee KRA PIN, tax brackets, and exemptions"
      icon={<FileText className="h-6 w-6" />}
      breadcrumbs={[
        { label: "HR", href: "/hr" },
        { label: "Payroll", href: "/payroll" },
        { label: "Tax Information" },
      ]}
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Employees with Tax Info"
            value={employeesWithTax}
            icon={<FileText className="h-5 w-5" />}
          />
          <StatsCard
            title="Avg Exemptions"
            value={avgExemptions}
            description="Per employee"
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees or KRA PIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Tax Info
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Tax Information" : "Add Tax Information"}
                </DialogTitle>
                <DialogDescription>
                  Configure employee KRA PIN and tax details
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Employee</label>
                  <Select
                    value={selectedEmployeeId}
                    onValueChange={setSelectedEmployeeId}
                    disabled={!!editingId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.employeeNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">KRA PIN</label>
                  <Input
                    placeholder="e.g., A012345678B"
                    value={formData.taxNumber}
                    onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Tax Bracket</label>
                  <Select
                    value={formData.taxBracket}
                    onValueChange={(value) => setFormData({ ...formData, taxBracket: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10%">10%</SelectItem>
                      <SelectItem value="15%">15%</SelectItem>
                      <SelectItem value="20%">20%</SelectItem>
                      <SelectItem value="25%">25%</SelectItem>
                      <SelectItem value="30%">30%</SelectItem>
                      <SelectItem value="32.5%">32.5%</SelectItem>
                      <SelectItem value="35%">35%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Number of Exemptions</label>
                  <Input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={formData.exemptions}
                    onChange={(e) =>
                      setFormData({ ...formData, exemptions: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                  <Input
                    placeholder="e.g., Effective from Jan 2024..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <Button onClick={handleSave} className="w-full">
                  {editingId ? "Update Tax Info" : "Add Tax Info"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Tax Records</CardTitle>
            <CardDescription>{filteredTaxInfo.length} tax records configured</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading tax information...</div>
            ) : filteredTaxInfo.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tax information found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>KRA PIN</TableHead>
                      <TableHead>Tax Bracket</TableHead>
                      <TableHead className="text-center">Exemptions</TableHead>
                      <TableHead className="hidden md:table-cell">Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTaxInfo.map((taxRecord: TaxInfo) => (
                      <TableRow key={taxRecord.id}>
                        <TableCell className="font-medium">
                          {taxRecord.employeeName}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {taxRecord.taxNumber}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{taxRecord.taxBracket}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{taxRecord.exemptions}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {taxRecord.notes || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(taxRecord)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(taxRecord.id)}
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
