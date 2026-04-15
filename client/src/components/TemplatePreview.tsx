/**
 * Document Template Preview Component
 * Renders HTML templates with data binding
 */

import { useEffect, useRef, useState } from "react";
import { templateRenderer, TemplateData } from "@/lib/templateRenderer";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { toast } from "sonner";

interface TemplatePreviewProps {
  templateType: string;
  data: TemplateData;
  onPrint?: () => void;
  onDownload?: () => void;
  className?: string;
}

/**
 * Renders a template with data binding and provides print/download functionality
 */
export function TemplatePreview({
  templateType,
  data,
  onPrint,
  onDownload,
  className = "",
}: TemplatePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderTemplate = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        if (containerRef.current) {
          await templateRenderer.renderToElement(
            templateType,
            data,
            containerRef.current
          );
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to render template";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    renderTemplate();
  }, [templateType, data]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print documents");
      return;
    }

    if (containerRef.current) {
      printWindow.document.write(containerRef.current.innerHTML);
      printWindow.document.close();
      printWindow.print();
      onPrint?.();
    }
  };

  const handleDownloadPDF = async () => {
    try {
      if (containerRef.current) {
        const printWindow = window.open("", "_blank");
        if (!printWindow) { toast.error("Please allow popups to download PDF"); return; }
        printWindow.document.write(`<html><head><title>Document</title></head><body>${containerRef.current.innerHTML}</body></html>`);
        printWindow.document.close();
        printWindow.print();
      }
      onDownload?.();
    } catch (err) {
      toast.error("Failed to download PDF");
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          disabled={isLoading}
        >
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadPDF}
          disabled={isLoading}
        >
          <Download className="w-4 h-4 mr-2" />
          PDF
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center p-12 bg-gray-50 rounded border">
          <span className="text-gray-500">Loading template...</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          <p className="font-semibold">Error rendering template</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div
        ref={containerRef}
        className="bg-white border rounded p-6 print:p-0 print:border-0"
        style={{
          minHeight: "600px",
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        }}
      />
    </div>
  );
}

export default TemplatePreview;
