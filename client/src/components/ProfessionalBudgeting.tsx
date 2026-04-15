import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { ModuleLayout } from '@/components/ModuleLayout';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Loader2,
} from 'lucide-react';

export default function ProfessionalBudgeting() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('budgets');
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('__all__');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [createFormData, setCreateFormData] = useState({
    budgetName: '',
    budgetDescription: '',
    departmentId: '',
    fiscalYear: new Date().getFullYear(),
    startDate: `${new Date().getFullYear()}-01-01`,
    endDate: `${new Date().getFullYear()}-12-31`,
    budgetLines: [] as Array<{ accountId: string; budgeted: number; description: string }>,
  });

  // Fetch departments
  const { data: departments } = trpc.departments.list.useQuery();

  // Fetch COA accounts
  const { data: coaAccounts } = trpc.chartOfAccounts.list.useQuery();

  // Fetch budgets
  const { data: budgets, isLoading: budgetsLoading, refetch: refetchBudgets } = trpc.professionalBudgeting.listBudgets.useQuery({
    departmentId: selectedDepartment && selectedDepartment !== '__all__' ? selectedDepartment : undefined,
    fiscalYear: selectedYear,
  });

  // Fetch budget template
  const { data: template } = trpc.professionalBudgeting.generateBudgetTemplate.useQuery({
    fiscalYear: selectedYear,
    departmentId: (selectedDepartment && selectedDepartment !== '__all__') ? selectedDepartment : (departments?.[0]?.id || ''),
  }, {
    enabled: ((selectedDepartment && selectedDepartment !== '__all__') || departments?.length === 1) && !!departments?.length,
  });

  // Mutations
  const createBudgetMutation = trpc.professionalBudgeting.createBudget.useMutation({
    onSuccess: async () => {
      toast.success('Budget created successfully');
      setCreateDialogOpen(false);
      setCreateFormData({
        budgetName: '',
        budgetDescription: '',
        departmentId: '',
        fiscalYear: new Date().getFullYear(),
        startDate: `${new Date().getFullYear()}-01-01`,
        endDate: `${new Date().getFullYear()}-12-31`,
        budgetLines: [],
      });
      await refetchBudgets();
    },
    onError: (error) => {
      toast.error(`Failed to create budget: ${error.message}`);
    },
  });

  const importBudgetMutation = trpc.professionalBudgeting.importBudgetFromCSV.useMutation({
    onSuccess: async () => {
      toast.success('Budget imported successfully');
      await refetchBudgets();
    },
    onError: (error) => {
      toast.error(`Failed to import budget: ${error.message}`);
    },
  });

  const approveBudgetMutation = trpc.professionalBudgeting.approveBudget.useMutation({
    onSuccess: async () => {
      toast.success('Budget approved');
      await refetchBudgets();
    },
    onError: (error) => {
      toast.error(`Failed to approve budget: ${error.message}`);
    },
  });

  // Handle file upload for budget import
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const content = await file.text();
      const lines = content.split('\n').filter(line => !line.startsWith('#') && line.trim());
      
      if (lines.length < 2) {
        toast.error('CSV file must have headers and at least one data row');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const csvData = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values[0]) {
          csvData.push({
            accountCode: values[0],
            accountName: values[1] || '',
            budgeted: parseInt(values[2]) || 0,
            description: values[3] || '',
          });
        }
      }

      if (csvData.length === 0) {
        toast.error('No valid budget lines found in CSV');
        return;
      }

      await importBudgetMutation.mutateAsync({
        budgetName: `Imported Budget - ${new Date().toLocaleDateString()}`,
        budgetDescription: 'Budget imported from CSV file',
        departmentId: selectedDepartment || departments?.[0]?.id || '',
        fiscalYear: selectedYear,
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`,
        csvData,
      });
    } catch (error) {
      toast.error(`Failed to parse CSV: ${error}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Handle create budget
  const handleCreateBudget = async () => {
    if (!createFormData.budgetName || !createFormData.departmentId || createFormData.budgetLines.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      await createBudgetMutation.mutateAsync({
        budgetName: createFormData.budgetName,
        budgetDescription: createFormData.budgetDescription,
        departmentId: createFormData.departmentId,
        fiscalYear: createFormData.fiscalYear,
        startDate: createFormData.startDate,
        endDate: createFormData.endDate,
        budgetLines: createFormData.budgetLines,
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Download template
  const downloadTemplate = () => {
    if (!template) {
      toast.error('Failed to load template');
      return;
    }

    const csv = [
      'accountCode,accountName,budgeted,description',
      ...template.csvData.map(line => 
        `${line.accountCode},"${line.accountName}",${line.budgeted},"${line.description}"`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `budget-template-FY${selectedYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <ModuleLayout
      title="Professional Budgeting"
      description="Create, manage, and track budgets with professional standards and detailed analysis"
      icon={<TrendingUp className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dashboard", href: "/crm-home" },
        { label: "Procurement", href: "/procurement" },
        { label: "Budgets", href: "/budgets" },
        { label: "Professional Budgeting" },
      ]}
    >
      <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Professional Budgeting</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Create, manage, and track budgets with professional standards
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 max-w-xs">
          <Label htmlFor="department">Department</Label>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger id="department">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All departments</SelectItem>
              {departments?.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 max-w-xs">
          <Label htmlFor="year">Fiscal Year</Label>
          <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
            <SelectTrigger id="year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  FY{year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="budgets">Active Budgets</TabsTrigger>
          <TabsTrigger value="create">Create Budget</TabsTrigger>
          <TabsTrigger value="import">Import from CSV</TabsTrigger>
        </TabsList>

        {/* Active Budgets Tab */}
        <TabsContent value="budgets" className="space-y-4">
          {budgetsLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              </CardContent>
            </Card>
          ) : budgets && budgets.length > 0 ? (
            <div className="space-y-4">
              {budgets.map(budget => (
                <Card key={budget.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{budget.budgetName}</CardTitle>
                        <CardDescription>{budget.budgetDescription}</CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                          {budget.budgetStatus}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Total Budget</p>
                        <p className="font-semibold">KES {(budget.totalBudgeted || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Actual Spend</p>
                        <p className="font-semibold">KES {(budget.totalActual || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Remaining</p>
                        <p className="font-semibold">KES {(budget.remaining || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Utilization</p>
                        <p className="font-semibold">{(budget.utilizationPercent || 0).toFixed(1)}%</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Budget Utilization</span>
                        <span className="font-semibold">{(budget.utilizationPercent || 0).toFixed(1)}%</span>
                      </div>
                      <Progress value={Math.min(budget.utilizationPercent || 0, 100)} />
                    </div>

                    {budget.budgetStatus === 'draft' && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          This budget is in draft status and needs to be approved before use.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-2">
                      {budget.budgetStatus === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => approveBudgetMutation.mutate({ budgetId: budget.id })}
                          disabled={approveBudgetMutation.isPending}
                        >
                          {approveBudgetMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Approving...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Approve Budget
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <p className="text-gray-500">No budgets found for selected criteria</p>
                  <Button onClick={() => setActiveTab('create')} variant="outline">
                    Create Budget
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Create Budget Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Budget</CardTitle>
              <CardDescription>Create a professional budget with detailed line items</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Budget Name *</Label>
                  <Input
                    id="name"
                    value={createFormData.budgetName}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, budgetName: e.target.value }))}
                    placeholder="e.g., Marketing Department Q1 2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dept">Department *</Label>
                  <Select value={createFormData.departmentId} onValueChange={(val) => setCreateFormData(prev => ({ ...prev, departmentId: val }))}>
                    <SelectTrigger id="dept">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Budget Description</Label>
                <Textarea
                  id="desc"
                  value={createFormData.budgetDescription}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, budgetDescription: e.target.value }))}
                  placeholder="Add details about this budget..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Fiscal Year</Label>
                  <Select value={createFormData.fiscalYear.toString()} onValueChange={(val) => setCreateFormData(prev => ({ ...prev, fiscalYear: parseInt(val) }))}>
                    <SelectTrigger id="year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start">Start Date</Label>
                  <Input
                    id="start"
                    type="date"
                    value={createFormData.startDate}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">End Date</Label>
                  <Input
                    id="end"
                    type="date"
                    value={createFormData.endDate}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Budget Lines */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Budget Line Items *</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCreateFormData(prev => ({
                        ...prev,
                        budgetLines: [...prev.budgetLines, { accountId: '', budgeted: 0, description: '' }],
                      }));
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Line
                  </Button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {createFormData.budgetLines.map((line, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Select value={line.accountId} onValueChange={(val) => {
                              const newLines = [...createFormData.budgetLines];
                              newLines[idx].accountId = val;
                              setCreateFormData(prev => ({ ...prev, budgetLines: newLines }));
                            }}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select account" />
                              </SelectTrigger>
                              <SelectContent>
                                {coaAccounts?.map(acc => (
                                  <SelectItem key={acc.id} value={acc.id}>
                                    {acc.accountCode} - {acc.accountName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={line.budgeted}
                              onChange={(e) => {
                                const newLines = [...createFormData.budgetLines];
                                newLines[idx].budgeted = parseFloat(e.target.value) || 0;
                                setCreateFormData(prev => ({ ...prev, budgetLines: newLines }));
                              }}
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={line.description}
                              onChange={(e) => {
                                const newLines = [...createFormData.budgetLines];
                                newLines[idx].description = e.target.value;
                                setCreateFormData(prev => ({ ...prev, budgetLines: newLines }));
                              }}
                              placeholder="Description"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const newLines = createFormData.budgetLines.filter((_, i) => i !== idx);
                                setCreateFormData(prev => ({ ...prev, budgetLines: newLines }));
                              }}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateBudget} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Budget'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import Budget from CSV</CardTitle>
              <CardDescription>Import a professional budget from a CSV file</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={downloadTemplate} variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download Budget Template (FY{selectedYear})
              </Button>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  CSV file format: accountCode, accountName, budgeted, description
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="csvFile">Select CSV File</Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  disabled={isUploading}
                />
              </div>

              {isUploading && (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Importing...</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </ModuleLayout>
  );
}
