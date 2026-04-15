import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Edit, Download, Trash2, FileMinus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

export default function DebitNoteDetails() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: debitNote, isLoading } = trpc.debitNotes.get.useQuery({ id: id || "" }, { enabled: !!id });

  const deleteMutation = trpc.debitNotes.delete.useMutation({
    onSuccess: () => {
      toast.success("Debit note deleted");
      navigate("/debit-notes");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Spinner /></div>;
  }

  if (!debitNote) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">Debit note not found</p>
        <Button variant="outline" onClick={() => navigate("/debit-notes")}>Back to Debit Notes</Button>
      </div>
    );
  }

  const dn = debitNote as any;

  const statusColor = (status: string) =>
    status === "draft" ? "secondary" : status === "approved" ? "default" : "outline";

  return (
    <ModuleLayout
      title={dn.debitNoteNumber || "Debit Note"}
      icon={<FileMinus className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Accounting", href: "/accounting" },
        { label: "Debit Notes", href: "/debit-notes" },
        { label: dn.debitNoteNumber || "Details" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/debit-notes")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/debit-notes/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Delete this debit note?")) deleteMutation.mutate({ id: id! });
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      }
    >
      <div className="max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Debit Note Details</CardTitle>
              <Badge variant={statusColor(dn.status)}>{dn.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Debit Note Number</p>
                <p className="font-semibold">{dn.debitNoteNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Issue Date</p>
                <p className="font-semibold">{dn.issueDate ? new Date(dn.issueDate).toLocaleDateString() : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Supplier</p>
                <p className="font-semibold">{dn.supplierName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reason</p>
                <p className="font-semibold capitalize">{(dn.reason || "").replace(/-/g, " ")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {dn.items && dn.items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dn.items.map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">KES {Number(item.unitPrice).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">KES {Number(item.total).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Separator className="my-4" />
              <div className="text-right text-lg font-bold">
                Total: KES {Number(dn.total).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        )}

        {dn.notes && (
          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{dn.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
