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
  Calendar,
  Coins,
  FileText,
  Loader2,
  StickyNote,
} from "lucide-react";

export default function ContractDetails() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { code: currencyCode } = useCurrencySettings();

  const { data: contract, isLoading } = trpc.contracts.getById.useQuery(params.id!, {
    enabled: !!params.id,
  });

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    active: "bg-green-100 text-green-800",
    expired: "bg-orange-100 text-orange-800",
    terminated: "bg-red-100 text-red-800",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Contract not found</p>
        <Button variant="outline" onClick={() => setLocation("/contracts")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Contracts
        </Button>
      </div>
    );
  }

  return (
    <ModuleLayout
      title={contract.name || "Contract Details"}
      description={`Contract #${contract.contractNumber || contract.id?.slice(0, 8)}`}
      icon={<FileText className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Contracts", href: "/contracts" },
        { label: contract.name || "Details" },
      ]}
      actions={
        <Button variant="outline" onClick={() => setLocation("/contracts")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      }
    >
      <div className="max-w-4xl space-y-6">
        {/* Status Banner */}
        <div className="flex items-center justify-between">
          <Badge className={`text-sm px-3 py-1 ${statusColors[contract.status] || ""}`}>
            {contract.status?.toUpperCase()}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Created {new Date(contract.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Contract Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Contract Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Contract Name</p>
                <p className="font-medium">{contract.name || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contract Number</p>
                <p className="font-medium">{contract.contractNumber || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendor</p>
                <p className="font-medium">{contract.vendor || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contract Type</p>
                <p className="font-medium">{contract.contractType || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule & Value */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-600" />
              Schedule & Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">
                  {contract.startDate ? new Date(contract.startDate).toLocaleDateString() : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">
                  {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contract Value</p>
                <p className="font-medium text-lg">
                  {contract.value
                    ? new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(contract.value / 100)
                    : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description & Notes */}
        {(contract.description || contract.notes) && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-purple-600" />
                Description & Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contract.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Description</p>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: contract.description }}
                  />
                </div>
              )}
              {contract.description && contract.notes && <Separator />}
              {contract.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: contract.notes }}
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
