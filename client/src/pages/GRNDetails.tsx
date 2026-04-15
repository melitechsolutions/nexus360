import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useCurrencySettings } from "@/lib/currency";
import {
  ArrowLeft,
  Calendar,
  Coins,
  Loader2,
  Package,
  StickyNote,
} from "lucide-react";

export default function GRNDetails() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { code: currencyCode } = useCurrencySettings();

  const { data: grn, isLoading } = trpc.grn.getById.useQuery(params.id!, {
    enabled: !!params.id,
  });

  const statusColors: Record<string, string> = {
    accepted: "bg-green-100 text-green-800",
    partial: "bg-yellow-100 text-yellow-800",
    rejected: "bg-red-100 text-red-800",
    pending: "bg-gray-100 text-gray-800",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!grn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">GRN not found</p>
        <Button variant="outline" onClick={() => setLocation("/grn")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to GRNs
        </Button>
      </div>
    );
  }

  return (
    <ModuleLayout
      title={`GRN ${grn.grnNo || ""}`}
      description="Goods Receipt Note Details"
      icon={<Package className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Procurement", href: "/procurement" },
        { label: "GRNs", href: "/grn" },
        { label: grn.grnNo || "Details" },
      ]}
      actions={
        <Button variant="outline" onClick={() => setLocation("/grn")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      }
    >
      <div className="max-w-4xl space-y-6">
        {/* Status Banner */}
        <div className="flex items-center justify-between">
          <Badge className={`text-sm px-3 py-1 ${statusColors[grn.status] || "bg-gray-100 text-gray-800"}`}>
            {grn.status?.toUpperCase()}
          </Badge>
          {grn.createdAt && (
            <span className="text-sm text-muted-foreground">
              Created {new Date(grn.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Receipt Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              Receipt Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">GRN Number</p>
                <p className="font-medium">{grn.grnNo || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Supplier</p>
                <p className="font-medium">{grn.supplier || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Invoice Number</p>
                <p className="font-medium">{grn.invNo || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Items Received</p>
                <p className="font-medium">{grn.items ?? "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial & Date */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="w-4 h-4 text-green-600" />
              Value & Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Value</p>
                <p className="font-medium text-lg">
                  {grn.value
                    ? new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(grn.value / 100)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Received Date</p>
                <p className="font-medium">
                  {grn.receivedDate ? new Date(grn.receivedDate).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {grn.notes && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-purple-600" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: grn.notes }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
