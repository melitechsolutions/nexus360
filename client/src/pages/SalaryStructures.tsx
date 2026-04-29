import { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Edit2, Trash2, Eye, DollarSign, Users } from "lucide-react";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";
import { formatCurrency } from "@/utils/format";

interface SalaryStructure {
  id: string;
  name: string;
  description: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  employeeCount: number;
  isActive: boolean;
}

export default function SalaryStructures() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    basicSalary: 0,
  });

  // Fetch salary structures
  const { data: structures = [], isLoading } = trpc.payroll.salaryStructures.list.useQuery({});

  // Mutations
  const createMut = trpc.payroll.salaryStructures.create.useMutation();
  const updateMut = trpc.payroll.salaryStructures.update.useMutation();
  const deleteMut = trpc.payroll.salaryStructures.delete.useMutation();
  const utils = trpc.useUtils();

  const filteredStructures = structures.filter((s: any) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a structure name");
      return;
    }
    if (formData.basicSalary <= 0) {
      toast.error("Basic salary must be greater than 0");
      return;
    }

    try {
      if (editingId) {
        await updateMut.mutateAsync({
          id: editingId,
          ...formData,
        });
        toast.success("Salary structure updated");
      } else {
        await createMut.mutateAsync(formData);
        toast.success("Salary structure created");
      }
      setIsDialogOpen(false);
      setFormData({ name: "", description: "", basicSalary: 0 });
      setEditingId(null);
      utils.payroll.salaryStructures.list.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save structure");
    }
  };

  const handleEdit = (structure: SalaryStructure) => {
    setFormData({
      name: structure.name,
      description: structure.description,
      basicSalary: structure.basicSalary,
    });
    setEditingId(structure.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this salary structure?")) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Salary structure deleted");
      utils.payroll.salaryStructures.list.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete structure");
    }
  };

  const totalStructures = structures.length;
  const averageBasicSalary =
    structures.length > 0
      ? structures.reduce((sum: number, s: any) => sum + (s.basicSalary || 0), 0) / structures.length
      : 0;

  return (
    <ModuleLayout
      title="Salary Structures"
      description="Manage salary grades and structures for employees"
      icon={<DollarSign className="h-6 w-6" />}
      breadcrumbs={[
        { label: "HR", href: "/hr" },
        { label: "Payroll", href: "/payroll" },
        { label: "Salary Structures" },
      ]}
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Total Structures"
            value={totalStructures}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <StatsCard
            title="Avg Basic Salary"
            value={formatCurrency(averageBasicSalary)}
            icon={<Users className="h-5 w-5" />}
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <Input
              placeholder="Search structures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-4"
            />
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Structure
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Salary Structure" : "Create Salary Structure"}
                </DialogTitle>
                <DialogDescription>
                  Define salary grade levels and basic compensation
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Structure Name</label>
                  <Input
                    placeholder="e.g., Senior Manager Grade 1"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <Input
                    placeholder="e.g., For senior management roles"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Basic Salary (KES)</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.basicSalary}
                    onChange={(e) =>
                      setFormData({ ...formData, basicSalary: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <Button
                  onClick={handleSave}
                  disabled={createMut.isPending || updateMut.isPending}
                  className="w-full"
                >
                  {editingId ? "Update Structure" : "Create Structure"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Salary Structures</CardTitle>
            <CardDescription>{filteredStructures.length} structures configured</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading structures...</div>
            ) : filteredStructures.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No salary structures found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Description</TableHead>
                      <TableHead className="text-right">Basic Salary</TableHead>
                      <TableHead className="text-center">Employees</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStructures.map((structure: SalaryStructure) => (
                      <TableRow key={structure.id}>
                        <TableCell className="font-medium">{structure.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {structure.description}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(structure.basicSalary)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{structure.employeeCount || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(structure)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(structure.id)}
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
