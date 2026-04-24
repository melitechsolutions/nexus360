import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Edit,
  Loader2,
  FileText,
  User,
  Calendar,
  DollarSign,
} from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { useCurrency } from "@/lib/currency";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  paid: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

export default function ServiceInvoiceDetails() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { format } = useCurrency();

  const { data: si, isLoading } = trpc.serviceInvoices.get.useQuery({ id: id || "" });

  if (isLoading) {
    return (
      <ModuleLayout
        title="Service Invoice"
        icon={<FileText className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Service Invoices", href: "/service-invoices" },
          { label: "Loading..." },
        ]}
        backLink="/service-invoices"
      >
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ModuleLayout>
    );
  }

  if (!si) {
    return (
      <ModuleLayout
        title="Service Invoice Not Found"
        icon={<FileText className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Service Invoices", href: "/service-invoices" },
          { label: "Not Found" },
        ]}
        backLink="/service-invoices"
      >
        <div className="text-center py-16 text-muted-foreground">
          Service invoice not found or you don't have permission to view it.
        </div>
      </ModuleLayout>
    );
  }

  const items: any[] = Array.isArray((si as any).serviceItems) ? (si as any).serviceItems : [];

  return (
    <ModuleLayout
      title={(si as any).serviceInvoiceNumber || "Service Invoice"}
      icon={<FileText className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Service Invoices", href: "/service-invoices" },
        { label: (si as any).serviceInvoiceNumber || "Service Invoice" },
      ]}
      backLink="/service-invoices"
      actions={
        <Button
          onClick={() => navigate(`/service-invoices/${id}/edit`)}
          className="flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          Edit
        </Button>
      }
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-xl">{(si as any).serviceInvoiceNumber}</CardTitle>
              <Badge className={statusColors[(si as any).status] || "bg-gray-100 text-gray-700"}>
                {((si as any).status || "draft").charAt(0).toUpperCase() +
                  ((si as any).status || "draft").slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{(si as any).serviceDescription}</p>
          </CardContent>
        </Card>

        {/* Client & Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client Name</span>
                <span className="font-medium">{(si as any).clientName || "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issue Date</span>
                <span>{fmt((si as any).issueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date</span>
                <span>{fmt((si as any).dueDate)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        {items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Service Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Description</th>
                      <th className="text-right py-2 px-4 font-medium text-muted-foreground">Qty</th>
                      <th className="text-right py-2 px-4 font-medium text-muted-foreground">Unit Price</th>
                      <th className="text-right py-2 pl-4 font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any, i: number) => (
                      <tr key={item.id || i} className="border-b last:border-0">
                        <td className="py-2 pr-4">{item.description}</td>
                        <td className="text-right py-2 px-4">{item.quantity}</td>
                        <td className="text-right py-2 px-4">{format(item.unitPrice)}</td>
                        <td className="text-right py-2 pl-4">{format(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(si as any).taxAmount > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{format((si as any).taxAmount)}</span>
                </div>
                <Separator />
              </>
            )}
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>{format((si as any).total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {(si as any).notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(si as any).notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
