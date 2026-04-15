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
  Coins,
  Edit2,
  Loader2,
  StickyNote,
  User,
  Wallet,
} from "lucide-react";

export default function ImprestDetails() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { code: currencyCode } = useCurrencySettings();

  const { data: imprest, isLoading } = trpc.imprest.getById.useQuery(params.id!, {
    enabled: !!params.id,
  });

  const { data: employees = [] } = trpc.users.list.useQuery({ limit: 100 });

  const { data: surrenders = [] } = trpc.imprestSurrender.list.useQuery(
    { imprestId: params.id! },
    { enabled: !!params.id }
  );

  const employeeName = useMemo(() => {
    if (!imprest?.userId) return "—";
    const emp = employees.find((e: any) => e.id === imprest.userId);
    return emp?.name || imprest.userId;
  }, [imprest?.userId, employees]);

  const totalSurrendered = useMemo(() => {
    return (surrenders as any[]).reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
  }, [surrenders]);

  const statusColors: Record<string, string> = {
    requested: "bg-blue-100 text-blue-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    settled: "bg-purple-100 text-purple-800",
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(v / 100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!imprest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Imprest not found</p>
        <Button variant="outline" onClick={() => setLocation("/imprests")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Imprests
        </Button>
      </div>
    );
  }

  return (
    <ModuleLayout
      title={`Imprest ${imprest.imprestNumber || ""}`}
      description="Imprest Request Details"
      icon={<Wallet className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Imprests", href: "/imprests" },
        { label: imprest.imprestNumber || "Details" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/imprests")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button onClick={() => setLocation(`/imprests/${params.id}/edit`)}>
            <Edit2 className="w-4 h-4 mr-2" /> Edit
          </Button>
        </div>
      }
    >
      <div className="max-w-4xl space-y-6">
        {/* Status Banner */}
        <div className="flex items-center justify-between">
          <Badge className={`text-sm px-3 py-1 ${statusColors[imprest.status] || ""}`}>
            {imprest.status?.toUpperCase()}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Created {new Date(imprest.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Request Details */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              Request Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Imprest Number</p>
                <p className="font-medium">{imprest.imprestNumber || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Employee</p>
                <p className="font-medium">{employeeName}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="w-4 h-4 text-green-600" />
              Financial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-medium text-lg">{fmt(imprest.amount || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Surrendered</p>
                <p className="font-medium text-lg">{fmt(totalSurrendered)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="font-medium text-lg">
                  {fmt((imprest.amount || 0) - totalSurrendered)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purpose & Notes */}
        {imprest.purpose && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-purple-600" />
                Purpose
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: imprest.purpose }}
              />
            </CardContent>
          </Card>
        )}

        {/* Surrender History */}
        {(surrenders as any[]).length > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="w-4 h-4 text-orange-600" />
                Surrender History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(surrenders as any[]).map((s: any, i: number) => (
                  <div key={s.id || i}>
                    {i > 0 && <Separator className="my-3" />}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{fmt(s.amount || 0)}</p>
                        {s.notes && (
                          <div
                            className="text-sm text-muted-foreground prose prose-sm max-w-none mt-1"
                            dangerouslySetInnerHTML={{ __html: s.notes }}
                          />
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {s.surrenderedAt
                          ? new Date(s.surrenderedAt).toLocaleDateString()
                          : s.createdAt
                          ? new Date(s.createdAt).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
