import UnifiedModuleLayout from "@/components/UnifiedModuleLayout";
import { useState } from "react";
import { useLocation } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Eye, Edit, Trash2, Download, Send } from "lucide-react";
import { toast } from "sonner";

interface ServiceInvoice {
  id: string;
  serviceInvoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  clientName: string;
  clientId: string;
  serviceDescription: string;
  serviceItems: any[];
  total: number;
  status: "draft" | "sent" | "accepted" | "paid" | "cancelled";
  createdAt: Date;
}

export default function ServiceInvoices() {
  const { allowed, isLoading: permLoading } = useRequireFeature("accounting:service-invoices:view");
  const [, setLocation] = useLocation();

  const listQuery = trpc.serviceInvoices.list.useQuery(undefined, {
    onError: (error) => {
      toast.error(`Failed to load service invoices: ${error.message}`);
    },
  });

  const deleteMutation = trpc.serviceInvoices.delete.useMutation({
    onSuccess: () => {
      toast.success("Service invoice deleted successfully");
      listQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this service invoice?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "sent": return "bg-blue-100 text-blue-800";
      case "accepted": return "bg-green-100 text-green-800";
      case "paid": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (permLoading) return <Spinner />;
  if (!allowed) return <div className="text-center py-10">Access Denied</div>;

  const serviceInvoices = listQuery.data || [];
  const isLoading = listQuery.isLoading;

  return (
    <UnifiedModuleLayout
      title="Service Invoices"
      description="Invoice clients for services rendered"
      icon="Wrench"
      themeControl
      brandControl
    >
      <div className="flex justify-end mb-6">
        <Button onClick={() => setLocation("/service-invoices/create")}>
          <Plus className="w-4 h-4 mr-2" />
          New Service Invoice
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : serviceInvoices.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            No service invoices created yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {serviceInvoices.map((si) => (
            <Card key={si.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{si.serviceInvoiceNumber}</CardTitle>
                    <p className="text-sm text-gray-600">{si.clientName}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(si.status)}`}>
                    {si.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600">Issue Date</p>
                    <p className="font-semibold">{new Date(si.issueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Due Date</p>
                    <p className="font-semibold">{new Date(si.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Amount</p>
                    <p className="font-bold">KES {si.total.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mb-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                  {si.serviceDescription}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setLocation(`/service-invoices/${si.id}`)}>
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setLocation(`/service-invoices/${si.id}/edit`)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                  {si.status === "draft" && (
                    <Button variant="outline" size="sm">
                      <Send className="w-4 h-4 mr-2" />
                      Send
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleDelete(si.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </UnifiedModuleLayout>
  );
}
