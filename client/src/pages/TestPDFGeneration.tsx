import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/DashboardLayout";
import {
  downloadPDF,
  generateInvoicePDF,
  generateQuotationPDF,
  generateReceiptPDF,
} from "@/lib/pdfGenerator";
import { FileText, Receipt, FileCheck } from "lucide-react";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function TestPDFGeneration() {
  const handleGenerateInvoice = () => {
    const invoiceData = {
      invoiceNumber: "INV-2024-001",
      date: "March 15, 2024",
      dueDate: "April 15, 2024",
      client: {
        name: "Acme Corporation",
        email: "john@acmecorp.com",
        phone: "+254 700 123 456",
        address: "Nairobi, Kenya",
      },
      items: [
        {
          description: "Website Design and Development",
          quantity: 1,
          rate: 300000,
          amount: 300000,
        },
        {
          description: "Mobile App Development",
          quantity: 1,
          rate: 500000,
          amount: 500000,
        },
        {
          description: "SEO Optimization",
          quantity: 3,
          rate: 50000,
          amount: 150000,
        },
      ],
      subtotal: 950000,
      tax: 152000,
      total: 1102000,
      notes:
        "Payment is due within 30 days. Please make payment to Melitech Solutions bank account. Thank you for your business!",
    };

    const doc = generateInvoicePDF(invoiceData);
    downloadPDF(doc, `${invoiceData.invoiceNumber}.pdf`);
    toast.success("Invoice PDF generated successfully!");
  };

  const handleGenerateReceipt = () => {
    const receiptData = {
      receiptNumber: "REC-00001",
      date: "March 15, 2024",
      client: {
        name: "Acme Corporation",
        email: "john@acmecorp.com",
      },
      invoiceNumber: "INV-2024-001",
      amount: 1102000,
      paymentMethod: "Bank Transfer",
      notes: "Payment received via bank transfer. Transaction ID: TXN123456789. Thank you!",
    };

    const doc = generateReceiptPDF(receiptData);
    downloadPDF(doc, `${receiptData.receiptNumber}.pdf`);
    toast.success("Receipt PDF generated successfully!");
  };

  const handleGenerateQuotation = () => {
    const quotationData = {
      quotationNumber: "QUOT-2024/03/001",
      date: "March 15, 2024",
      validUntil: "April 15, 2024",
      client: {
        name: "TechStart Solutions",
        email: "sarah@techstart.com",
        phone: "+254 700 234 567",
        address: "Mombasa, Kenya",
      },
      items: [
        {
          description: "E-Commerce Website Development",
          quantity: 1,
          rate: 800000,
          amount: 800000,
        },
        {
          description: "Payment Gateway Integration",
          quantity: 1,
          rate: 150000,
          amount: 150000,
        },
        {
          description: "Mobile App (iOS & Android)",
          quantity: 1,
          rate: 1200000,
          amount: 1200000,
        },
        {
          description: "3 Months Support & Maintenance",
          quantity: 3,
          rate: 50000,
          amount: 150000,
        },
      ],
      subtotal: 2300000,
      tax: 368000,
      total: 2668000,
      terms:
        "1. 50% deposit required to commence work. 2. Balance payable upon project completion. 3. Quotation valid for 30 days. 4. Prices include VAT.",
      notes:
        "This quotation includes full project development, testing, deployment, and 3 months of support. Additional features can be added as per requirement.",
    };

    const doc = generateQuotationPDF(quotationData);
    downloadPDF(doc, `${quotationData.quotationNumber.replace(/\//g, "-")}.pdf`);
    toast.success("Quotation PDF generated successfully!");
  };

  return (
    <ModuleLayout
      title="PDF Generation Test"
      icon={<FileText className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Tools" }, { label: "PDF Generation Test" }]}
    >
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">Generate sample PDFs for invoices, receipts, and quotations</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Invoice PDF
              </CardTitle>
              <CardDescription>Generate a sample invoice document</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGenerateInvoice} className="w-full">
                Generate Invoice
              </Button>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Sample: INV-2024-001</p>
                <p>Client: Acme Corporation</p>
                <p>Amount: Ksh 1,102,000</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-green-500" />
                Receipt PDF
              </CardTitle>
              <CardDescription>Generate a sample receipt document</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGenerateReceipt} className="w-full">
                Generate Receipt
              </Button>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Sample: REC-00001</p>
                <p>Client: Acme Corporation</p>
                <p>Amount: Ksh 1,102,000</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-orange-500" />
                Quotation PDF
              </CardTitle>
              <CardDescription>Generate a sample quotation document</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGenerateQuotation} className="w-full">
                Generate Quotation
              </Button>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Sample: QUOT-2024/03/001</p>
                <p>Client: TechStart Solutions</p>
                <p>Amount: Ksh 2,668,000</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>PDF Features</CardTitle>
            <CardDescription>All PDFs include the following features</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Melitech Solutions branding and logo</li>
              <li>Company contact information</li>
              <li>Client details and contact information</li>
              <li>Itemized list with quantities, rates, and amounts</li>
              <li>Subtotal, tax, and total calculations</li>
              <li>Professional formatting with orange accent color</li>
              <li>Footer with company tagline "Redefining Technology!!!"</li>
              <li>Auto-generated file names based on document numbers</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}

