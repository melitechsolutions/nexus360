import { ModuleLayout } from "@/components/ModuleLayout";
import { useState } from "react";
import { useLocation } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Eye, Edit, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { generateDebitNotePDF } from "@/lib/pdfGenerator";


interface DebitNote {
  id: string;
  debitNoteNumber: string;
  issueDate: Date;
  supplierName: string;
  supplierId: string;
  reason: string;
  total: number;
  status: "draft" | "approved" | "settled";
  createdAt: Date;
}

export default function DebitNotes() {
  const { allowed, isLoading: permLoading } = useRequireFeature("accounting:debit-notes:view");
  const [, setLocation] = useLocation();
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const listQuery = trpc.debitNotes.list.useQuery(undefined, {
    onSuccess: (data) => {
      setDebitNotes(data || []);
      setIsLoading(false);
    },
    onError: (error) => {
      toast.error(`Failed to load debit notes: ${error.message}`);
      setIsLoading(false);
    },
  });

  const deleteMutation = trpc.debitNotes.delete.useMutation({
    onSuccess: () => {
      toast.success("Debit note deleted successfully");
      listQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this debit note?")) {
      deleteMutation.mutate({ id });
    }
  };

  if (permLoading) return <Spinner />;
  if (!allowed) return <div className="text-center py-10">Access Denied</div>;

  return (
    <ModuleLayout
      title="Debit Notes"
      description="Manage supplier debit notes and claims"
      icon="FileText"
      breadcrumbs={[{label: "Dashboard", href: "/crm-home"}, {label: "Accounting", href: "/accounting"}, {label: "Debit Notes"}]}
    >

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Debit Notes</h1>
        <Button onClick={() => setLocation("/debit-notes/create")}>
          <Plus className="w-4 h-4 mr-2" />
          New Debit Note
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : debitNotes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            No debit notes created yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {debitNotes.map((dn) => (
            <Card key={dn.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{dn.debitNoteNumber}</CardTitle>
                    <p className="text-sm text-gray-600">{dn.supplierName}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    dn.status === "draft" ? "bg-gray-100 text-gray-800" :
                    dn.status === "approved" ? "bg-green-100 text-green-800" :
                    "bg-blue-100 text-blue-800"
                  }`}>
                    {dn.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600">Issue Date</p>
                    <p className="font-semibold">{new Date(dn.issueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Reason</p>
                    <p className="font-semibold text-sm">{dn.reason}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Amount</p>
                    <p className="font-bold">KES {dn.total.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setLocation(`/debit-notes/${dn.id}`)}>
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setLocation(`/debit-notes/${dn.id}/edit`)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const doc = generateDebitNotePDF({
                      debitNoteNumber: dn.debitNoteNumber,
                      date: new Date(dn.issueDate).toLocaleDateString(),
                      supplier: { name: dn.supplierName },
                      reason: dn.reason,
                      amount: dn.total,
                      status: dn.status,
                    });
                    doc.save(`DebitNote-${dn.debitNoteNumber}.pdf`);
                    toast.success("PDF downloaded");
                  }}>
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(dn.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ModuleLayout>
  );
}
