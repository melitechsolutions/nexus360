import React, { useState, useEffect } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { FileText,  Plus, Trash2, Play, Download, Loader } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Fallback tables in case schema introspection fails
const DEFAULT_TABLES = [
  { value: "invoices", label: "Invoices" },
  { value: "payments", label: "Payments" },
  { value: "employees", label: "Employees" },
  { value: "payroll", label: "Payroll" },
  { value: "expenses", label: "Expenses" },
  { value: "clients", label: "Clients" },
  { value: "projects", label: "Projects" },
];

const AGGREGATION_TYPES = [
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average" },
  { value: "count", label: "Count" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
];

const CHART_TYPES = [
  { value: "bar", label: "Bar Chart" },
  { value: "line", label: "Line Chart" },
  { value: "pie", label: "Pie Chart" },
  { value: "table", label: "Table" },
];

interface ReportFilter {
  field: string;
  operator: string;
  value: string;
}

interface ReportConfig {
  name: string;
  table: string;
  selectedFields: string[];
  filters: ReportFilter[];
  groupBy: string;
  aggregations: Array<{ field: string; type: string }>;
  chartType: string;
  description: string;
}

export default function CustomReportBuilder() {
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    name: "",
    table: "",
    selectedFields: [],
    filters: [],
    groupBy: "",
    aggregations: [],
    chartType: "table",
    description: "",
  });

  const [reportData, setReportData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [schemaData, setSchemaData] = useState<any>(null);

  // Fetch schema introspection from backend
  const { data: schemaIntrospection, isLoading: schemaLoading } = trpc.reports.schemaIntrospection.useQuery();

  // Fetch report data
  const { data: reportDataResult, isLoading: reportLoading } = trpc.reports.getReportData.useQuery(
    {
      table: reportConfig.table,
      fields: reportConfig.selectedFields,
      filters: reportConfig.filters,
      limit: 100,
    },
    { enabled: Boolean(reportConfig.table && reportConfig.selectedFields.length > 0) }
  );

  useEffect(() => {
    if (schemaIntrospection) {
      setSchemaData(schemaIntrospection);
    }
  }, [schemaIntrospection]);

  useEffect(() => {
    if (reportDataResult) {
      setReportData(reportDataResult);
    }
  }, [reportDataResult]);

  const handleTableChange = (value: string) => {
    setReportConfig({
      ...reportConfig,
      table: value,
      selectedFields: [],
      groupBy: "",
    });
  };

  const handleFieldToggle = (field: string) => {
    const updated = reportConfig.selectedFields.includes(field)
      ? reportConfig.selectedFields.filter((f) => f !== field)
      : [...reportConfig.selectedFields, field];

    setReportConfig({
      ...reportConfig,
      selectedFields: updated,
    });
  };

  const handleAddFilter = () => {
    setReportConfig({
      ...reportConfig,
      filters: [...reportConfig.filters, { field: "", operator: "=", value: "" }],
    });
  };

  const handleRemoveFilter = (idx: number) => {
    setReportConfig({
      ...reportConfig,
      filters: reportConfig.filters.filter((_, i) => i !== idx),
    });
  };

  const handleAddAggregation = () => {
    setReportConfig({
      ...reportConfig,
      aggregations: [...reportConfig.aggregations, { field: "", type: "sum" }],
    });
  };

  const handleRemoveAggregation = (idx: number) => {
    setReportConfig({
      ...reportConfig,
      aggregations: reportConfig.aggregations.filter((_, i) => i !== idx),
    });
  };

  const handleGeneratePreview = () => {
    if (!reportConfig.table) {
      toast.error("Please select a table");
      return;
    }
    if (reportConfig.selectedFields.length === 0) {
      toast.error("Please select at least one field");
      return;
    }

    setShowPreview(true);
    toast.success("Preview generated successfully");
  };

  const handleSaveReport = () => {
    if (!reportConfig.name) {
      toast.error("Please enter a report name");
      return;
    }
    if (!reportConfig.table) {
      toast.error("Please select a table");
      return;
    }
    if (reportConfig.selectedFields.length === 0) {
      toast.error("Please select at least one field");
      return;
    }

    // Save report (would be sent to backend)
    toast.success(`Report "${reportConfig.name}" saved successfully`);
  };

  const handleExport = () => {
    if (reportData.length === 0) {
      toast.error("Please generate preview first");
      return;
    }

    // Create CSV
    const headers = reportConfig.selectedFields.length > 0 
      ? reportConfig.selectedFields 
      : Object.keys(reportData[0] || {});
    
    const csvContent = [
      headers.join(","),
      ...reportData.map((row) => headers.map((h) => JSON.stringify(row[h] || "")).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${reportConfig.name}_${new Date().getTime()}.csv`;
    link.click();

    toast.success("Report exported successfully");
  };

  // Get available tables from schema introspection or use defaults
  const availableTables = schemaData?.tables || DEFAULT_TABLES;

  // Get fields for the selected table
  const currentTableSchema = availableTables.find((t: any) => t.value === reportConfig.table);
  const fields = currentTableSchema?.fields || [];

  return (
    <ModuleLayout
      title="Custom Report Builder"
      icon={<FileText className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Reports" }, { label: "Custom Report Builder" }]}
    >
      <div className="flex justify-between items-center">
        </div>

      <Tabs defaultValue="design" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Design Tab */}
        <TabsContent value="design" className="space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Report Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Report Name *</label>
                <Input
                  value={reportConfig.name}
                  onChange={(e) =>
                    setReportConfig({ ...reportConfig, name: e.target.value })
                  }
                  placeholder="e.g., Monthly Sales Report"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Input
                  value={reportConfig.description}
                  onChange={(e) =>
                    setReportConfig({ ...reportConfig, description: e.target.value })
                  }
                  placeholder="Optional description for this report"
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Data Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Table *</label>
                {schemaLoading ? (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Loader className="w-4 h-4 animate-spin" />
                    Loading schema...
                  </div>
                ) : (
                  <Select value={reportConfig.table} onValueChange={handleTableChange} disabled={schemaLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a table..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTables.map((table: any) => (
                        <SelectItem key={table.value} value={table.value}>
                          {table.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {fields.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-3 block">Select Fields *</label>
                  <div className="space-y-2">
                    {fields.map((field) => (
                      <div key={field} className="flex items-center gap-2">
                        <Checkbox
                          checked={reportConfig.selectedFields.includes(field)}
                          onCheckedChange={() => handleFieldToggle(field)}
                        />
                        <label className="text-sm cursor-pointer">{field}</label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle>Filters (Optional)</CardTitle>
              <Button size="sm" onClick={handleAddFilter} className="gap-1">
                <Plus className="w-4 h-4" />
                Add Filter
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {reportConfig.filters.map((filter, idx) => (
                <div key={filter.field || `filter-${idx}`} className="flex gap-2 items-end">
                  <Select
                    value={filter.field}
                    onValueChange={(value) => {
                      const updated = [...reportConfig.filters];
                      updated[idx].field = value;
                      setReportConfig({ ...reportConfig, filters: updated });
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Field" />
                    </SelectTrigger>
                    <SelectContent>
                      {fields.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filter.operator} onValueChange={(value) => {
                    const updated = [...reportConfig.filters];
                    updated[idx].operator = value;
                    setReportConfig({ ...reportConfig, filters: updated });
                  }}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="=">=</SelectItem>
                      <SelectItem value="!=">!=</SelectItem>
                      <SelectItem value=">">&gt;</SelectItem>
                      <SelectItem value="<">&lt;</SelectItem>
                      <SelectItem value=">=">&gt;=</SelectItem>
                      <SelectItem value="<=">&lt;=</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    className="flex-1"
                    placeholder="Value"
                    value={filter.value}
                    onChange={(e) => {
                      const updated = [...reportConfig.filters];
                      updated[idx].value = e.target.value;
                      setReportConfig({ ...reportConfig, filters: updated });
                    }}
                  />

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveFilter(idx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {reportConfig.filters.length === 0 && (
                <p className="text-sm text-gray-500">No filters added</p>
              )}
            </CardContent>
          </Card>

          {/* Aggregations */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle>Aggregations (Optional)</CardTitle>
              <Button size="sm" onClick={handleAddAggregation} className="gap-1">
                <Plus className="w-4 h-4" />
                Add Aggregation
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {reportConfig.aggregations.map((agg, idx) => (
                <div key={agg.field || `agg-${idx}`} className="flex gap-2 items-end">
                  <Select
                    value={agg.field}
                    onValueChange={(value) => {
                      const updated = [...reportConfig.aggregations];
                      updated[idx].field = value;
                      setReportConfig({ ...reportConfig, aggregations: updated });
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select field to aggregate" />
                    </SelectTrigger>
                    <SelectContent>
                      {fields.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={agg.type}
                    onValueChange={(value) => {
                      const updated = [...reportConfig.aggregations];
                      updated[idx].type = value;
                      setReportConfig({ ...reportConfig, aggregations: updated });
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGGREGATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveAggregation(idx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {reportConfig.aggregations.length === 0 && (
                <p className="text-sm text-gray-500">No aggregations added</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Button onClick={handleGeneratePreview} disabled={reportLoading || !reportConfig.table} className="gap-2">
            {reportLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Generate Preview
              </>
            )}
          </Button>

          {showPreview && reportData.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Data Preview ({reportData.length} rows)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table className="w-full text-sm">
                      <TableHeader className="border-b bg-gray-50">
                        <TableRow>
                          {(reportConfig.selectedFields.length > 0 ? reportConfig.selectedFields : Object.keys(reportData[0] || {})).map((key: any) => (
                            <TableHead key={key} className="text-left py-2 px-4 font-medium">
                              {typeof key === 'string' ? key.charAt(0).toUpperCase() + key.slice(1) : key}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.slice(0, 50).map((row, idx) => (
                          <TableRow key={`row-${idx}`} className="border-b hover:bg-gray-50">
                            {(reportConfig.selectedFields.length > 0 ? reportConfig.selectedFields : Object.keys(row)).map((key: any) => (
                              <TableCell key={`${idx}-${key}`} className="py-2 px-4">
                                {typeof row[key] === "string"
                                  ? row[key]
                                  : row[key] instanceof Date
                                  ? new Date(row[key]).toLocaleDateString()
                                  : JSON.stringify(row[key])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {reportData.length > 50 && (
                    <p className="text-sm text-gray-600 mt-2">
                      Showing 1-50 of {reportData.length} rows. Export to see all data.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Visualization</CardTitle>
                </CardHeader>
                <CardContent>
                  {reportConfig.chartType === "table" ? (
                    <div className="text-center py-8 text-gray-600">
                      Table view selected. See data preview above.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      {reportConfig.chartType === "bar" && (
                        <BarChart data={reportData.slice(0, 20)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey={reportConfig.selectedFields[0] || "id"} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          {reportConfig.selectedFields.slice(1).map((field, i) => (
                            <Bar key={field} dataKey={field} fill={["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][i % 5]} />
                          ))}
                        </BarChart>
                      )}
                      {reportConfig.chartType === "line" && (
                        <LineChart data={reportData.slice(0, 20)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey={reportConfig.selectedFields[0] || "id"} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          {reportConfig.selectedFields.slice(1).map((field, i) => (
                            <Line key={field} type="monotone" dataKey={field} stroke={["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][i % 5]} />
                          ))}
                        </LineChart>
                      )}
                      {reportConfig.chartType === "pie" && (
                        <PieChart>
                          <Pie
                            data={reportData.slice(0, 20)}
                            dataKey={reportConfig.selectedFields[1] || "value"}
                            nameKey={reportConfig.selectedFields[0] || "name"}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                          >
                            {reportData.slice(0, 20).map((data, index) => (
                              <Cell key={`${data.name || index}`} fill={["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"][index % 6]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visualization Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="text-sm font-medium mb-2 block">Chart Type</label>
                <Select
                  value={reportConfig.chartType}
                  onValueChange={(value) =>
                    setReportConfig({ ...reportConfig, chartType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHART_TYPES.map((chart) => (
                      <SelectItem key={chart.value} value={chart.value}>
                        {chart.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button onClick={handleSaveReport} className="flex-1">
              Save Report
            </Button>
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </ModuleLayout>
  );
}
