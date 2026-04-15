import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Package,
  StickyNote,
  Truck,
} from "lucide-react";

export default function DeliveryNoteDetails() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: dn, isLoading } = trpc.deliveryNotes.getById.useQuery(params.id!, {
    enabled: !!params.id,
  });

  const statusColors: Record<string, string> = {
    pending: "bg-gray-100 text-gray-800",
    partial: "bg-yellow-100 text-yellow-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    in_transit: "bg-blue-100 text-blue-800",
    partially_delivered: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-800",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!dn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Delivery note not found</p>
        <Button variant="outline" onClick={() => setLocation("/delivery-notes")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Delivery Notes
        </Button>
      </div>
    );
  }

  return (
    <ModuleLayout
      title={`DN ${dn.dnNo || ""}`}
      description="Delivery Note Details"
      icon={<Truck className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Procurement", href: "/procurement" },
        { label: "Delivery Notes", href: "/delivery-notes" },
        { label: dn.dnNo || "Details" },
      ]}
      actions={
        <Button variant="outline" onClick={() => setLocation("/delivery-notes")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      }
    >
      <div className="max-w-4xl space-y-6">
        {/* Status Banner */}
        <div className="flex items-center justify-between">
          <Badge className={`text-sm px-3 py-1 ${statusColors[dn.status] || "bg-gray-100 text-gray-800"}`}>
            {dn.status?.replace(/_/g, " ").toUpperCase()}
          </Badge>
          {dn.createdAt && (
            <span className="text-sm text-muted-foreground">
              Created {new Date(dn.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Delivery Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              Delivery Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">DN Number</p>
                <p className="font-medium">{dn.dnNo || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Supplier</p>
                <p className="font-medium">{dn.supplier || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order ID</p>
                <p className="font-medium">{dn.orderId || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Items</p>
                <p className="font-medium">{dn.items ?? "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-600" />
              Delivery Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Expected Delivery Date</p>
                <p className="font-medium">
                  {dn.deliveryDate ? new Date(dn.deliveryDate).toLocaleDateString() : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{dn.status?.replace(/_/g, " ") || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {dn.notes && (
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
                dangerouslySetInnerHTML={{ __html: dn.notes }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
