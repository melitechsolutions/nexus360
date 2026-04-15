import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  Download,
  Copy,
  Send,
  CheckCircle,
  XCircle,
  LogIn,
  Trash2,
  Edit,
  AlertCircle,
} from "lucide-react";
import { trpc } from "../utils/trpc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApprovalModal } from "../components/ApprovalModal";
import { formatDate } from "../utils/format";
import { toast } from "sonner";

type QuoteStatus = "draft" | "sent" | "accepted" | "expired" | "declined" | "converted";

interface Quote {
  id: string;
  quoteNumber: string;
  clientId: string;
  subject: string;
  description?: string;
  status: QuoteStatus;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes?: string;
  sentDate?: Date;
  acceptedDate?: Date;
  declinedDate?: Date;
  convertedInvoiceId?: string;
  expirationDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  items: any[];
  logs: any[];
}

interface QuoteDetailsProps {
  id: string;
}

export function QuoteDetails() {
  const [, navigate] = useLocation();
  const params = useParams();
  const quoteId = params?.id || "";

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"send" | "accept" | "decline" | "convert">("send");
  const [approvalReason, setApprovalReason] = useState("");

  const getQuery = trpc.quotes.getById.useQuery(quoteId, { enabled: !!quoteId });
  const sendMutation = trpc.quotes.send.useMutation();
  const acceptMutation = trpc.quotes.accept.useMutation();
  const declineMutation = trpc.quotes.decline.useMutation();
  const convertMutation = trpc.quotes.convertToInvoice.useMutation();
  const duplicateMutation = trpc.quotes.duplicate.useMutation();
  const deleteMutation = trpc.quotes.delete.useMutation();

  useEffect(() => {
    if (getQuery.data) {
      setQuote(getQuery.data);
      setLoading(false);
    }
  }, [getQuery.data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading quote...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Quote not found</p>
        <button
          onClick={() => navigate("/quotes")}
          className="mt-4 text-blue-600 hover:underline"
        >
          Back to quotes
        </button>
      </div>
    );
  }

  const handleApprovalConfirm = async () => {
    try {
      switch (approvalAction) {
        case "send":
          await sendMutation.mutateAsync(quoteId);
          toast.success("Quote sent to client");
          break;
        case "accept":
          await acceptMutation.mutateAsync({
            id: quoteId,
            notes: approvalReason,
          });
          toast.success("Quote accepted");
          break;
        case "decline":
          await declineMutation.mutateAsync({
            id: quoteId,
            reason: approvalReason,
          });
          toast.success("Quote declined");
          break;
        case "convert":
          const result = await convertMutation.mutateAsync({
            id: quoteId,
            invoiceNote: approvalReason,
          });
          toast.success(`Quote converted to invoice ${result.invoiceId}`);
          break;
      }
      setShowApprovalModal(false);
      setApprovalReason("");
      await getQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Operation failed");
    }
  };

  const handleDuplicate = async () => {
    try {
      const result = await duplicateMutation.mutateAsync(quoteId);
      toast.success("Quote duplicated");
      navigate(`/quotes/${result.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to duplicate quote");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this quote?")) return;

    try {
      await deleteMutation.mutateAsync(quoteId);
      toast.success("Quote deleted");
      navigate("/quotes");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete quote");
    }
  };

  const getStatusColor = (status: QuoteStatus) => {
    const colors: Record<QuoteStatus, string> = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      accepted: "bg-green-100 text-green-800",
      declined: "bg-red-100 text-red-800",
      expired: "bg-orange-100 text-orange-800",
      converted: "bg-purple-100 text-purple-800",
    };
    return colors[status];
  };

  const isExpired =
    quote.expirationDate && new Date(quote.expirationDate) < new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/quotes")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{quote.quoteNumber}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(quote.status)}`}>
                {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
              </span>
              {isExpired && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                  Expired
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">{quote.subject}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {quote.status === "draft" && (
            <>
              <button
                onClick={() => navigate(`/quotes/${quoteId}/edit`)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Edit size={18} />
                Edit
              </button>
              <button
                onClick={() => {
                  setApprovalAction("send");
                  setShowApprovalModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Send size={18} />
                Send
              </button>
            </>
          )}

          {quote.status === "sent" && !isExpired && (
            <>
              <button
                onClick={() => {
                  setApprovalAction("accept");
                  setShowApprovalModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle size={18} />
                Accept
              </button>
              <button
                onClick={() => {
                  setApprovalAction("decline");
                  setShowApprovalModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <XCircle size={18} />
                Decline
              </button>
            </>
          )}

          {quote.status === "accepted" && (
            <button
              onClick={() => {
                setApprovalAction("convert");
                setShowApprovalModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <LogIn size={18} />
              Convert to Invoice
            </button>
          )}

          <button
            onClick={handleDuplicate}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Copy size={18} />
            Duplicate
          </button>

          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 border border-red-300 rounded-lg text-red-700 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={18} />
            Delete
          </button>
        </div>
      </div>

      {isExpired && (
        <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertCircle className="text-orange-600" size={20} />
          <div>
            <p className="font-semibold text-orange-900">Quote Expired</p>
            <p className="text-sm text-orange-800">
              This quote expired on {formatDate(new Date(quote.expirationDate!))}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {quote.description && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600">{quote.description}</p>
            </div>
          )}

          {/* Line Items */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quote.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{item.taxRate}%</TableCell>
                      <TableCell className="text-right font-semibold">${item.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-gray-600">{quote.notes}</p>
            </div>
          )}

          {/* Activity Log */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity</h3>
            <div className="space-y-3">
              {quote.logs?.map((log, index) => (
                <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-200 last:pb-0 last:border-0">
                  <div className="mt-1 text-xs text-gray-400">
                    {formatDate(new Date(log.createdAt))}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                    </p>
                    <p className="text-sm text-gray-600">{log.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Totals Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 space-y-3">
            <div className="flex justify-between items-center text-gray-700">
              <span>Subtotal:</span>
              <span>${quote.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-gray-700">
              <span>Tax:</span>
              <span>${quote.taxAmount.toFixed(2)}</span>
            </div>
            <div className="border-t border-blue-200 pt-3 flex justify-between items-center">
              <span className="font-semibold text-gray-900">Total:</span>
              <span className="text-2xl font-bold text-blue-600">
                ${quote.total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Quote Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-600">Created</p>
              <p className="text-sm text-gray-900">{formatDate(new Date(quote.createdAt))}</p>
            </div>
            {quote.sentDate && (
              <div>
                <p className="text-xs font-semibold text-gray-600">Sent</p>
                <p className="text-sm text-gray-900">{formatDate(new Date(quote.sentDate))}</p>
              </div>
            )}
            {quote.acceptedDate && (
              <div>
                <p className="text-xs font-semibold text-gray-600">Accepted</p>
                <p className="text-sm text-gray-900">{formatDate(new Date(quote.acceptedDate))}</p>
              </div>
            )}
            {quote.expirationDate && (
              <div>
                <p className="text-xs font-semibold text-gray-600">Expires</p>
                <p className={`text-sm ${isExpired ? "text-red-600 font-semibold" : "text-gray-900"}`}>
                  {formatDate(new Date(quote.expirationDate))}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title={`${approvalAction.charAt(0).toUpperCase() + approvalAction.slice(1)} Quote`}
        message={`Are you sure you want to ${approvalAction} this quote?`}
        requiresReason={["decline", "accept", "convert"].includes(approvalAction)}
        reason={approvalReason}
        onReasonChange={setApprovalReason}
        onConfirm={handleApprovalConfirm}
        loading={sendMutation.isPending || acceptMutation.isPending || declineMutation.isPending || convertMutation.isPending}
      />
    </div>
  );
}
