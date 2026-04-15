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
  User,
} from "lucide-react";

export default function AssetDetails() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { code: currencyCode } = useCurrencySettings();

  const { data: asset, isLoading } = trpc.assets.getById.useQuery(params.id!, {
    enabled: !!params.id,
  });

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
    maintenance: "bg-yellow-100 text-yellow-800",
    disposed: "bg-red-100 text-red-800",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Asset not found</p>
        <Button variant="outline" onClick={() => setLocation("/assets")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Assets
        </Button>
      </div>
    );
  }

  return (
    <ModuleLayout
      title={asset.name}
      description="Asset Details"
      icon={<Package className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Assets", href: "/assets" },
        { label: asset.name },
      ]}
      actions={
        <Button variant="outline" onClick={() => setLocation("/assets")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      }
    >
      <div className="max-w-4xl space-y-6">
        {/* Status Banner */}
        <div className="flex items-center justify-between">
          <Badge className={`text-sm px-3 py-1 ${statusColors[asset.status] || "bg-gray-100 text-gray-800"}`}>
            {asset.status?.toUpperCase()}
          </Badge>
          {asset.createdAt && (
            <span className="text-sm text-muted-foreground">
              Registered {new Date(asset.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Asset Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              Asset Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Asset Name</p>
                <p className="font-medium">{asset.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium">{asset.category}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{asset.location || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valuation */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="w-4 h-4 text-green-600" />
              Valuation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Asset Value</p>
                <p className="font-medium text-lg">
                  {currencyCode} {((asset.value || 0) / 100).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Purchase Date
                </p>
                <p className="font-medium">
                  {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignment */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-purple-600" />
              Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Assigned To</p>
                <p className="font-medium">{asset.assignedTo || "Unassigned"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Serial Number</p>
                <p className="font-medium">{asset.serialNumber || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {asset.notes && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-orange-600" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{asset.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
