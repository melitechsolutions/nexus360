import { useState, useCallback } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ImportProgressMonitor, ImportProgress } from "@/components/ImportProgressMonitor";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { AlertCircle, FileUp, CheckCircle, XCircle, Download, Users, Building2, Briefcase, Package, DollarSign } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface ImportError {
  row: number;
  field?: string;
  message: string;
  severity: "error" | "warning";
}

type ImportModuleType = 
  | "jobGroups" 
  | "employees" 
  | "clients" 
  | "products" 
  | "departments" 
  | "payroll"
  | "services"
  | "invoices";

interface ModuleConfig {
  id: ImportModuleType;
  name: string;
  description: string;
  iconComponent: React.ComponentType<{ className?: string }>;
  color: string;
  fields: string[];
}

const moduleConfigs: ModuleConfig[] = [
  {
    id: "jobGroups",
    name: "Job Groups",
    description: "Import salary grade levels and job classifications",
    iconComponent: Building2,
    color: "blue",
    fields: ["name", "minimumGrossSalary", "maximumGrossSalary", "description", "isActive"],
  },
  {
    id: "employees",
    name: "Employees",
    description: "Import employee records with personal and employment details",
    iconComponent: Users,
    color: "green",
    fields: ["employeeNumber", "firstName", "lastName", "email", "phone", "hireDate", "department", "position", "jobGroupId", "salary", "employmentType", "status", "dateOfBirth", "address", "nationalId", "bankAccountNumber", "taxId"],
  },
  {
    id: "clients",
    name: "Clients",
    description: "Import customer and client organization data",
    iconComponent: Briefcase,
    color: "purple",
    fields: ["companyName", "contactPerson", "email", "phone", "address", "city", "country", "postalCode", "taxId", "website", "industry", "status", "businessType", "registrationNumber", "creditLimit"],
  },
  {
    id: "products",
    name: "Products",
    description: "Import product inventory with pricing and stock levels",
    iconComponent: Package,
    color: "orange",
    fields: ["name", "description", "sku", "category", "unitPrice", "costPrice", "stockQuantity", "minStockLevel", "unit", "taxRate", "isActive", "reorderPoint", "maxStockLevel", "location", "supplier"],
  },
  {
    id: "departments",
    name: "Departments",
    description: "Import organizational departments and divisions",
    iconComponent: Building2,
    color: "indigo",
    fields: ["name", "description", "headId", "budget", "status"],
  },
  {
    id: "payroll",
    name: "Payroll",
    description: "Import payroll records and salary payments",
    iconComponent: DollarSign,
    color: "emerald",
    fields: ["employeeId", "payPeriodStart", "payPeriodEnd", "basicSalary", "allowances", "deductions", "tax", "netSalary", "status", "paymentDate", "paymentMethod", "notes"],
  },
];

export default function ImportExcel() {
  const [activeModule, setActiveModule] = useState<ImportModuleType>("jobGroups");
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ImportError[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: ImportError[] } | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const importPayroll = trpc.importExport.importPayroll.useMutation();
  const importEmployees = trpc.importExport.importEmployees.useMutation();
  const importClients = trpc.csvImportExport.importClients.useMutation();
  const importProducts = trpc.csvImportExport.importProducts.useMutation();
  const importDepartments = trpc.csvImportExport.importDepartments?.useMutation?.();
  const rollbackImport = trpc.importExport.rollbackImport.useMutation();

  const currentModuleConfig = moduleConfigs.find(m => m.id === activeModule);

  const downloadTemplate = useCallback(async () => {
    if (!currentModuleConfig) return;
    
    setIsDownloading(true);
    try {
      // tRPC GET query format for enums: JSON-quoted string
      const inputParam = JSON.stringify(activeModule); // This creates: "jobGroups"
      const response = await fetch(
        `/api/trpc/csvImportExport.generateTemplate?input=${encodeURIComponent(inputParam)}`
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.[0]?.error?.json?.message || 'Failed to fetch template');
      }

      const data = await response.json();
      
      // Extract the template content from the response
      let templateContent = '';
      
      if (Array.isArray(data) && data[0]?.result?.data?.content) {
        templateContent = data[0].result.data.content;
      } else if (data?.result?.data?.content) {
        templateContent = data.result.data.content;
      } else {
        // Fallback: create a simple template locally
        const fields = currentModuleConfig.fields;
        const headers = fields.join(',');
        templateContent = `# Template for ${activeModule}\n${headers}\n`;
      }
      
      // Create blob and download
      const blob = new Blob([templateContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${activeModule}-template.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`${currentModuleConfig.name} template downloaded successfully`);
    } catch (error) {
      console.error("Failed to download template:", error);
      toast.error("Failed to download template. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }, [activeModule, currentModuleConfig]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0];
      setFile(f);
      setValidationErrors([]);
      setProgress(null);
      setImportResult(null);
      
      // Parse file
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          if (f.name.endsWith(".csv")) {
            // Parse CSV
            const csv = event.target?.result as string;
            const lines = csv.split("\n").filter(l => l.trim());
            const headers = lines[0].split(",").map(h => h.trim());
            const rows = lines.slice(1).map(line => {
              const values = line.split(",").map(v => v.trim());
              const row: Record<string, string> = {};
              headers.forEach((h, i) => {
                row[h] = values[i] || "";
              });
              return row;
            });
            setPreviewRows(rows.slice(0, 5));
          } else {
            // Parse Excel
            const workbook = XLSX.read(event.target?.result, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            setPreviewRows(rows.slice(0, 5));
          }
        } catch (err) {
          console.error("Error parsing file:", err);
          setValidationErrors([{ row: 0, message: "Failed to parse file", severity: "error" }]);
        }
      };
      
      if (f.name.endsWith(".csv")) {
        reader.readAsText(f);
      } else {
        reader.readAsBinaryString(f);
      }
    }
  };

  const handleRollback = useCallback(async () => {
    if (!lastBatchId) return;
    if (!confirm("Undo this import? All imported records will be removed.")) return;

    rollbackImport.mutate(
      { batchId: lastBatchId },
      {
        onSuccess() {
          setProgress((prev) =>
            prev ? { ...prev, status: "rolled_back" } : null
          );
          setLastBatchId(null);
        },
      }
    );
  }, [lastBatchId, rollbackImport]);

  const handleImport = useCallback(async () => {
    if (!previewRows.length || !currentModuleConfig) return;

    const batchId = uuidv4();
    setLastBatchId(batchId);

    // Initialize progress tracking
    const initialProgress: ImportProgress = {
      batchId,
      entityType: activeModule,
      totalRows: previewRows.length,
      processedRows: 0,
      importedRows: 0,
      skippedRows: 0,
      errorRows: 0,
      status: "processing",
      startTime: new Date(),
      errorDetails: [],
      warnings: [],
    };
    setProgress(initialProgress);

    try {
      // Route to appropriate import handler based on module
      let mutation: any = null;
      let payload: any = null;

      switch (activeModule) {
        case "employees": {
          mutation = importEmployees;
          payload = {
            data: previewRows.map((row) => {
              const get = (field: string) => fieldMap[field] ? row[fieldMap[field]] : row[field];
              return {
                employeeNumber: String(get("employeeNumber") || "").trim(),
                firstName: String(get("firstName") || "").trim(),
                lastName: String(get("lastName") || "").trim(),
                email: String(get("email") || "").trim() || undefined,
                phone: String(get("phone") || "").trim() || undefined,
                hireDate: String(get("hireDate") || "").trim(),
                department: String(get("department") || "").trim() || undefined,
                position: String(get("position") || "").trim() || undefined,
                jobGroupId: String(get("jobGroupId") || "").trim() || undefined,
                salary: parseFloat(get("salary") || "0") || 0,
                employmentType: (String(get("employmentType") || "full_time") as any),
                status: (String(get("status") || "active") as any),
                dateOfBirth: String(get("dateOfBirth") || "").trim() || undefined,
                address: String(get("address") || "").trim() || undefined,
                nationalId: String(get("nationalId") || "").trim() || undefined,
                bankAccountNumber: String(get("bankAccountNumber") || "").trim() || undefined,
                taxId: String(get("taxId") || "").trim() || undefined,
              };
            }),
            skipDuplicates,
            batchId,
          };
          break;
        }

        case "clients": {
          mutation = importClients;
          payload = {
            data: previewRows.map((row) => {
              const get = (field: string) => fieldMap[field] ? row[fieldMap[field]] : row[field];
              return {
                companyName: String(get("companyName") || "").trim(),
                contactPerson: String(get("contactPerson") || "").trim() || undefined,
                email: String(get("email") || "").trim() || undefined,
                phone: String(get("phone") || "").trim() || undefined,
                address: String(get("address") || "").trim() || undefined,
                city: String(get("city") || "").trim() || undefined,
                country: String(get("country") || "").trim() || undefined,
                postalCode: String(get("postalCode") || "").trim() || undefined,
                taxId: String(get("taxId") || "").trim() || undefined,
                website: String(get("website") || "").trim() || undefined,
                industry: String(get("industry") || "").trim() || undefined,
                status: (String(get("status") || "active") as any),
                businessType: String(get("businessType") || "").trim() || undefined,
                registrationNumber: String(get("registrationNumber") || "").trim() || undefined,
                creditLimit: parseFloat(get("creditLimit") || "0") || undefined,
              };
            }),
            skipDuplicates,
            batchId,
          };
          break;
        }

        case "products": {
          mutation = importProducts;
          payload = {
            data: previewRows.map((row) => {
              const get = (field: string) => fieldMap[field] ? row[fieldMap[field]] : row[field];
              return {
                name: String(get("name") || "").trim(),
                description: String(get("description") || "").trim() || undefined,
                sku: String(get("sku") || "").trim() || undefined,
                category: String(get("category") || "").trim() || undefined,
                unitPrice: parseFloat(get("unitPrice") || "0") || 0,
                costPrice: parseFloat(get("costPrice") || "0") || 0,
                stockQuantity: parseInt(get("stockQuantity") || "0") || 0,
                minStockLevel: parseInt(get("minStockLevel") || "0") || 0,
                unit: String(get("unit") || "piece").trim(),
                taxRate: parseFloat(get("taxRate") || "0") || 0,
                isActive: String(get("isActive") || "true").toLowerCase() === "true",
                reorderPoint: parseInt(get("reorderPoint") || "0") || 0,
                maxStockLevel: parseInt(get("maxStockLevel") || "0") || 0,
                location: String(get("location") || "").trim() || undefined,
                supplier: String(get("supplier") || "").trim() || undefined,
              };
            }),
            skipDuplicates,
            batchId,
          };
          break;
        }

        case "payroll": {
          mutation = importPayroll;
          payload = {
            data: previewRows.map((row) => {
              const get = (field: string) => fieldMap[field] ? row[fieldMap[field]] : row[field];
              return {
                employeeId: String(get("employeeId") || "").trim(),
                payPeriodStart: String(get("payPeriodStart") || "").trim(),
                payPeriodEnd: String(get("payPeriodEnd") || "").trim(),
                basicSalary: parseFloat(get("basicSalary") || "0") || 0,
                allowances: parseFloat(get("allowances") || "0") || 0,
                deductions: parseFloat(get("deductions") || "0") || 0,
                tax: parseFloat(get("tax") || "0") || 0,
                netSalary: parseFloat(get("netSalary") || "0") || 0,
                status: (String(get("status") || "draft") as any),
                paymentDate: String(get("paymentDate") || "").trim() || undefined,
                paymentMethod: String(get("paymentMethod") || "").trim() || undefined,
                notes: String(get("notes") || "").trim() || undefined,
              };
            }),
            skipDuplicates,
            batchId,
          };
          break;
        }

        default:
          setProgress((prev) =>
            prev ? { ...prev, status: "failed", errorRows: 1 } : null
          );
          return;
      }

      if (!mutation || !payload) {
        setProgress((prev) =>
          prev ? { ...prev, status: "failed", errorRows: 1 } : null
        );
        return;
      }

      // Execute the mutation
      mutation.mutate(payload, {
        onSuccess(result: any) {
          setProgress((prev) =>
            prev
              ? {
                  ...prev,
                  status: "completed",
                  processedRows: previewRows.length,
                  importedRows: result.imported || 0,
                  skippedRows: result.skipped || 0,
                  errorRows: result.errors?.length || 0,
                  endTime: new Date(),
                  errorDetails: (result.errors || []).map((err: any, i: number) => ({
                    rowIndex: i,
                    row: previewRows[i] || {},
                    error: err.message || String(err),
                  })),
                }
              : null
          );
          toast.success(`Successfully imported ${result.imported || 0} records`);
        },
        onError(error: any) {
          const errorMsg = error?.message || "Import failed";
          setProgress((prev) =>
            prev
              ? {
                  ...prev,
                  status: "failed",
                  endTime: new Date(),
                  errorDetails: [
                    {
                      rowIndex: 0,
                      row: {},
                      error: errorMsg,
                    },
                  ],
                }
              : null
          );
          toast.error(`Import failed: ${errorMsg}`);
        },
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Import failed";
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              status: "failed",
              endTime: new Date(),
              errorDetails: [
                {
                  rowIndex: 0,
                  row: {},
                  error: errorMsg,
                },
              ],
            }
          : null
      );
      toast.error(`Import error: ${errorMsg}`);
    }
  }, [previewRows, fieldMap, skipDuplicates, importPayroll, importEmployees, importClients, importProducts, activeModule, currentModuleConfig]);

  const columns = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];
  const requiredFields = currentModuleConfig?.fields || [];

  return (
    <ModuleLayout title="Data Import" breadcrumbs={[{ label: "Tools" }, { label: "Import Data" }]}>
      <div className="space-y-6">
        {/* Step 1: Select Module */}
        {!file && (
          <>
            <div>
              <h2 className="text-xl font-semibold mb-2">1. Select Data Type</h2>
              <p className="text-muted-foreground mb-4">Choose what type of data you want to import</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {moduleConfigs.map((module) => (
                <Card
                  key={module.id}
                  className={`cursor-pointer transition-all ${
                    activeModule === module.id
                      ? "border-2 border-blue-500 bg-blue-50"
                      : "hover:border-gray-400"
                  }`}
                  onClick={() => {
                    setActiveModule(module.id);
                    setFieldMap({});
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-${module.color}-100`}>
                          <module.iconComponent className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{module.name}</CardTitle>
                          <CardDescription className="text-xs">{module.description}</CardDescription>
                        </div>
                      </div>
                      {activeModule === module.id && (
                        <Badge className="bg-blue-500">Selected</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadTemplate();
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Step 2: Upload File */}
        {currentModuleConfig && (
          <>
            <div>
              <h2 className="text-xl font-semibold mb-2">2. Upload File</h2>
              <p className="text-muted-foreground mb-4">
                Uploading: <strong>{currentModuleConfig.name}</strong>
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileUp className="h-5 w-5" />
                  Select CSV or Excel File
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {file && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-900">Selected: {file.name}</p>
                      <p className="text-xs text-green-700">{previewRows.length} rows found</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Step 3: Field Mapping */}
        {file && previewRows.length > 0 && (
          <>
            <div>
              <h2 className="text-xl font-semibold mb-2">3. Map Fields</h2>
              <p className="text-muted-foreground mb-4">
                Map your file columns to the {currentModuleConfig?.name} fields
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Column Mapping</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Required fields: {requiredFields.slice(0, 3).join(", ")}
                  {requiredFields.length > 3 ? `, and ${requiredFields.length - 3} more` : ""}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requiredFields.map((field) => (
                    <div key={field} className="space-y-2">
                      <label className="text-sm font-medium">{field}</label>
                      <select
                        value={fieldMap[field] || ""}
                        onChange={(e) =>
                          setFieldMap({ ...fieldMap, [field]: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
                      >
                        <option value="">-- Not mapped --</option>
                        {columns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert className="bg-red-50 border-red-200 border-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="font-semibold mb-2">
                {validationErrors.length} Validation Error
                {validationErrors.length !== 1 ? "s" : ""}
              </div>
              <ul className="text-sm space-y-1">
                {validationErrors.slice(0, 10).map((err, i) => (
                  <li key={`val-err-${i}`}>
                    <strong>Row {err.row + 1}</strong>
                    {err.field && ` - ${err.field}`}: {err.message}
                  </li>
                ))}
                {validationErrors.length > 10 && (
                  <li className="text-red-600 italic">
                    ... and {validationErrors.length - 10} more errors
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Step 4: Preview & Import */}
        {file && previewRows.length > 0 && validationErrors.length === 0 && (
          <>
            <div>
              <h2 className="text-xl font-semibold mb-2">4. Preview & Import</h2>
              <p className="text-muted-foreground mb-4">
                {previewRows.length} rows ready to import
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Data Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto max-h-64 border rounded">
                  <Table className="w-full text-sm">
                    <TableHeader className="bg-gray-100 sticky top-0">
                      <TableRow>
                        <TableHead className="px-4 py-2 text-left font-semibold">#</TableHead>
                        {requiredFields.slice(0, 5).map((field) => (
                          <TableHead key={field} className="px-4 py-2 text-left font-semibold">
                            {field}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.slice(0, 10).map((row, idx) => (
                        <TableRow key={`row-${idx}`} className="border-t hover:bg-gray-50">
                          <TableCell className="px-4 py-2 text-gray-500">{idx + 1}</TableCell>
                          {requiredFields.slice(0, 5).map((field) => (
                            <TableCell
                              key={`${idx}-${field}`}
                              className="px-4 py-2 text-gray-700 text-xs"
                            >
                              {String(row[fieldMap[field] || field] || "―").substring(0, 20)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(null);
                      setPreviewRows([]);
                      setFieldMap({});
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={importPayroll.isPending || progress?.status === "processing"}
                    className="px-8"
                  >
                    {importPayroll.isPending ? "Importing..." : "Import Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Progress Monitor */}
        {progress && (
          <ImportProgressMonitor
            progress={progress}
            onRollback={handleRollback}
            onDismiss={() => setProgress(null)}
          />
        )}

        {/* Import Results */}
        {progress && (progress.status === "completed" || progress.status === "failed") && (
          <Card className={progress.status === "completed" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {progress.status === "completed" ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-900">Import Completed Successfully</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="text-red-900">Import Failed</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{progress.importedRows}</div>
                  <div className="text-sm text-gray-600">Imported</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{progress.skippedRows}</div>
                  <div className="text-sm text-gray-600">Skipped</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{progress.errorRows}</div>
                  <div className="text-sm text-gray-600">Errors</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
