import { useRoute, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { generateDocumentHTML } from "@/lib/documentTemplate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  MapPin,
  Trash2,
  ChevronRight,
  FileText,
  CreditCard,
  Calendar,
  Hash,
  User,
  Receipt,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import mutateAsync from "@/lib/mutationHelpers";
import { toast } from "sonner";
import { useState } from "react";
import { handleDelete as actionsHandleDelete, handleDownload as actionsHandleDownload, handleEmail as actionsHandleEmail } from "@/lib/actions";

export default function ReceiptDetails() {
  const [, params] = useRoute("/receipts/:id");
  const [, navigate] = useLocation();
  const receiptId = params?.id || "";
  const [kraPIN, setKraPIN] = useState("");

  // Fetch receipt from backend
  const { data: receiptData, isLoading } = trpc.receipts.getById.useQuery(receiptId);
  const { data: lineItemsData = [] } = trpc.lineItems.getByDocumentId.useQuery({ documentId: receiptId, documentType: 'receipt' });
  const { data: clientsData = [] } = trpc.clients.list.useQuery();
  const { data: companyInfo } = trpc.settings.getCompanyInfo.useQuery();
  const { data: bankPayData } = trpc.settings.getByCategory.useQuery({ category: "payment_bank" });
  const { data: mpesaPayData } = trpc.settings.getByCategory.useQuery({ category: "payment_mpesa" });
  const { data: docTemplatesData } = trpc.settings.getByCategory.useQuery({ category: "document_templates" });

  // Get client info
  const client = receiptData ? (clientsData as any[]).find((c: any) => c.id === (receiptData as any).clientId) : null;

  const receipt = receiptData ? {
    id: receiptId,
    receiptNumber: (receiptData as any).receiptNumber || `REC-${receiptId.slice(0, 8)}`,
    status: (receiptData as any).status || "draft",
    issueDate: (receiptData as any).issueDate ? new Date((receiptData as any).issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    paymentMethod: (receiptData as any).paymentMethod || "Unknown",
    referenceNumber: (receiptData as any).referenceNumber || "",
    client: {
      name: client?.companyName || "Unknown Client",
      email: client?.email || "",
      phone: client?.phone || "",
      address: client?.address || "",
    },
    project: (receiptData as any).projectId || "",
    items: lineItemsData && lineItemsData.length > 0 
      ? lineItemsData 
      : (receiptData as any).items || [],
    subtotal: ((receiptData as any).subtotal || 0) / 100,
    tax: ((receiptData as any).tax || 0) / 100,
    discount: 0,
    total: ((receiptData as any).total || 0) / 100,
    notes: (receiptData as any).notes || "",
  } : null;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "received":
        return "default";
      case "pending":
        return "outline";
      case "failed":
        return "destructive";
      case "draft":
        return "secondary";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "received":
        return <CheckCircle2 className="h-3 w-3" />;
      case "pending":
        return <Clock className="h-3 w-3" />;
      case "failed":
        return <AlertCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const handleDownload = () => actionsHandleDownload(receiptId, "receipt", "pdf", receipt);
  const handleEmail = () => actionsHandleEmail(receiptId, "receipt", receipt?.client?.email || "", receipt);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = generateDocumentHTML({
      documentType: 'receipt',
      documentNumber: receipt?.receiptNumber || 'N/A',
      documentDate: receipt?.issueDate || 'N/A',
      kraPIN: kraPIN,
      companyName: companyInfo?.companyName,
      companyLogo: companyInfo?.companyLogo,
      companyPhone: companyInfo?.companyPhone,
      companyEmail: companyInfo?.companyEmail,
      companyWebsite: companyInfo?.companyWebsite,
      companyAddress: companyInfo?.companyAddress,
      clientName: receipt?.client?.name || 'Client',
      clientEmail: receipt?.client?.email || 'Email',
      clientPhone: receipt?.client?.phone || 'Phone',
      clientAddress: receipt?.client?.address || 'Address',
      items: Array.isArray(receipt?.items) ? receipt.items.map((item: any) => ({
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: (item.unitPrice || 0) / 100,
        total: (item.total || 0) / 100,
      })) : [],
      subtotal: (receipt?.subtotal || 0),
      tax: (receipt?.tax || 0),
      total: (receipt?.total || 0),
      taxType: (receipt as any)?.taxType || 'exclusive',
      paymentMethod: receipt?.paymentMethod,
      referenceNumber: receipt?.referenceNumber,
      notes: receipt?.notes,
      termsAndConditions: '',
      bankDetailsHtml: bankPayData?.enabled === 'true' ? bankPayData?.details : undefined,
      bankName: undefined,
      mpesaPaybill: mpesaPayData?.enabled === 'true' ? mpesaPayData?.paybillNumber : undefined,
      mpesaAccountNumber: mpesaPayData?.enabled === 'true' ? mpesaPayData?.paybillNumber : undefined,
      customTemplateHtml: docTemplatesData?.receipt || undefined,
    });

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const utils = trpc.useUtils();
  const deleteMutation = trpc.receipts.delete.useMutation({
    onSuccess: () => {
      toast.success("Receipt deleted successfully");
      utils.receipts.list.invalidate();
      navigate("/receipts");
    },
    onError: (err) => toast.error(err.message || "Failed to delete receipt"),
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
        await mutateAsync(deleteMutation, receiptId);
    } catch (error) {
      // handled by mutation
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) {
    return (
      <ModuleLayout title="Receipt Details" icon={<Receipt className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Receipts", href: "/receipts"}, {label: "Details"}]} backLink={{label: "Receipts", href: "/receipts"}}>
        <div className="flex items-center justify-center h-64">
          <p>Loading receipt...</p>
        </div>
      </ModuleLayout>
    );
  }

  if (!receipt) {
    return (
      <ModuleLayout title="Receipt Details" icon={<Receipt className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Receipts", href: "/receipts"}, {label: "Details"}]} backLink={{label: "Receipts", href: "/receipts"}}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p>Receipt not found</p>
          <Button onClick={() => navigate("/receipts")}>Back to Receipts</Button>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <>
      <ModuleLayout title="Receipt Details" icon={<Receipt className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Receipts", href: "/receipts"}, {label: "Details"}]} backLink={{label: "Receipts", href: "/receipts"}}>
      <div className="space-y-6">
        {/* Action Bar */}
        <div className="flex items-center justify-end gap-2">
            <Button onClick={() => navigate(`/receipts/${receiptId}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="destructive" size="icon" onClick={() => actionsHandleDelete(receiptId, "receipt", () => mutateAsync(deleteMutation, receiptId))}>
              <Trash2 className="h-4 w-4" />
            </Button>
        </div>

        {/* Split Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT SIDEBAR */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-5">
                {/* Receipt Number + Status */}
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-xl font-bold">{receipt.receiptNumber}</h2>
                  </div>
                  <Badge variant={getStatusVariant(receipt.status)} className="gap-1 px-3 py-1">
                    {getStatusIcon(receipt.status)}
                    {receipt.status.toUpperCase()}
                  </Badge>
                </div>

                <Separator />

                {/* Key Fields */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Client</p>
                      <p className="text-sm font-medium truncate">{receipt.client.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm font-medium">{new Date(receipt.issueDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="text-sm font-bold text-green-600">KES {receipt.total.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Payment Method</p>
                      <p className="text-sm font-medium">{receipt.paymentMethod}</p>
                    </div>
                  </div>
                  {receipt.referenceNumber && (
                    <div className="flex items-center gap-3">
                      <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Reference</p>
                        <p className="text-sm font-medium">{receipt.referenceNumber}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* KRA PIN Input */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">KRA PIN</label>
                  <input
                    type="text"
                    placeholder="Enter KRA PIN"
                    value={kraPIN}
                    onChange={(e) => setKraPIN(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Receipt
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={handleEmail}>
                    <Send className="mr-2 h-4 w-4" />
                    Email to Client
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT CONTENT */}
          <div className="flex-1 min-w-0">
            <Tabs defaultValue="items" className="w-full">
              <TabsList>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              {/* Items Tab */}
              <TabsContent value="items" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Line Items</CardTitle>
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
                        {Array.isArray(receipt.items) && receipt.items.length > 0 ? (
                          receipt.items.map((item: any, index: number) => (
                            <TableRow key={item.id || `item-${index}`}>
                              <TableCell>{item?.description || "N/A"}</TableCell>
                              <TableCell className="text-right">{item?.quantity || 0}</TableCell>
                              <TableCell className="text-right">KES {((item?.rate || 0) / 100).toLocaleString()}</TableCell>
                              <TableCell className="text-right font-medium">
                                KES {((item?.amount || 0) / 100).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              No items
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>

                    <Separator className="my-4" />

                    {/* Totals */}
                    <div className="flex justify-end">
                      <div className="w-full max-w-sm space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-medium">KES {(receipt.subtotal || 0).toLocaleString()}</span>
                        </div>
                        {(receipt.tax || 0) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tax (16% VAT)</span>
                            <span className="font-medium">KES {(receipt.tax || 0).toLocaleString()}</span>
                          </div>
                        )}
                        {(receipt.discount || 0) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Discount</span>
                            <span className="font-medium text-green-600">
                              -KES {(receipt.discount || 0).toLocaleString()}
                            </span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total Received</span>
                          <span>KES {(receipt.total || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4">
                {/* Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {receipt.notes || "No notes added."}
                    </p>
                  </CardContent>
                </Card>

                {/* Client Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Received From</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{receipt.client.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {receipt.client.email || "No email"}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {receipt.client.phone || "No phone"}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {receipt.client.address || "No address"}
                    </div>
                  </CardContent>
                </Card>

                {/* Company Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">From</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{companyInfo?.companyName || "Company"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {companyInfo?.companyEmail || ""}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {companyInfo?.companyPhone || ""}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {companyInfo?.companyAddress || ""}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      </ModuleLayout>
    </>
  );
}

