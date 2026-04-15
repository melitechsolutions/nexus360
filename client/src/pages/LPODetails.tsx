import { useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useCurrencySettings } from "@/lib/currency";
import {
  ArrowLeft,
  Building2,
  Coins,
  Edit2,
  Loader2,
  ShoppingCart,
  StickyNote,
  Truck,
} from "lucide-react";

export default function LPODetails() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { code: currencyCode } = useCurrencySettings();

  const { data: lpo, isLoading } = trpc.lpo.getById.useQuery(params.id!, {
    enabled: !!params.id,
  });

  const { data: suppliers = [] } = trpc.suppliers.list.useQuery({ limit: 100 });

  const vendorName = useMemo(() => {
    if (!lpo?.vendorId) return "—";
    const supplier = suppliers.find((s: any) => s.id === lpo.vendorId);
    return supplier?.companyName || supplier?.name || lpo.vendorId;
  }, [lpo?.vendorId, suppliers]);

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    submitted: "bg-blue-100 text-blue-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    received: "bg-purple-100 text-purple-800",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lpo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">LPO not found</p>
        <Button variant="outline" onClick={() => setLocation("/lpos")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to LPOs
        </Button>
      </div>
    );
  }

  return (
    <ModuleLayout
      title={`LPO ${lpo.lpoNumber || ""}`}
      description="Local Purchase Order Details"
      icon={<ShoppingCart className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "LPOs", href: "/lpos" },
        { label: lpo.lpoNumber || "Details" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/lpos")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button onClick={() => setLocation(`/lpos/${params.id}/edit`)}>
            <Edit2 className="w-4 h-4 mr-2" /> Edit
          </Button>
        </div>
      }
    >
      <div className="max-w-4xl space-y-6">
        {/* Status Banner */}
        <div className="flex items-center justify-between">
          <Badge className={`text-sm px-3 py-1 ${statusColors[lpo.status] || ""}`}>
            {lpo.status?.toUpperCase()}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Created {new Date(lpo.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Order Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Order Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">LPO Number</p>
                <p className="font-medium">{lpo.lpoNumber || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendor</p>
                <p className="font-medium">{vendorName}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Details */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="w-4 h-4 text-green-600" />
              Financial Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-medium text-lg">
                  {lpo.amount
                    ? new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(lpo.amount / 100)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{lpo.status || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Details */}
        {(lpo.deliveryDate || lpo.deliveryLocation || lpo.requestedBy) && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="w-4 h-4 text-orange-600" />
                Delivery Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {lpo.deliveryDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Date</p>
                    <p className="font-medium">{new Date(lpo.deliveryDate).toLocaleDateString()}</p>
                  </div>
                )}
                {lpo.deliveryLocation && (
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Location</p>
                    <p className="font-medium">{lpo.deliveryLocation}</p>
                  </div>
                )}
                {lpo.requestedBy && (
                  <div>
                    <p className="text-sm text-muted-foreground">Requested By</p>
                    <p className="font-medium">{lpo.requestedBy}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description & Notes */}
        {(lpo.description || lpo.notes) && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-purple-600" />
                Description & Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lpo.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Description</p>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: lpo.description }}
                  />
                </div>
              )}
              {lpo.description && lpo.notes && <Separator />}
              {lpo.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: lpo.notes }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
