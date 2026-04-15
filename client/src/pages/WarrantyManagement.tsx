import { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Search, Edit2, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { useRequireFeature } from "@/lib/permissions";
import { trpc } from "@/lib/trpc";

export default function WarrantyManagement() {
  const { allowed, isLoading: permissionLoading } = useRequireFeature("warranty:view");
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const utils = trpc.useUtils();
  const { data: rawData, isLoading: dataLoading } = trpc.warranty.list.useQuery({});
  const warranties = JSON.parse(JSON.stringify(rawData?.data ?? []));
  const deleteMutation = trpc.warranty.delete.useMutation({
    onSuccess: () => { utils.warranty.list.invalidate(); toast.success("Warranty deleted"); },
    onError: (err: any) => toast.error(err.message),
  });

  if (permissionLoading) {
    return <div className="flex items-center justify-center h-screen"><Spinner/></div>;
  }

  if (!allowed) return null;

  const filteredWarranties = warranties.filter((w: any) =>
    (w.product || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.vendor || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColor = (status: string) => {
    return status === "active" ? "default" : status === "expiring_soon" ? "secondary" : "destructive";
  };

  return (
    <ModuleLayout
      title="Warranty Management"
      description="Track product warranties and coverage"
      icon={<Shield className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Warranties" },
      ]}
    >
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Warranties</h2>
            <p className="text-sm text-muted-foreground">Manage product warranties and coverage</p>
          </div>
          <Button onClick={() => navigate("/warranty/create")}><Plus className="h-4 w-4 mr-2" /> Add Warranty</Button>
        </div>

        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search warranties..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Warranty Registry</CardTitle>
            <CardDescription>{filteredWarranties.length} warranties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8"><Spinner /></TableCell></TableRow>
                  ) : filteredWarranties.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No warranties found</TableCell></TableRow>
                  ) : filteredWarranties.map((warranty: any) => (
                    <TableRow key={warranty.id}>
                      <TableCell className="font-medium">{warranty.product}</TableCell>
                      <TableCell>{warranty.vendor}</TableCell>
                      <TableCell>{warranty.coverage}</TableCell>
                      <TableCell>{warranty.expiryDate ? new Date(warranty.expiryDate).toLocaleDateString() : "-"}</TableCell>
                      <TableCell><Badge variant={statusColor(warranty.status || "active")}>{warranty.status || "active"}</Badge></TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/warranty/${warranty.id}`)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/warranty/${warranty.id}/edit`)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteMutation.mutate(warranty.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
