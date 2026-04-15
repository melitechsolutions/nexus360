import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import BulkProgressTracker from "@/components/BulkProgressTracker";
import { FileUp, AlertCircle, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface CSVPreview {
  row: number;
  quoteNumber: string;
  clientId: string;
  subject: string;
  total: number;
  status: "valid" | "invalid";
}

export default function BulkImport() {
  const [preview, setPreview] = useState<CSVPreview[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState("");

  const bulkImportMutation = trpc.bulkOperations.bulkImportQuotes.useMutation();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    // Read CSV file
    const reader = new FileReader();
    reader.onload = async (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split("\n");
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

      // Parse CSV
      const parsedQuotes = lines.slice(1).map((line, idx) => {
        const values = line.split(",").map(v => v.trim());
        return {
          row: idx + 2,
          quoteNumber: values[0] || `QT-${idx}`,
          clientId: values[1] || "",
          subject: values[2] || "",
          total: parseFloat(values[3]) || 0,
          status: values[0] ? "valid" : "invalid",
        };
      });

      setPreview(parsedQuotes.filter(q => q.quoteNumber));
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      toast.error("No valid data to import");
      return;
    }

    setIsImporting(true);
    try {
      const result = await bulkImportMutation.mutateAsync({
        quotes: preview.map(p => ({
          quoteNumber: p.quoteNumber,
          clientId: p.clientId,
          subject: p.subject,
          subtotal: p.total,
          taxRate: 0,
          expirationDays: 30,
          items: [],
        })),
        dryRun: false,
      });

      if (result.success) {
        toast.success(`Imported ${result.imported} quotes`);
        setPreview([]);
        setFileName("");
      } else {
        toast.error(`${result.failed.length} quotes failed to import`);
      }
    } catch (error) {
      toast.error("Failed to import quotes");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Import Quotes</h1>
        <p className="text-muted-foreground mt-2">
          Upload CSV file to bulk import quotes
        </p>
      </div>

      {isImporting && <BulkProgressTracker title="Importing Quotes..." />}

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>
            Supported format: CSV with columns for Quote Number, Client ID, Subject, Amount
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-12 text-center hover:bg-gray-50 cursor-pointer transition">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-input"
            />
            <label htmlFor="csv-input" className="cursor-pointer block">
              <FileUp className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="font-medium">Drag and drop or click to select</p>
              <p className="text-sm text-muted-foreground mt-1">CSV files only</p>
              {fileName && (
                <p className="text-sm text-green-600 mt-2">✓ {fileName}</p>
              )}
            </label>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Preview ({preview.length} rows)</h3>
              <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Quote #</TableHead>
                      <TableHead>Client ID</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 20).map((row) => (
                      <TableRow key={row.row}>
                        <TableCell className="text-xs">{row.row}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {row.quoteNumber}
                        </TableCell>
                        <TableCell className="text-sm">{row.clientId}</TableCell>
                        <TableCell className="text-sm">{row.subject}</TableCell>
                        <TableCell className="text-sm font-medium">
                          ${row.total.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {row.status === "valid" ? (
                            <div className="flex items-center gap-1 text-green-600 text-sm">
                              <Check className="w-4 h-4" />
                              Valid
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-600 text-sm">
                              <AlertCircle className="w-4 h-4" />
                              Invalid
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="flex-1"
                >
                  Import {preview.length} Quotes
                </Button>
                <Button variant="outline" onClick={() => setPreview([])}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CSV Format Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-50 rounded-lg p-4 font-mono text-sm space-y-2">
            <p className="text-muted-foreground">
              First row must be headers. Example:
            </p>
            <code className="block text-xs bg-white p-3 rounded border">
              Quote Number,Client ID,Subject,Amount,Tax Rate
            </code>
            <p className="text-muted-foreground">Data rows:</p>
            <code className="block text-xs bg-white p-3 rounded border">
              QT-2024-001,CLI-001,Q1 Services,5000,10
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
