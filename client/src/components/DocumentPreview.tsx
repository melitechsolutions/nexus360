/**
 * Document Preview Component
 * 
 * Displays document preview cards with hover effects and status timeline
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Download, Mail, Eye, MoreVertical } from "lucide-react";
import { useState } from "react";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";

interface DocumentPreviewProps {
  documentType: "invoice" | "receipt" | "estimate";
  documentId: string;
  onPreview?: () => void;
  onDownload?: () => void;
  onEmail?: () => void;
}

export function DocumentPreview({
  documentType,
  documentId,
  onPreview,
  onDownload,
  onEmail,
}: DocumentPreviewProps) {
  // ALL HOOKS MUST BE CALLED BEFORE CONDITIONAL RETURNS
  const { allowed, isLoading } = useRequireFeature("reports:export");
  const { data: preview, isLoading: isLoadingPreview } = trpc.documentManagement.getDocumentPreview.useQuery({
    documentType,
    documentId,
  });
  const [showPreview, setShowPreview] = useState(false);

  // NOW SAFE TO CHECK CONDITIONAL RETURNS (ALL HOOKS ALREADY CALLED)
  if (isLoading) return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  if (!allowed) return null;

  if (isLoadingPreview) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!preview) {
    return null;
  }

  const { document, lineItems, client } = preview;
  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    sent: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    issued: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    overdue: "bg-red-100 text-red-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="group relative">
      <Card className="cursor-pointer hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">
                {documentType === "invoice" && document.invoiceNumber}
                {documentType === "receipt" && document.receiptNumber}
                {documentType === "estimate" && document.estimateNumber}
              </CardTitle>
              <CardDescription className="text-xs">
                {client?.companyName || "Unknown Client"}
              </CardDescription>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[document.status] || "bg-gray-100"}`}>
              {document.status}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-gray-600">Amount</p>
              <p className="font-bold">${parseFloat(document.total || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600">Items</p>
              <p className="font-bold">{lineItems?.length || 0}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowPreview(true);
                onPreview?.();
              }}
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={onDownload}>
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={onEmail}>
              <Mail className="w-4 h-4 mr-1" />
              Email
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {showPreview && (
        <DocumentPreviewModal
          document={preview}
          documentType={documentType}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

interface DocumentPreviewModalProps {
  document: any;
  documentType: string;
  onClose: () => void;
}

function DocumentPreviewModal({ document, documentType, onClose }: DocumentPreviewModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <div>
            <CardTitle>Document Preview</CardTitle>
            <CardDescription>{documentType.toUpperCase()}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <DocumentPreviewContent document={document} />
        </CardContent>
      </Card>
    </div>
  );
}

function DocumentPreviewContent({ document }: any) {
  const { document: doc, lineItems, client } = document;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold mb-2">
          {doc.invoiceNumber || doc.receiptNumber || doc.estimateNumber}
        </h2>
        <p className="text-gray-600">{client?.companyName || "Unknown Client"}</p>
      </div>

      {/* Line Items */}
      {lineItems && lineItems.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Description</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">Unit Price</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item: any) => (
                  <tr key={item.id || item.itemDescription} className="border-b">
                    <td className="py-2">{item.itemDescription}</td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-right">${parseFloat(item.unitPrice || 0).toFixed(2)}</td>
                    <td className="text-right font-semibold">
                      ${parseFloat(item.lineTotal || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="flex justify-end">
        <div className="w-full max-w-xs space-y-2 border-t pt-4">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${(parseFloat(doc.total || 0) - parseFloat(doc.tax || 0)).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax:</span>
            <span>${parseFloat(doc.tax || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total:</span>
            <span>${parseFloat(doc.total || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Status Workflow Timeline
 */
export function StatusWorkflowTimeline({
  documentType,
  currentStatus,
}: {
  documentType: "invoice" | "receipt" | "estimate";
  currentStatus: string;
}) {
  const { data: workflow } = trpc.documentManagement.getDocumentWorkflow.useQuery({
    documentType,
    documentId: "",
  });

  const possibleStatuses = workflow?.[currentStatus] || [];

  const statusIcons: Record<string, string> = {
    draft: "📝",
    sent: "📤",
    paid: "✅",
    issued: "✅",
    overdue: "⏰",
    cancelled: "❌",
    pending: "⏳",
    accepted: "👍",
    rejected: "👎",
    expired: "⏱️",
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{statusIcons[currentStatus]} {currentStatus}</span>
      {possibleStatuses.length > 0 && (
        <>
          <span className="text-gray-300">→</span>
          <div className="flex gap-1">
            {possibleStatuses.map((status: string) => (
              <span key={status} className="text-xs px-2 py-1 bg-gray-100 rounded">
                {statusIcons[status]} {status}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Bulk Document Actions
 */
export function BulkDocumentActions({
  documentType,
  selectedIds,
  onDownload,
  onEmail,
}: {
  documentType: "invoice" | "receipt" | "estimate";
  selectedIds: string[];
  onDownload: (ids: string[]) => void;
  onEmail: (ids: string[]) => void;
}) {
  const { allowed, isLoading } = useRequireFeature("reports:export");
  if (isLoading) return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  if (!allowed) return null;
  const { data: documents, isLoading } = trpc.documentManagement.getDocumentsForBulk.useQuery({
    documentType,
    ids: selectedIds,
  });

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            {selectedIds.length} document{selectedIds.length > 1 ? "s" : ""} selected
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDownload(selectedIds)}
              disabled={isLoading}
            >
              <Download className="w-4 h-4 mr-1" />
              Download All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEmail(selectedIds)}
              disabled={isLoading}
            >
              <Mail className="w-4 h-4 mr-1" />
              Email All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
