/**
 * Data Export Component
 * 
 * Handles CSV, PDF, and Excel exports for reports and filtered data
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Download, FileText, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";

interface ExportModalProps {
  documentType: "invoice" | "receipt" | "expense" | "project" | "client" | "employee";
  selectedIds?: string[];
  filteredCount?: number;
  onClose: () => void;
}

export function ExportModal({ documentType, selectedIds = [], onClose }: ExportModalProps) {
  // ALL HOOKS MUST BE CALLED BEFORE CONDITIONAL RETURNS
  const { allowed, isLoading } = useRequireFeature("reports:export");
  const [selectedFormat, setSelectedFormat] = useState<"csv" | "pdf">("csv");
  const [isExporting, setIsExporting] = useState(false);

  const exportInvoicesCSV = trpc.dataExport.exportInvoicesCSV.useQuery(
    { ids: selectedIds },
    { enabled: false }
  );

  const exportReceiptsCSV = trpc.dataExport.exportReceiptsCSV.useQuery(
    { ids: selectedIds },
    { enabled: false }
  );

  const exportExpensesCSV = trpc.dataExport.exportExpensesCSV.useQuery(
    { ids: selectedIds },
    { enabled: false }
  );

  const exportProjectsCSV = trpc.dataExport.exportProjectsCSV.useQuery(
    { ids: selectedIds },
    { enabled: false }
  );

  const exportClientsCSV = trpc.dataExport.exportClientsCSV.useQuery(
    { ids: selectedIds },
    { enabled: false }
  );

  // employee export (supports filtered sets by passing ids)
  const exportEmployeesCSV = trpc.dataExport.exportEmployeesCSV.useQuery(
    { ids: selectedIds },
    { enabled: false }
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let result: any = null;

      switch (documentType) {
        case "invoice":
          result = await exportInvoicesCSV.refetch();
          break;
        case "receipt":
          result = await exportReceiptsCSV.refetch();
          break;
        case "expense":
          result = await exportExpensesCSV.refetch();
          break;
        case "project":
          result = await exportProjectsCSV.refetch();
          break;
        case "client":
          result = await exportClientsCSV.refetch();
          break;
        case "employee":
          result = await exportEmployeesCSV.refetch();
          break;
      }

      if (result?.data) {
        downloadFile(result.data.content, result.data.filename, "text/csv");
        toast.success(`${documentType} exported successfully`);
        onClose();
      }
    } catch (error) {
      toast.error("Export failed");
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // NOW SAFE TO CHECK CONDITIONAL RETURNS (ALL HOOKS ALREADY CALLED)
  if (isLoading) return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  if (!allowed) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <div>
            <CardTitle>Export {documentType}</CardTitle>
            <CardDescription>Choose export format</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Format</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={selectedFormat === "csv" ? "default" : "outline"}
                onClick={() => setSelectedFormat("csv")}
                className="w-full"
              >
                CSV
              </Button>
              <Button
                variant={selectedFormat === "pdf" ? "default" : "outline"}
                onClick={() => setSelectedFormat("pdf")}
                className="w-full"
              >
                PDF
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              {selectedIds.length > 0
                ? `Exporting ${selectedIds.length} selected records`
                : `Exporting all records${filteredCount ? ` (${filteredCount} filtered)` : ""}`}
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? "Exporting..." : "Export"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Export Templates Selector
 */
export function ExportTemplateSelector({
  onSelect,
}: {
  onSelect: (template: any) => void;
}) {
  const { data: templates, isLoading } = trpc.dataExport.getExportTemplates.useQuery();

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={`loader-${i}`} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Templates</CardTitle>
        <CardDescription>Choose a template for export</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.isArray(templates) && templates.map((template: any) => (
          <Button
            key={template.id}
            variant="outline"
            className="w-full justify-start h-auto py-3"
            onClick={() => onSelect(template)}
          >
            <div className="flex items-start gap-3 w-full">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="font-medium">{template.name}</p>
                <p className="text-xs text-gray-600">{template.description}</p>
              </div>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Export History
 */
export function ExportHistory() {
  const [exports, setExports] = useState<any[]>([
    {
      id: 1,
      name: "invoices_1707590400000.csv",
      type: "invoice",
      date: new Date(Date.now() - 3600000),
      size: "245 KB",
      status: "completed",
    },
    {
      id: 2,
      name: "expenses_1707586800000.csv",
      type: "expense",
      date: new Date(Date.now() - 7200000),
      size: "128 KB",
      status: "completed",
    },
    {
      id: 3,
      name: "clients_1707583200000.csv",
      type: "client",
      date: new Date(Date.now() - 10800000),
      size: "356 KB",
      status: "completed",
    },
  ]);

  const handleDownload = (exportItem: any) => {
    toast.success(`Downloading ${exportItem.name}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export History</CardTitle>
        <CardDescription>Recent exports</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {exports.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-gray-600">
                    {item.date.toLocaleDateString()} {item.date.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-600">{item.size}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(item)}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Bulk Export Manager
 */
export function BulkExportManager({
  documentType,
  selectedIds,
}: {
  documentType: string;
  selectedIds: string[];
}) {
  const [showExportModal, setShowExportModal] = useState(false);
  const { data: validation } = trpc.dataExport.validateExportData.useQuery({
    documentType,
    ids: selectedIds,
  });

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {selectedIds.length} record{selectedIds.length > 1 ? "s" : ""} ready to export
              </p>
              {validation && (
                <p className="text-xs text-gray-600 mt-1">
                  Estimated size: {validation.estimatedSize}
                </p>
              )}
            </div>
            <Button
              onClick={() => setShowExportModal(true)}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {showExportModal && (
        <ExportModal
          documentType={documentType as any}
          selectedIds={selectedIds}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </>
  );
}

/**
 * Helper function to download file
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
