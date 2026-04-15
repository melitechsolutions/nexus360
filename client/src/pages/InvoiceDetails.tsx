import { useRoute, useLocation } from "wouter";
import { useState } from "react";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import { ModuleLayout } from "@/components/ModuleLayout";
import PaymentTracking from "@/components/PaymentTracking";
import { generateDocumentHTML } from "@/lib/documentTemplate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Download,
  Send,
  Edit,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  Check,
  Trash2,
  Star,
  Calendar,
  DollarSign,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import mutateAsync from '@/lib/mutationHelpers';
import { useAuthWithPersistence } from "@/_core/hooks/useAuthWithPersistence";
import { APP_TITLE } from "@/const";
import { useCurrencySettings } from "@/lib/currency";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RichTextDisplay } from "@/components/RichTextEditor";
import { FileText, Scale } from "lucide-react";
import { useFavorite } from "@/hooks/useFavorite";

export default function InvoiceDetails() {
  const [, params] = useRoute("/invoices/:id");
  const [, navigate] = useLocation();
  const invoiceId = params?.id || "";
  const { isStarred, toggleStar } = useFavorite("invoice", invoiceId);
  const utils = trpc.useUtils();
  const { user } = useAuthWithPersistence();
  const { code: currencyCode } = useCurrencySettings();

  const { data: invoiceData, isLoading } = trpc.invoices.getWithItems.useQuery(invoiceId, {
    enabled: !!invoiceId,
  });
  const { data: clientsData = [] } = trpc.clients.list.useQuery();
  const { data: rawCompanyInfo } = trpc.settings.getCompanyInfo.useQuery();
  const { data: bankPayData } = trpc.settings.getByCategory.useQuery({ category: "payment_bank" });
  const { data: mpesaPayData } = trpc.settings.getByCategory.useQuery({ category: "payment_mpesa" });
  const { data: invoiceSettingsData } = trpc.settings.getByCategory.useQuery({ category: "invoice_settings" });
  const { data: docTemplatesData } = trpc.settings.getByCategory.useQuery({ category: "document_templates" });

  // Convert frozen Drizzle objects to plain objects to avoid React error #306
  const clientsDataPlain = clientsData ? JSON.parse(JSON.stringify(clientsData)) : [];
  const invoiceDataPlain = invoiceData ? JSON.parse(JSON.stringify(invoiceData)) : null;
  const companyInfo = rawCompanyInfo ? JSON.parse(JSON.stringify(rawCompanyInfo)) : null;

  const approveMutation = trpc.approvals.approveInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice approved successfully");
      utils.invoices.getWithItems.invalidate(invoiceId);
    },
    onError: (err) => toast.error(err.message),
  });

  const client = invoiceDataPlain ? (clientsDataPlain as any[]).find((c: any) => c.id === (invoiceDataPlain as any).clientId) : null;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteMutation = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      toast.success("Invoice deleted successfully");
      utils.invoices.list.invalidate();
      navigate("/invoices");
    },
    onError: (err) => toast.error(err.message || "Failed to delete invoice"),
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await mutateAsync(deleteMutation, invoiceId);
    } catch (error) {
      // handled by mutation
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const invoice = invoiceDataPlain ? {
    id: invoiceId,
    invoiceNumber: (invoiceDataPlain as any).invoiceNumber || `INV-${invoiceId.slice(0, 8)}`,
    status: (invoiceDataPlain as any).status || "draft",
    issueDate: (invoiceDataPlain as any).issueDate ? new Date((invoiceDataPlain as any).issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    dueDate: (invoiceDataPlain as any).dueDate ? new Date((invoiceDataPlain as any).dueDate).toISOString().split('T')[0] : "",
    paidDate: (invoiceDataPlain as any).paidDate ? new Date((invoiceDataPlain as any).paidDate).toISOString().split('T')[0] : "",
    client: {
      name: client?.companyName || "Unknown Client",
      email: client?.email || "",
      phone: client?.phone || "",
      address: client?.address || "",
    },
    items: (invoiceDataPlain as any).lineItems || (invoiceDataPlain as any).items || [],
    subtotal: ((invoiceDataPlain as any).subtotal || 0) / 100,
    tax: ((invoiceDataPlain as any).taxAmount || 0) / 100,
    total: ((invoiceDataPlain as any).total || 0) / 100,
    notes: (invoiceDataPlain as any).notes || "",
  } : null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = generateDocumentHTML({
      documentType: 'invoice',
      documentNumber: invoice?.invoiceNumber || 'N/A',
      documentDate: invoice?.issueDate || 'N/A',
      dueDate: invoice?.dueDate,
      companyName: companyInfo?.companyName,
      companyLogo: companyInfo?.companyLogo,
      companyPhone: companyInfo?.companyPhone,
      companyEmail: companyInfo?.companyEmail,
      companyWebsite: companyInfo?.companyWebsite,
      companyAddress: companyInfo?.companyAddress,
      clientName: invoice?.client?.name || 'Client',
      clientEmail: invoice?.client?.email || 'Email',
      clientPhone: invoice?.client?.phone || 'Phone',
      clientAddress: invoice?.client?.address || 'Address',
      items: Array.isArray(invoice?.items) ? invoice.items.map((item: any) => ({
        description: item.description || '',
        quantity: item.quantity || 0,
        unitPrice: (item.unitPrice || 0) / 100,
        total: (item.total || 0) / 100,
      })) : [],
      subtotal: (invoice?.subtotal || 0),
      tax: (invoice?.tax || 0),
      total: (invoice?.total || 0),
      taxType: (invoice as any)?.taxType || 'exclusive',
      notes: invoice?.notes,
      termsAndConditions: invoiceSettingsData?.termsAndConditions || (invoice as any)?.termsAndConditions || '',
      bankDetailsHtml: bankPayData?.enabled === 'true' ? bankPayData?.details : undefined,
      bankName: undefined,
      mpesaPaybill: mpesaPayData?.enabled === 'true' ? mpesaPayData?.paybillNumber : undefined,
      mpesaAccountNumber: mpesaPayData?.enabled === 'true' ? mpesaPayData?.paybillNumber : undefined,
      customTemplateHtml: docTemplatesData?.invoice || undefined,
    });

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (isLoading) return <ModuleLayout title="Invoice Details" icon={<FileText className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Invoices", href: "/invoices"}, {label: "Details"}]} backLink={{label: "Invoices", href: "/invoices"}}><div className="p-8 text-center">Loading...</div></ModuleLayout>;
  if (!invoice) return <ModuleLayout title="Invoice Details" icon={<FileText className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Invoices", href: "/invoices"}, {label: "Details"}]} backLink={{label: "Invoices", href: "/invoices"}}><div className="p-8 text-center">Not found</div></ModuleLayout>;

  const canApprove = (user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'accountant') && invoice.status === 'draft';
  const fmtAmt = (v: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: currencyCode }).format(v);

  const statusColor: Record<string, string> = { paid: "bg-green-100 text-green-800", draft: "bg-gray-100 text-gray-800", sent: "bg-blue-100 text-blue-800", overdue: "bg-red-100 text-red-800", partial: "bg-yellow-100 text-yellow-800" };

  return (
    <>
      <ModuleLayout title="Invoice Details" icon={<FileText className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Invoices", href: "/invoices"}, {label: "Details"}]} backLink={{label: "Invoices", href: "/invoices"}}>
      <div className="space-y-4">
        {/* Action bar */}
        <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleStar}><Star className={`h-4 w-4 ${isStarred ? "fill-amber-400 text-amber-400" : ""}`} /></Button>
            {canApprove && <Button size="sm" onClick={() => approveMutation.mutate({ id: invoice.id })}><Check className="mr-1 h-4 w-4" />Approve</Button>}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrint}><Printer className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/invoices/${invoiceId}/edit`)}><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setShowDeleteModal(true)}><Trash2 className="h-4 w-4" /></Button>
        </div>

        {/* Split Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT SIDEBAR */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold">{invoice.invoiceNumber}</h2>
                  <Badge className={statusColor[invoice.status] || ""}>{(invoice.status || "pending").toUpperCase()}</Badge>
                </div>
                <Separator />
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs">Client</p>
                      <p className="font-medium">{invoice.client?.name || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs">Issue Date</p>
                      <p>{invoice.issueDate || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs">Due Date</p>
                      <p>{invoice.dueDate || "—"}</p>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{fmtAmt(invoice.subtotal || 0)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax</span><span>{fmtAmt(invoice.tax || 0)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-bold"><span>Total</span><span>{fmtAmt(invoice.total || 0)}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT CONTENT */}
          <div className="flex-1 min-w-0">
            <Tabs defaultValue="items" className="space-y-4">
              <TabsList>
                <TabsTrigger value="items">Line Items</TabsTrigger>
                <TabsTrigger value="notes">Notes & Terms</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
              </TabsList>

              <TabsContent value="items">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {Array.isArray(invoice?.items) && invoice.items.map((item: any, i: number) => (
                          <TableRow key={item.id || `inv-item-${i}`}>
                            <TableCell>{item?.description || "N/A"}</TableCell>
                            <TableCell className="text-right">{item?.quantity || 0}</TableCell>
                            <TableCell className="text-right">{fmtAmt((item?.unitPrice || 0) / 100)}</TableCell>
                            <TableCell className="text-right">{fmtAmt((item?.total || 0) / 100)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes">
                {invoice.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RichTextDisplay html={invoice.notes} />
                    </CardContent>
                  </Card>
                )}
                {(invoice as any).termsAndConditions && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Scale className="h-5 w-5" />
                        Terms & Conditions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RichTextDisplay html={(invoice as any).termsAndConditions} />
                    </CardContent>
                  </Card>
                )}
                {!invoice.notes && !(invoice as any).termsAndConditions && (
                  <p className="text-muted-foreground text-sm py-4">No notes or terms added.</p>
                )}
              </TabsContent>

              <TabsContent value="payments">
                <PaymentTracking
                  invoiceId={invoiceId}
                  invoiceTotal={Math.round(invoice.total * 100)}
                  invoiceStatus={invoice.status}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      </ModuleLayout>
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete Invoice"
        description="Are you sure you want to delete this invoice? This action cannot be undone."
      />
    </>
  );
}
