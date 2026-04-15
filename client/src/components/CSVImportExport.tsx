import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  FileText,
  Loader2,
  Eye,
} from 'lucide-react';
import { generateCSVTemplateFile, getAvailableModules, parseCSV, ModuleType } from '@/utils/csvGenerator';

interface PreviewRow {
  rowNum: number;
  data: Record<string, any>;
  hasErrors: boolean;
  errors: string[];
}

export default function CSVImportExport() {
  const [selectedModule, setSelectedModule] = useState<ModuleType>('clients');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const modules = getAvailableModules();
  
  // TRPC mutations
  const generateTemplateMutation = trpc.csvImportExport.generateTemplate.useQuery(
    selectedModule as any,
    { enabled: false }
  );

  const importClientsMutation = trpc.csvImportExport.importClients.useMutation();
  const importEmployeesMutation = trpc.csvImportExport.importEmployees.useMutation();
  const importProductsMutation = trpc.csvImportExport.importProducts.useMutation();
  const importAccountsMutation = trpc.csvImportExport.importAccounts.useMutation();
  const importPaymentsMutation = trpc.csvImportExport.importPayments.useMutation();

  /**
   * Download template for selected module
   */
  const handleDownloadTemplate = async () => {
    try {
      const template = generateCSVTemplateFile(selectedModule as ModuleType);
      const url = URL.createObjectURL(template);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedModule}_template.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`${selectedModule} template downloaded`);
    } catch (error) {
      toast.error(`Failed to download template: ${error}`);
    }
  };

  /**
   * Handle file selection and preview
   */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setUploadedFile(file);

    try {
      const content = await file.text();
      const rows = parseCSV(content);

      // Convert first 5 rows for preview
      const preview: PreviewRow[] = rows.slice(0, 5).map((row, idx) => ({
        rowNum: idx + 2, // Start from row 2 (row 1 is headers)
        data: row,
        hasErrors: false,
        errors: [],
      }));

      setPreviewData(preview);
      setShowPreview(true);
      toast.success(`Loaded ${rows.length} records from CSV`);
    } catch (error) {
      toast.error(`Failed to parse CSV: ${error}`);
      setUploadedFile(null);
    }
  };

  /**
   * Execute import based on selected module
   */
  const handleImport = async () => {
    if (!uploadedFile) {
      toast.error('Please select a file to import');
      return;
    }

    setIsImporting(true);
    try {
      const content = await uploadedFile.text();
      const rows = parseCSV(content);

      if (rows.length === 0) {
        toast.error('CSV file has no data rows');
        setIsImporting(false);
        return;
      }

      let result;

      switch (selectedModule) {
        case 'clients':
          result = await importClientsMutation.mutateAsync({
            data: rows,
            skipDuplicates,
          });
          break;
        case 'employees':
          result = await importEmployeesMutation.mutateAsync({
            data: rows,
            skipDuplicates,
          });
          break;
        case 'products':
          result = await importProductsMutation.mutateAsync({
            data: rows,
            skipDuplicates,
          });
          break;
        case 'accounts':
          result = await importAccountsMutation.mutateAsync({
            data: rows,
            skipDuplicates,
          });
          break;
        case 'payments':
          result = await importPaymentsMutation.mutateAsync({
            data: rows,
            skipDuplicates,
          });
          break;
        default:
          toast.error(`Import is not supported for ${selectedModule}. Supported modules: Clients, Employees, Products, Accounts, Payments.`);
          return;
      }

      setImportResult(result);
      toast.success(`Import completed: ${result.imported} records imported`);

      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} errors occurred during import`);
      }

      setUploadedFile(null);
      setPreviewData([]);
      (e.target as HTMLInputElement).value = '';
    } catch (error) {
      toast.error(`Import failed: ${error}`);
    } finally {
      setIsImporting(false);
    }
  };

  const currentModuleInfo = modules.find(m => m.id === selectedModule);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">CSV Import/Export</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Bulk import data using CSV templates
        </p>
      </div>

      <Tabs defaultValue="import" className="w-full">
        <TabsList>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="templates">Download Templates</TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import CSV Data</CardTitle>
              <CardDescription>
                Select a module and upload a CSV file to bulk import data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Module Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Module</label>
                <Select value={selectedModule} onValueChange={(value) => setSelectedModule(value as ModuleType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a module" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map(module => {
                      const importSupported = ['clients', 'employees', 'products', 'accounts', 'payments'].includes(module.id);
                      return (
                        <SelectItem key={module.id} value={module.id}>
                          {module.label}{!importSupported ? ' (export only)' : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {currentModuleInfo && (
                  <p className="text-xs text-gray-500">{currentModuleInfo.description}</p>
                )}
              </div>

              {/* Download Template Button */}
              <Button
                onClick={handleDownloadTemplate}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Download {selectedModule} Template
              </Button>

              {/* File Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select CSV File</label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm"
                  />
                </div>
                {uploadedFile && (
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">{uploadedFile.name}</span>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Skip duplicate records</span>
                </label>
              </div>

              {/* Preview Button */}
              {previewData.length > 0 && (
                <Button
                  onClick={() => setShowPreview(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Data ({previewData.length} rows)
                </Button>
              )}

              {/* Import Button */}
              <Button
                onClick={handleImport}
                disabled={!uploadedFile || isImporting}
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Data
                  </>
                )}
              </Button>

              {/* Import Results */}
              {importResult && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-semibold">Import Completed</p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Imported:</span>
                          <p className="font-semibold text-green-600">{importResult.imported}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Skipped:</span>
                          <p className="font-semibold text-yellow-600">{importResult.skipped}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Errors:</span>
                          <p className="font-semibold text-red-600">{importResult.errors.length}</p>
                        </div>
                      </div>
                      {importResult.errors.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-red-600 hover:underline">
                            Show errors ({importResult.errors.length})
                          </summary>
                          <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                            {importResult.errors.slice(0, 10).map((err: any, idx: number) => (
                              <li key={idx}>
                                Row {err.row}: {err.message}
                              </li>
                            ))}
                            {importResult.errors.length > 10 && (
                              <li>... and {importResult.errors.length - 10} more errors</li>
                            )}
                          </ul>
                        </details>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Templates</CardTitle>
              <CardDescription>
                Download blank CSV templates to use as import files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {modules.map(module => (
                  <Button
                    key={module.id}
                    variant="outline"
                    className="h-auto p-3 text-left justify-start flex-col items-start"
                    onClick={() => {
                      setSelectedModule(module.id);
                      setTimeout(() => handleDownloadTemplate(), 100);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Download className="w-4 h-4" />
                      <span className="font-medium">{module.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{module.description}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Import Data</DialogTitle>
            <DialogDescription>
              Showing first {previewData.length} rows from your CSV file
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {previewData.map((row) => (
              <Card key={row.rowNum} className={row.hasErrors ? 'border-red-300' : ''}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm">Row {row.rowNum}</h4>
                    {row.hasErrors && (
                      <Badge variant="destructive">Has Errors</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(row.data).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <span className="text-gray-500 text-xs">{key}</span>
                        <span className="font-medium break-words">
                          {value === null ? <em className="text-gray-400">empty</em> : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowPreview(false)} variant="outline">
              Close
            </Button>
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? 'Importing...' : 'Proceed with Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
