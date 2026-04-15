import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

export default function WarrantyDetails() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: warranty, isLoading } = trpc.warranty.getById.useQuery(id || "", { enabled: !!id });
  const deleteMutation = trpc.warranty.delete.useMutation({
    onSuccess: () => {
      toast.success("Warranty deleted");
      navigate("/warranty");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Spinner /></div>;
  }

  if (!warranty) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">Warranty not found</p>
        <Button variant="outline" onClick={() => navigate("/warranty")}>Back to Warranties</Button>
      </div>
    );
  }

  const w = warranty as any;

  const statusColor = (status: string) =>
    status === "active" ? "default" : status === "expiring_soon" ? "secondary" : "destructive";

  return (
    <ModuleLayout
      title={w.product || "Warranty Details"}
      icon={<Shield className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Warranties", href: "/warranty" },
        { label: w.product || "Details" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/warranty")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/warranty/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Delete this warranty?")) deleteMutation.mutate(id!);
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      }
    >
      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Warranty Information</CardTitle>
              <Badge variant={statusColor(w.status || "active")}>{w.status || "active"}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Product</p>
                <p className="font-semibold">{w.product}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vendor</p>
                <p className="font-semibold">{w.vendor}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Serial Number</p>
                <p className="font-semibold">{w.serialNumber || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expiry Date</p>
                <p className="font-semibold">{w.expiryDate || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Coverage</p>
                <p className="font-semibold">{w.coverage || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {(w.claimTerms || w.notes) && (
          <Card>
            <CardHeader><CardTitle>Additional Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {w.claimTerms && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Claim Terms</p>
                  <p className="text-sm whitespace-pre-wrap">{w.claimTerms}</p>
                </div>
              )}
              {w.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{w.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
