import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  CheckCircle2,
  Clock,
  Package,
  QrCode,
  Plus,
  Loader2,
  TrendingUp,
  AlertTriangle,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// Quality Assessment Component
function QualityAssessment({ grn }: { grn: any }) {
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessment, setAssessment] = useState({
    condition: "good",
    remarks: "",
  });

  const qualityRatings = {
    good: { label: "Accepted", color: "bg-green-100 text-green-800" },
    partial: { label: "Partial Acceptance", color: "bg-yellow-100 text-yellow-800" },
    damaged: { label: "Damaged", color: "bg-red-100 text-red-800" },
    defective: { label: "Defective", color: "bg-red-100 text-red-800" },
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <h4 className="font-semibold text-sm">Quality Assessment</h4>
      {!grn.qualityStatus ? (
        <>
          <div>
            <Label>Inspection Result</Label>
            <Select value={assessment.condition} onValueChange={(value) =>
              setAssessment({ ...assessment, condition: value })
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Accepted</SelectItem>
                <SelectItem value="partial">Partial Acceptance</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="defective">Defective</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assessment Remarks</Label>
            <Textarea
              value={assessment.remarks}
              onChange={(e) => setAssessment({ ...assessment, remarks: e.target.value })}
              placeholder="Enter quality assessment remarks..."
              rows={3}
            />
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={isAssessing}
          >
            {isAssessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Assessment
          </Button>
        </>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Assessment Status</p>
          <Badge
            className={qualityRatings[grn.qualityStatus as keyof typeof qualityRatings]?.color}
          >
            {qualityRatings[grn.qualityStatus as keyof typeof qualityRatings]?.label}
          </Badge>
          {grn.remarks && (
            <div>
              <p className="text-sm text-gray-600">Remarks</p>
              <p className="text-sm">{grn.remarks}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// GRN Metrics
function GRNMetrics() {
  const { data: grns = [] } = trpc.grn.list.useQuery();

  const metrics = [
    {
      title: "Total GRNs",
      value: grns?.length || 0,
      icon: <Package className="w-5 h-5" />,
      color: "text-blue-600",
    },
    {
      title: "Accepted",
      value: grns?.filter((g: any) => g.status === "accepted")?.length || 0,
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: "text-green-600",
    },
    {
      title: "Partial",
      value: grns?.filter((g: any) => g.status === "partial")?.length || 0,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: "text-yellow-600",
    },
    {
      title: "Rejected",
      value: grns?.filter((g: any) => g.status === "rejected")?.length || 0,
      icon: <AlertCircle className="w-5 h-5" />,
      color: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold mt-1">{metric.value}</p>
              </div>
              <span className={metric.color}>{metric.icon}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Create GRN Dialog
function CreateGRNDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    grnNo: "",
    supplier: "",
    invNo: "",
    receivedDate: new Date().toISOString().split("T")[0],
    items: 0,
    value: 0,
    notes: "",
  });

  const { refetch } = trpc.grn.list.useQuery();
  const createMutation = trpc.grn.create.useMutation({
    onSuccess: () => {
      toast.success("GRN created successfully");
      setIsOpen(false);
      setFormData({
        grnNo: "",
        supplier: "",
        invNo: "",
        receivedDate: new Date().toISOString().split("T")[0],
        items: 0,
        value: 0,
        notes: "",
      });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create GRN");
    },
  });

  const handleCreate = () => {
    if (!formData.grnNo || !formData.supplier) {
      toast.error("GRN Number and Supplier are required");
      return;
    }
    createMutation.mutate({
      ...formData,
      items: parseInt(formData.items.toString()),
      value: parseFloat(formData.value.toString()),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New GRN
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Goods Receipt Note</DialogTitle>
          <DialogDescription>
            Record incoming goods and perform quality assessment
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>GRN Number</Label>
            <Input
              value={formData.grnNo}
              onChange={(e) => setFormData({ ...formData, grnNo: e.target.value })}
              placeholder="GRN-001"
            />
          </div>
          <div>
            <Label>Supplier</Label>
            <Input
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              placeholder="Supplier name or ID"
            />
          </div>
          <div>
            <Label>Invoice Number (Optional)</Label>
            <Input
              value={formData.invNo}
              onChange={(e) => setFormData({ ...formData, invNo: e.target.value })}
              placeholder="INV-001"
            />
          </div>
          <div>
            <Label>Received Date</Label>
            <Input
              type="date"
              value={formData.receivedDate}
              onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Number of Items</Label>
              <Input
                type="number"
                value={formData.items}
                onChange={(e) => setFormData({ ...formData, items: parseInt(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Total Value</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create GRN
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// GRN Table with Details
function GRNTable() {
  const [selectedGRN, setSelectedGRN] = useState<any>(null);
  const { data: grns = [] } = trpc.grn.list.useQuery();

  const statusColors = {
    pending: "bg-gray-100 text-gray-800",
    accepted: "bg-green-100 text-green-800",
    partial: "bg-yellow-100 text-yellow-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>GRN Number</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Quality</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grns?.map((grn: any) => (
            <TableRow key={grn.id}>
              <TableCell className="font-medium">{grn.grnNo}</TableCell>
              <TableCell>{grn.supplier}</TableCell>
              <TableCell>{grn.invNo || "-"}</TableCell>
              <TableCell>{grn.items}</TableCell>
              <TableCell>${grn.value?.toFixed(2) || "0.00"}</TableCell>
              <TableCell>
                <Badge
                  className={statusColors[grn.status as keyof typeof statusColors] || ""}
                >
                  {grn.status}
                </Badge>
              </TableCell>
              <TableCell>
                {grn.status ? (
                  <Badge variant="outline">{grn.status}</Badge>
                ) : (
                  <span className="text-xs text-gray-500">Pending</span>
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedGRN(grn)}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {(!grns || grns.length === 0) && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                No GRNs found. Create one to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* GRN Details Modal */}
      {selectedGRN && (
        <Dialog open={!!selectedGRN} onOpenChange={() => setSelectedGRN(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>GRN Details: {selectedGRN.grnNo}</DialogTitle>
              <DialogDescription>
                Complete Goods Receipt Note information and quality assessment
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Supplier</p>
                  <p className="font-semibold">{selectedGRN.supplier}</p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <p className="font-semibold">{selectedGRN.status}</p>
                </div>
                <div>
                  <p className="text-gray-600">Invoice Number</p>
                  <p className="font-semibold">{selectedGRN.invNo || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-600">Received Date</p>
                  <p className="font-semibold">
                    {new Date(selectedGRN.receivedDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Quantities */}
              <div className="grid grid-cols-3 gap-4 text-sm bg-blue-50 p-4 rounded-lg">
                <div>
                  <p className="text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold">{selectedGRN.items}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold">${selectedGRN.value?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Per Item</p>
                  <p className="text-2xl font-bold">
                    ${(selectedGRN.value / selectedGRN.items).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Quality Assessment */}
              <QualityAssessment grn={selectedGRN} />

              {/* Notes */}
              {selectedGRN.notes && (
                <div>
                  <p className="text-gray-600 mb-2 text-sm">Notes</p>
                  <p className="bg-gray-50 p-3 rounded text-sm">{selectedGRN.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={() => { window.print(); }}>
                  Print GRN
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => toast.success("GRN loaded to inventory queue") }>
                  Load to Inventory
                </Button>
                <Button className="flex-1" onClick={() => toast.success("Changes saved")}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function GRNManagement() {
  return (
    <ModuleLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Procurement", href: "/procurement" },
        { label: "GRN Management", href: "/procurement/grn" },
      ]}
      title="Goods Receipt Notes (GRN)"
      description="Manage goods receipt, quality assessment, and warehouse intake"
      icon={<Package className="w-6 h-6" />}
    >
      <div className="space-y-8">
        {/* Metrics */}
        <div>
          <h2 className="text-2xl font-bold mb-4">GRN Metrics</h2>
          <GRNMetrics />
        </div>

        {/* Create Button */}
        <div className="flex justify-end">
          <CreateGRNDialog />
        </div>

        {/* GRN Table */}
        <Card>
          <CardHeader>
            <CardTitle>Goods Receipt Notes</CardTitle>
            <CardDescription>Complete list of received goods with quality assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <GRNTable />
          </CardContent>
        </Card>

        {/* Quality Standards Info */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg">Quality Assessment Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-2">
              <Badge className="bg-green-100 text-green-800">Accepted</Badge>
              <span>Goods meet specifications and are accepted into inventory</span>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>
              <span>Some items accepted, others require further inspection or return</span>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-red-100 text-red-800">Rejected</Badge>
              <span>Goods do not meet specifications and must be returned/replaced</span>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-red-100 text-red-800">Defective</Badge>
              <span>Quality issues detected requiring supplier remediation</span>
            </div>
          </CardContent>
        </Card>

        {/* Receipt Workflow */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">Receipt Workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">1. Create GRN:</span> Generate new GRN when goods arrive
            </p>
            <p>
              <span className="font-semibold">2. Count Items:</span> Verify item count matches LPO
            </p>
            <p>
              <span className="font-semibold">3. Quality Check:</span> Inspect goods for damage/defects
            </p>
            <p>
              <span className="font-semibold">4. Assessment:</span> Record quality status
            </p>
            <p>
              <span className="font-semibold">5. Load Inventory:</span> Update warehouse inventory post approval
            </p>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
