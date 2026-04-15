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
  MapPin,
  ShoppingCart,
  StickyNote,
  Truck,
} from "lucide-react";

export default function OrderDetails() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { code: currencyCode } = useCurrencySettings();

  const { data: order, isLoading } = trpc.procurementMgmt.orderGetById.useQuery(params.id!, {
    enabled: !!params.id,
  });

  const { data: suppliers = [] } = trpc.suppliers.list.useQuery({ limit: 100 });

  const supplierName = useMemo(() => {
    if (!order?.supplierId) return order?.supplierName || "—";
    const supplier = suppliers.find((s: any) => s.id === order.supplierId);
    return supplier?.companyName || supplier?.name || order.supplierName || "—";
  }, [order?.supplierId, order?.supplierName, suppliers]);

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    sent: "bg-blue-100 text-blue-800",
    confirmed: "bg-green-100 text-green-800",
    delivered: "bg-purple-100 text-purple-800",
    invoiced: "bg-orange-100 text-orange-800",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Order not found</p>
        <Button variant="outline" onClick={() => setLocation("/orders")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <ModuleLayout
      title={`Order ${order.orderNumber || ""}`}
      description="Purchase Order Details"
      icon={<ShoppingCart className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Orders", href: "/orders" },
        { label: order.orderNumber || "Details" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/orders")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button onClick={() => setLocation(`/orders/${params.id}/edit`)}>
            <Edit2 className="w-4 h-4 mr-2" /> Edit
          </Button>
        </div>
      }
    >
      <div className="max-w-4xl space-y-6">
        {/* Status Banner */}
        <div className="flex items-center justify-between">
          <Badge className={`text-sm px-3 py-1 ${statusColors[order.status] || ""}`}>
            {order.status?.toUpperCase()}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Created {new Date(order.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Order Identification */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Order Identification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="font-medium">{order.orderNumber || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Supplier</p>
                <p className="font-medium">{supplierName}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-medium text-lg">
                  {order.totalAmount
                    ? new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(order.totalAmount / 100)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">PO Date</p>
                <p className="font-medium">
                  {order.poDate ? new Date(order.poDate).toLocaleDateString() : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{order.status || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Details */}
        {(order.deliveryDate || order.deliveryAddress) && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="w-4 h-4 text-orange-600" />
                Delivery Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {order.deliveryDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Date</p>
                    <p className="font-medium">{new Date(order.deliveryDate).toLocaleDateString()}</p>
                  </div>
                )}
                {order.deliveryAddress && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Delivery Address</p>
                      <p className="font-medium">{order.deliveryAddress}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description & Notes */}
        {(order.description || order.notes) && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-purple-600" />
                Description & Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Description / Items</p>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: order.description }}
                  />
                </div>
              )}
              {order.description && order.notes && <Separator />}
              {order.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: order.notes }}
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
