import { useRoute, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
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
  Edit,
  Printer,
  Check,
  Trash2,
  Star,
  Calendar,
  DollarSign,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrencySettings } from "@/lib/currency";
import { handleDelete } from "@/lib/actions";
import { RichTextDisplay } from "@/components/RichTextEditor";
import { FileText, Scale } from "lucide-react";
import { trpc } from "@/lib/trpc";
import mutateAsync from "@/lib/mutationHelpers";
import { toast } from "sonner";
import { useAuthWithPersistence } from "@/_core/hooks/useAuthWithPersistence";
import { APP_TITLE } from "@/const";
import { useFavorite } from "@/hooks/useFavorite";

export default function EstimateDetails() {
  const [, params] = useRoute("/estimates/:id");
  const [, navigate] = useLocation();
  const estimateId = params?.id || "";
  const utils = trpc.useUtils();
  const { user } = useAuthWithPersistence();

  const { data: estimateData, isLoading } = trpc.estimates.getWithItems.useQuery(estimateId);
  const { isStarred, toggleStar } = useFavorite("estimate", estimateId, estimateData?.estimateNumber);
  const { data: clientsData = [] } = trpc.clients.list.useQuery();
  const { data: rawCompanyInfo } = trpc.settings.getCompanyInfo.useQuery();
  const { data: bankPayData } = trpc.settings.getByCategory.useQuery({ category: "payment_bank" });
  const { data: mpesaPayData } = trpc.settings.getByCategory.useQuery({ category: "payment_mpesa" });
  const { data: invoiceSettingsData } = trpc.settings.getByCategory.useQuery({ category: "invoice_settings" });
  const { data: docTemplatesData } = trpc.settings.getByCategory.useQuery({ category: "document_templates" });
  const { code: currencyCode } = useCurrencySettings();

  // Convert frozen Drizzle objects to plain objects to avoid React error #306
  const clientsDataPlain = clientsData ? JSON.parse(JSON.stringify(clientsData)) : [];
  const estimateDataPlain = estimateData ? JSON.parse(JSON.stringify(estimateData)) : null;
  const companyInfo = rawCompanyInfo ? JSON.parse(JSON.stringify(rawCompanyInfo)) : null;

  const approveMutation = trpc.approvals.approveEstimate.useMutation({
    onSuccess: () => {
      toast.success("Estimate approved successfully");
      utils.estimates.getWithItems.invalidate(estimateId);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.estimates.delete.useMutation({
    onSuccess: () => {
      toast.success("Estimate deleted successfully");
      utils.estimates.list.invalidate();
      navigate("/estimates");
    },
    onError: (err) => toast.error(err?.message || "Failed to delete estimate"),
  });

  const client = estimateDataPlain ? (clientsDataPlain as any[]).find((c: any) => c.id === (estimateDataPlain as any).clientId) : null;

  const estimate = estimateDataPlain ? {
    id: estimateId,
    estimateNumber: (estimateDataPlain as any).estimateNumber || `EST-${estimateId.slice(0, 8)}`,
    status: (estimateDataPlain as any).status || "draft",
    issueDate: (estimateDataPlain as any).issueDate ? new Date((estimateDataPlain as any).issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    client: {
      name: client?.companyName || "Unknown Client",
      email: client?.email || "",
      address: client?.address || "",
    },
    items: (estimateDataPlain as any).lineItems || (estimateDataPlain as any).items || [],
    subtotal: ((estimateDataPlain as any).subtotal || 0) / 100,
    tax: ((estimateDataPlain as any).taxAmount || 0) / 100,
    total: ((estimateDataPlain as any).total || 0) / 100,
  } : null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = generateDocumentHTML({
      documentType: 'estimate',
      documentNumber: estimate?.estimateNumber || 'N/A',
      documentDate: estimate?.issueDate || 'N/A',
      companyName: companyInfo?.companyName,
      companyLogo: companyInfo?.companyLogo,
      companyPhone: companyInfo?.companyPhone,
      companyEmail: companyInfo?.companyEmail,
      companyWebsite: companyInfo?.companyWebsite,
      companyAddress: companyInfo?.companyAddress,
      clientName: estimate?.client?.name || 'Client',
      clientEmail: estimate?.client?.email || 'Email',
      clientPhone: estimate?.client?.phone || 'Phone',
      clientAddress: estimate?.client?.address || 'Address',
      items: Array.isArray(estimate?.items) ? estimate.items.map((item: any) => ({
        description: item.description || '',
        quantity: item.quantity || 0,
        unitPrice: (item.unitPrice || 0) / 100,
        total: (item.total || 0) / 100,
      })) : [],
      subtotal: (estimate?.subtotal || 0),
      tax: (estimate?.tax || 0),
      total: (estimate?.total || 0),
      taxType: (estimate as any)?.taxType || 'exclusive',
      notes: estimate?.notes,
      termsAndConditions: invoiceSettingsData?.termsAndConditions || (estimate as any)?.termsAndConditions || '',
      bankDetailsHtml: bankPayData?.enabled === 'true' ? bankPayData?.details : undefined,
      bankName: undefined,
      mpesaPaybill: mpesaPayData?.enabled === 'true' ? mpesaPayData?.paybillNumber : undefined,
      mpesaAccountNumber: mpesaPayData?.enabled === 'true' ? mpesaPayData?.paybillNumber : undefined,
      customTemplateHtml: docTemplatesData?.estimate || undefined,
    });

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (isLoading) return <ModuleLayout title="Estimate Details" icon={<FileText className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Estimates", href: "/estimates"}, {label: "Details"}]} backLink={{label: "Estimates", href: "/estimates"}}><div className="p-8 text-center">Loading...</div></ModuleLayout>;
  if (!estimate) return <ModuleLayout title="Estimate Details" icon={<FileText className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Estimates", href: "/estimates"}, {label: "Details"}]} backLink={{label: "Estimates", href: "/estimates"}}><div className="p-8 text-center">Not found</div></ModuleLayout>;

  const fmtAmt = (v: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: currencyCode }).format(v);

  const canApprove = (user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'accountant') && estimate.status === 'draft';

  return (
    <ModuleLayout title="Estimate Details" icon={<FileText className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Estimates", href: "/estimates"}, {label: "Details"}]} backLink={{label: "Estimates", href: "/estimates"}}>
      <div className="space-y-4">
        {/* Action bar */}
        <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={toggleStar}><Star className={`h-4 w-4 ${isStarred ? "fill-amber-400 text-amber-400" : ""}`} /></Button>
            {canApprove && <Button variant="ghost" size="icon" onClick={() => approveMutation.mutate({ id: estimate.id })}><Check className="h-4 w-4" /></Button>}
            <Button variant="ghost" size="icon" onClick={handlePrint}><Printer className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => navigate(`/estimates/${estimateId}/edit`)}><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(estimateId, "estimate", () => mutateAsync(deleteMutation, estimateId))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>

        {/* Split Layout */}
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="w-[320px] min-w-[320px] space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h2 className="text-xl font-bold">{estimate?.estimateNumber}</h2>
                  <p className="text-sm text-muted-foreground">Quotation</p>
                </div>
                <Badge>{estimate?.status?.toUpperCase() || "DRAFT"}</Badge>
                <Separator />
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Client</p>
                      <p className="font-medium">{estimate?.client?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Issue Date</p>
                      <p className="font-medium">{estimate?.issueDate}</p>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Financial Summary</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{fmtAmt(estimate.subtotal || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{fmtAmt(estimate.tax || 0)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>{fmtAmt(estimate.total || 0)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Content */}
          <div className="flex-1 min-w-0">
            <Tabs defaultValue="items" className="space-y-4">
              <TabsList>
                <TabsTrigger value="items">Line Items</TabsTrigger>
                <TabsTrigger value="notes">Notes & Terms</TabsTrigger>
              </TabsList>
              <TabsContent value="items">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Quotation Details</CardTitle>
                      <p className="text-sm text-muted-foreground">Bill To: {estimate?.client?.name} — {estimate?.client?.address}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(estimate?.items) && estimate.items.map((item: any, i: number) => (
                          <TableRow key={item.id || `est-item-${i}`}>
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
                {estimate?.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RichTextDisplay html={estimate.notes} />
                    </CardContent>
                  </Card>
                )}
                {(estimate as any)?.termsAndConditions && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Scale className="h-5 w-5" />
                        Terms & Conditions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RichTextDisplay html={(estimate as any).termsAndConditions} />
                    </CardContent>
                  </Card>
                )}
                {!estimate?.notes && !(estimate as any)?.termsAndConditions && (
                  <p className="text-muted-foreground text-sm py-4">No notes or terms added.</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
