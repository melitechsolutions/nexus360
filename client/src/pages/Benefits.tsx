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
import { Plus, Edit2, Trash2, Heart } from "lucide-react";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";
import { formatCurrency } from "@/utils/format";

interface Benefit {
  id: string;
  type: string;
  provider: string;
  coverage: string;
  employeeCost: number;
  employerCost: number;
  isActive: boolean;
  notes?: string;
}

export default function Benefits() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: "",
    provider: "",
    coverage: "",
    employeeCost: 0,
    employerCost: 0,
    notes: "",
  });

  // Fetch benefits
  const { data: benefits = [], isLoading } = trpc.payroll.benefits.list.useQuery({});

  // Mutations
  const createMut = trpc.payroll.benefits.create.useMutation();
  const updateMut = trpc.payroll.benefits.update.useMutation();
  const deleteMut = trpc.payroll.benefits.delete.useMutation();
  const utils = trpc.useUtils();

  const filteredBenefits = benefits.filter((b: any) =>
    b.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.coverage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async () => {
    if (!formData.type.trim()) {
      toast.error("Please enter a benefit type");
      return;
    }
    if (!formData.provider.trim()) {
      toast.error("Please enter a provider");
      return;
    }

    try {
      if (editingId) {
        await updateMut.mutateAsync({
          id: editingId,
          ...formData,
          employeeCost: Math.round(formData.employeeCost * 100),
          employerCost: Math.round(formData.employerCost * 100),
        });
        toast.success("Benefit updated");
      } else {
        await createMut.mutateAsync({
          ...formData,
          employeeCost: Math.round(formData.employeeCost * 100),
          employerCost: Math.round(formData.employerCost * 100),
        });
        toast.success("Benefit created");
      }
      setIsDialogOpen(false);
      setFormData({
        type: "",
        provider: "",
        coverage: "",
        employeeCost: 0,
        employerCost: 0,
        notes: "",
      });
      setEditingId(null);
      utils.payroll.benefits.list.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save benefit");
    }
  };

  const handleEdit = (benefit: Benefit) => {
    setFormData({
      type: benefit.type,
      provider: benefit.provider,
      coverage: benefit.coverage,
      employeeCost: benefit.employeeCost / 100,
      employerCost: benefit.employerCost / 100,
      notes: benefit.notes || "",
    });
    setEditingId(benefit.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this benefit?")) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Benefit deleted");
      utils.payroll.benefits.list.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete benefit");
    }
  };

  const totalEmployeeCost = filteredBenefits.reduce(
    (sum: number, b: any) => sum + (b.employeeCost || 0),
    0
  );
  const totalEmployerCost = filteredBenefits.reduce(
    (sum: number, b: any) => sum + (b.employerCost || 0),
    0
  );

  return (
    <ModuleLayout
      title="Employee Benefits"
      description="Manage health, insurance, and other employee benefits"
      icon={<Heart className="h-6 w-6" />}
      breadcrumbs={[
        { label: "HR", href: "/hr" },
        { label: "Payroll", href: "/payroll" },
        { label: "Benefits" },
      ]}
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Total Benefits"
            value={filteredBenefits.length}
            icon={<Heart className="h-5 w-5" />}
          />
          <StatsCard
            title="Employee Cost"
            value={formatCurrency(totalEmployeeCost)}
            description="Per benefit"
          />
          <StatsCard
            title="Employer Cost"
            value={formatCurrency(totalEmployerCost)}
            description="Per benefit"
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <Input
              placeholder="Search benefits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-4"
            />
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Benefit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Benefit" : "Add New Benefit"}</DialogTitle>
                <DialogDescription>Configure employee benefit programs</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Benefit Type</label>
                  <Input
                    placeholder="e.g., Health Insurance"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Provider</label>
                  <Input
                    placeholder="e.g., Jubilee Insurance"
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Coverage Level</label>
                  <Input
                    placeholder="e.g., Family, Individual, Group"
                    value={formData.coverage}
                    onChange={(e) => setFormData({ ...formData, coverage: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Employee Cost (KES)</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={formData.employeeCost}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          employeeCost: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Employer Cost (KES)</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={formData.employerCost}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          employerCost: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                  <Input
                    placeholder="Additional details..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <Button onClick={handleSave} className="w-full">
                  {editingId ? "Update Benefit" : "Add Benefit"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Benefit Programs</CardTitle>
            <CardDescription>{filteredBenefits.length} benefits configured</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading benefits...</div>
            ) : filteredBenefits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No benefits found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden md:table-cell">Provider</TableHead>
                      <TableHead className="hidden md:table-cell">Coverage</TableHead>
                      <TableHead className="text-right">Employee Cost</TableHead>
                      <TableHead className="text-right">Employer Cost</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBenefits.map((benefit: Benefit) => (
                      <TableRow key={benefit.id}>
                        <TableCell className="font-medium">{benefit.type}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {benefit.provider}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {benefit.coverage}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(benefit.employeeCost)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(benefit.employerCost)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(benefit)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(benefit.id)}
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
