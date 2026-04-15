import React from "react";
import { ShoppingCart } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ApiMarketplace() {
  const marketplaceQuery = trpc.apiMonetization.listApiMarketplace.useQuery({ limit: 20 });
  const dashboardQuery = trpc.apiMonetization.getMonetizationDashboard.useQuery({});

  const marketplace = marketplaceQuery.data ? JSON.parse(JSON.stringify(marketplaceQuery.data)) : null;
  const dashboard = dashboardQuery.data ? JSON.parse(JSON.stringify(dashboardQuery.data)) : null;

  const apis = marketplace?.apis || [];

  return (
    <ModuleLayout
      title="API Marketplace"
      icon={<ShoppingCart className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Developer" }, { label: "API Marketplace" }]}
    >
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total APIs</p>
            <p className="text-2xl font-bold">{marketplace?.totalApis ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Active Configs</p>
            <p className="text-2xl font-bold">{dashboard?.activeApis ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Configs</p>
            <p className="text-2xl font-bold">{dashboard?.totalConfigs ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="text-2xl font-bold">{apis.length > 0 ? "Active" : "No APIs"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available APIs</CardTitle>
        </CardHeader>
        <CardContent>
          {apis.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {apis.map((api: any) => (
                <div key={api.id} className="border rounded-lg p-4 hover:shadow-lg transition">
                  <h3 className="font-bold">{api.name}</h3>
                  <Badge variant="outline" className="mt-1">{api.pricingModel}</Badge>
                  <p className="text-lg font-bold text-green-600 my-3">${api.basePrice || "Free"}</p>
                  <Badge variant={api.status === "ACTIVE" ? "default" : "secondary"}>{api.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No APIs configured yet — create API pricing configs to populate the marketplace</p>
          )}
        </CardContent>
      </Card>
    </ModuleLayout>
  );
}
