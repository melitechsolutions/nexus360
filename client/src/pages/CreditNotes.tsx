import ModuleLayout from "@/components/ModuleLayout";
import { useState } from "react";
import { useLocation } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Eye, Edit, Trash2, Download, FileText } from "lucide-react";
import { toast } from "sonner";

export default function CreditNotes() {
  const { allowed, isLoading: permLoading } = useRequireFeature("accounting:credit-notes:view");
  const [, setLocation] = useLocation();

  const listQuery = trpc.creditNotes.list.useQuery();
  const creditNotes = listQuery.data || [];

  const deleteMutation = trpc.creditNotes.delete.useMutation({
    onSuccess: () => {
      toast.success("Credit note deleted successfully");
      listQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this credit note?")) {
      deleteMutation.mutate({ id });
    }
  };

  if (permLoading) return <Spinner />;
  if (!allowed) return <div className="text-center py-10">Access Denied</div>;

  return (
    <ModuleLayout
      title="Credit Notes"
      description="Manage customer credit notes and adjustments"
      icon={<FileText className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Accounting", href: "/accounting" },
        { label: "Credit Notes" },
      ]}
    >
      <div className="flex justify-end mb-6">
        <Button onClick={() => setLocation("/credit-notes/create")}>
          <Plus className="w-4 h-4 mr-2" />
          New Credit Note
        </Button>
      </div>

      {listQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : creditNotes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            No credit notes created yet. Click "New Credit Note" to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {creditNotes.map((cn) => (
            <Card key={cn.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{cn.creditNoteNumber}</CardTitle>
                    <p className="text-sm text-gray-600">{cn.clientName}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    cn.status === "draft" ? "bg-gray-100 text-gray-800" :
                    cn.status === "approved" ? "bg-green-100 text-green-800" :
                    cn.status === "applied" ? "bg-blue-100 text-blue-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {cn.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600">Issue Date</p>
                    <p className="font-semibold">{new Date(cn.issueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Reason</p>
                    <p className="font-semibold text-sm capitalize">{cn.reason?.replace(/-/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Amount</p>
                    <p className="font-bold">KES {(cn.total / 100).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setLocation(`/credit-notes/${cn.id}`)}>
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(cn.id)}>
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
