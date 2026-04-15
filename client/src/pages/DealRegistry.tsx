import React from "react";
import { FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DealRegistry() {
  const dealsQuery = trpc.opportunities.list.useQuery({ limit: 50 });
  const deals = dealsQuery.data ? JSON.parse(JSON.stringify(dealsQuery.data)) : [];

  const totalValue = deals.reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0);
  const activeDeals = deals.filter((d: any) => d.status && d.status !== "closed_lost" && d.status !== "lost");

  return (
    <ModuleLayout
      title="Deal Registry"
      icon={<FileText className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Sales" }, { label: "Deal Registry" }]}
    >
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Deals</p>
            <p className="text-2xl font-bold">{deals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Active Deals</p>
            <p className="text-2xl font-bold">{activeDeals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Pipeline Value</p>
            <p className="text-2xl font-bold">${(totalValue / 100).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Close Rate</p>
            <p className="text-2xl font-bold">
              {deals.length > 0
                ? ((deals.filter((d: any) => d.status === "closed_won" || d.status === "won").length / deals.length) * 100).toFixed(0)
                : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Deals</CardTitle>
        </CardHeader>
        <CardContent>
          {deals.length > 0 ? (
            <div className="space-y-3">
              {deals.map((deal: any) => (
                <div key={deal.id} className="p-4 bg-muted/50 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-bold">{deal.name || deal.title || `Deal #${deal.proposalNumber}`}</p>
                    <p className="text-sm text-muted-foreground">{deal.clientName || deal.contactName || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-purple-600">${((Number(deal.amount) || 0) / 100).toLocaleString()}</p>
                    <Badge variant={deal.status === "closed_won" || deal.status === "won" ? "default" : deal.status === "closed_lost" || deal.status === "lost" ? "destructive" : "secondary"}>
                      {deal.status || "Unknown"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No deals found — create opportunities to populate the deal registry</p>
          )}
        </CardContent>
      </Card>
    </ModuleLayout>
  );
}
