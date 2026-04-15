import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useCurrencySettings } from "@/lib/currency";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Coins,
  FileText,
  Loader2,
  StickyNote,
} from "lucide-react";

export default function QuotationDetails() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { code: currencyCode } = useCurrencySettings();

  const { data: quotation, isLoading } = trpc.quotations.getById.useQuery(params.id!, {
    enabled: !!params.id,
  });

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    submitted: "bg-blue-100 text-blue-800",
    under_review: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Quotation not found</p>
        <Button variant="outline" onClick={() => setLocation("/quotations")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Quotations
        </Button>
      </div>
    );
  }

  return (
    <ModuleLayout
      title={`RFQ ${quotation.rfqNo || ""}`}
      description="Request for Quotation Details"
      icon={<FileText className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Procurement", href: "/procurement" },
        { label: "Quotations", href: "/quotations" },
        { label: quotation.rfqNo || "Details" },
      ]}
      actions={
        <Button variant="outline" onClick={() => setLocation("/quotations")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      }
    >
      <div className="max-w-4xl space-y-6">
        {/* Status Banner */}
        <div className="flex items-center justify-between">
          <Badge className={`text-sm px-3 py-1 ${statusColors[quotation.status] || "bg-gray-100 text-gray-800"}`}>
            {quotation.status?.replace("_", " ").toUpperCase()}
          </Badge>
          {quotation.createdAt && (
            <span className="text-sm text-muted-foreground">
              Created {new Date(quotation.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* RFQ Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              RFQ Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">RFQ Number</p>
                <p className="font-medium">{quotation.rfqNo || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Supplier</p>
                <p className="font-medium">{quotation.supplier || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial & Schedule */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="w-4 h-4 text-green-600" />
              Financial & Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-medium text-lg">
                  {currencyCode} {((quotation.amount || 0) / 100).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Due Date
                </p>
                <p className="font-medium">
                  {quotation.dueDate ? new Date(quotation.dueDate).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        {quotation.description && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-orange-600" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: quotation.description }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
