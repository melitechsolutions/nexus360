import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Copy, Zap, Upload } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";

interface BatchMatch {
  paymentId: string;
  invoiceId: string;
  confidence?: number;
  status: "pending" | "matched" | "error";
}

export function BatchPaymentMatching() {
  const [matches, setMatches] = useState<BatchMatch[]>([]);
  const [suggestedMatches, setSuggestedMatches] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [csvContent, setCsvContent] = useState("");

  // Fetch unmatched payments and auto-suggestions
  const { data: unmatchedData } = trpc.paymentReconciliation.getUnmatchedPayments.useQuery({
    limit: 100,
    offset: 0,
  });

  const { data: autoMatchData } = trpc.paymentReconciliation.autoMatchPayments.useMutation();

  // Bulk match mutation
  const bulkMatchMutation = trpc.paymentReconciliation.bulkMatchPayments.useMutation();

  // Fetch auto-suggestions on component mount
  useEffect(() => {
    if (unmatchedData && unmatchedData.payments.length > 0) {
      // In a real scenario, this would call autoMatchPayments
      // For now, we'll load suggested matches from local state
      loadSuggestedMatches();
    }
  }, [unmatchedData]);

  const loadSuggestedMatches = async () => {
    try {
      // This would call the autoMatchPayments mutation in practice
      setSuggestedMatches([]);
    } catch (error) {
      console.error("Error loading suggestions:", error);
    }
  };

  const handleAddMatch = (paymentId: string, invoiceId: string) => {
    const existing = matches.find(m => m.paymentId === paymentId);
    if (existing) {
      setMatches(matches.map(m =>
        m.paymentId === paymentId ? { ...m, invoiceId, status: "pending" } : m
      ));
    } else {
      setMatches([...matches, { paymentId, invoiceId, status: "pending" }]);
    }
  };

  const handleRemoveMatch = (paymentId: string) => {
    setMatches(matches.filter(m => m.paymentId !== paymentId));
  };

  const handleAcceptSuggestion = (suggestion: any) => {
    handleAddMatch(suggestion.paymentId, suggestion.invoiceId);
  };

  const handleBulkConfirm = async () => {
    if (matches.length === 0) return;

    setIsProcessing(true);
    try {
      const result = await bulkMatchMutation.mutateAsync({
        matches: matches.map(m => ({ paymentId: m.paymentId, invoiceId: m.invoiceId })),
        confirmOverwrite: false,
      });

      // Update match statuses
      setMatches(matches.map(m => ({
        ...m,
        status: result.successful > 0 ? "matched" : "error",
      })));

      // Show success feedback
      setTimeout(() => {
        setMatches([]);
        setCsvContent("");
      }, 2000);
    } catch (error) {
      console.error("Error confirming matches:", error);
      setMatches(matches.map(m => ({ ...m, status: "error" })));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCsvExport = async () => {
    try {
      const result = await trpc.paymentReconciliation.exportReconciliationData.query({
        dataType: "unmatched",
      });
      
      // Create download
      const blob = new Blob([result.content], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting data:", error);
    }
  };

  const handleCsvImport = async () => {
    if (!csvContent.trim()) return;

    setIsProcessing(true);
    try {
      const result = await trpc.paymentReconciliation.importReconciliationMatches.mutateAsync({
        csvContent,
        dryRun: false,
      });

      toast.success(`Imported ${result.successful} matches successfully`);
      setCsvContent("");
      setMatches([]);
    } catch (error) {
      toast.error("Error importing CSV matches");
    } finally {
      setIsProcessing(false);
    }
  };

  const successCount = matches.filter(m => m.status === "matched").length;
  const errorCount = matches.filter(m => m.status === "error").length;
  const pendingCount = matches.filter(m => m.status === "pending").length;

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                Batch Payment Matching
              </CardTitle>
              <CardDescription>
                Match multiple unmatched payments to invoices at once
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <div className="text-sm font-medium text-blue-900">To Match</div>
                <div className="text-2xl font-bold text-blue-600">
                  {unmatchedData?.total || 0}
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <div className="text-sm font-medium text-green-900">Pending</div>
                <div className="text-2xl font-bold text-green-600">
                  {pendingCount}
                </div>
              </div>
              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <div className="text-sm font-medium text-yellow-900">Suggested</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {suggestedMatches.length}
                </div>
              </div>
              <div className="bg-purple-50 p-3 rounded border border-purple-200">
                <div className="text-sm font-medium text-purple-900">CSV Ready</div>
                <div className="text-2xl font-bold text-purple-600">
                  {(unmatchedData?.total || 0) > 0 ? "✓" : "—"}
                </div>
              </div>
            </div>

            {/* Suggested Matches */}
            {suggestedMatches.length > 0 && (
              <div className="border rounded p-3 bg-yellow-50">
                <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Auto-Matched Suggestions ({suggestedMatches.length})
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {suggestedMatches.map((suggestion, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-2 rounded text-sm">
                      <span className="text-gray-600">
                        Payment {suggestion.paymentId.substring(0, 8)}... → Invoice {suggestion.invoiceId.substring(0, 8)}...
                      </span>
                      <span className="text-yellow-600 font-semibold mr-2">
                        {(suggestion.confidence * 100).toFixed(0)}% match
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcceptSuggestion(suggestion)}
                      >
                        Accept
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CSV Import/Export */}
            <div className="border rounded p-3 bg-gray-50 space-y-2">
              <div className="font-semibold text-sm">CSV Import/Export</div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCsvExport}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Export Unmatched
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const file = document.createElement("input");
                    file.type = "file";
                    file.accept = ".csv";
                    file.onchange = (e: any) => {
                      const reader = new FileReader();
                      reader.onload = (event: any) => {
                        setCsvContent(event.target.result);
                      };
                      reader.readAsText(e.target.files[0]);
                    };
                    file.click();
                  }}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Import CSV
                </Button>
              </div>
              {csvContent && (
                <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                  CSV loaded: {csvContent.split("\n").length - 1} lines
                </div>
              )}
            </div>

            {/* Current Pending Matches */}
            {matches.length > 0 && (
              <div className="border rounded p-3 bg-blue-50">
                <div className="font-semibold text-sm mb-2 flex items-center justify-between">
                  <span>Pending Matches ({matches.length})</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setMatches([])}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {matches.map((match) => (
                    <div
                      key={match.paymentId}
                      className={`flex items-center justify-between p-2 rounded text-sm ${
                        match.status === "matched"
                          ? "bg-green-100 border border-green-300"
                          : match.status === "error"
                          ? "bg-red-100 border border-red-300"
                          : "bg-white border border-blue-200"
                      }`}
                    >
                      <span className="text-gray-700">
                        Payment {match.paymentId.substring(0, 8)}... → Invoice {match.invoiceId.substring(0, 8)}...
                      </span>
                      <div className="flex items-center gap-2">
                        {match.status === "matched" && (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        )}
                        {match.status === "error" && (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveMatch(match.paymentId)}
                          className="h-6 w-6"
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleBulkConfirm}
                disabled={matches.length === 0 || isProcessing}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? "Processing..." : `Confirm ${matches.length} Matches`}
              </Button>
              {csvContent && (
                <Button
                  onClick={handleCsvImport}
                  disabled={isProcessing}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? "Importing..." : "Import CSV"}
                </Button>
              )}
            </div>

            {/* Results Summary */}
            {(successCount > 0 || errorCount > 0) && (
              <div className="border rounded p-3 bg-gray-50 text-sm">
                <div className="flex items-center justify-between">
                  <span>
                    ✓ {successCount} matched
                    {errorCount > 0 && ` | ✕ ${errorCount} errors`}
                  </span>
                  <span className="text-gray-600">
                    {((successCount / (successCount + errorCount)) * 100).toFixed(0)}% success rate
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
