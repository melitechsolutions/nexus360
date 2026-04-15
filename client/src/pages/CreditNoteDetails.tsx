import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Edit, Trash2, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

export default function CreditNoteDetails() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: creditNote, isLoading } = trpc.creditNotes.get.useQuery({ id: id || "" }, { enabled: !!id });

  const deleteMutation = trpc.creditNotes.delete.useMutation({
    onSuccess: () => {
      toast.success("Credit note deleted");
      navigate("/credit-notes");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Spinner /></div>;
  }

  if (!creditNote) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">Credit note not found</p>
        <Button variant="outline" onClick={() => navigate("/credit-notes")}>Back to Credit Notes</Button>
      </div>
    );
  }

  const cn = creditNote as any;

  const statusColor = (status: string) =>
    status === "draft" ? "secondary" : status === "approved" ? "default" : status === "applied" ? "outline" : "destructive";

  return (
    <ModuleLayout
      title={cn.creditNoteNumber || "Credit Note"}
      icon={<FileText className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Accounting", href: "/accounting" },
        { label: "Credit Notes", href: "/credit-notes" },
        { label: cn.creditNoteNumber || "Details" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/credit-notes")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/credit-notes/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Delete this credit note?")) deleteMutation.mutate({ id: id! });
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
              <CardTitle>Credit Note Details</CardTitle>
              <Badge variant={statusColor(cn.status)}>{cn.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Credit Note Number</p>
                <p className="font-semibold">{cn.creditNoteNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Issue Date</p>
                <p className="font-semibold">{cn.issueDate ? new Date(cn.issueDate).toLocaleDateString() : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Client</p>
                <p className="font-semibold">{cn.clientName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reason</p>
                <p className="font-semibold capitalize">{(cn.reason || "").replace(/-/g, " ")}</p>
              </div>
              {cn.invoiceId && (
                <div>
                  <p className="text-xs text-muted-foreground">Related Invoice</p>
                  <p className="font-semibold">{cn.invoiceId}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {cn.items && cn.items.length > 0 && (
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
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cn.items.map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">KES {(Number(item.rate) / 100).toLocaleString()}</TableCell>
                      <TableCell className="text-right">KES {(Number(item.taxAmount) / 100).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">KES {(Number(item.amount) / 100).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Separator className="my-4" />
              <div className="space-y-1 text-right">
                <p className="text-sm text-muted-foreground">Subtotal: KES {(Number(cn.subtotal) / 100).toLocaleString()}</p>
                {cn.taxAmount > 0 && <p className="text-sm text-muted-foreground">Tax: KES {(Number(cn.taxAmount) / 100).toLocaleString()}</p>}
                <p className="text-lg font-bold">Total: KES {(Number(cn.total) / 100).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {cn.notes && (
          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{cn.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
