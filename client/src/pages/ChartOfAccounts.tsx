import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useRequireFeature } from "@/lib/permissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Eye, Plus, Search, Edit, Trash2, TrendingUp, TrendingDown, Loader2, DollarSign } from "lucide-react";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { ChartOfAccountsHierarchy } from "@/components/ChartOfAccountsHierarchy";
import { StatsCard } from "@/components/ui/stats-card";

export default function ChartOfAccounts() {
  const [, navigate] = useLocation();
  // Call all hooks unconditionally at top level
  const { allowed, isLoading: permissionLoading } = useRequireFeature("accounting:chart_of_accounts:view");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    accountCode: "",
    accountName: "",
    accountType: "asset" as "asset" | "liability" | "equity" | "revenue" | "expense" | "cost of goods sold" | "operating expense" | "capital expenditure" | "other income" | "other expense",
    parentAccountId: null as string | null,
    description: "",
    balance: 0,
  });

  const utils = trpc.useUtils();
  const { data: accounts = [], isLoading } = trpc.chartOfAccounts.list.useQuery();
  const { data: summaryData } = trpc.chartOfAccounts.getSummary.useQuery();

  const createAccountMutation = trpc.chartOfAccounts.create.useMutation({
    onSuccess: () => {
      toast.success("Account created successfully!");
      utils.chartOfAccounts.list.invalidate();
      utils.chartOfAccounts.getSummary.invalidate();
      setIsCreateDialogOpen(false);
      setNewAccount({
        accountCode: "",
        accountName: "",
        accountType: "asset",
        parentAccountId: null,
        description: "",
        balance: 0,
      });
    },
    onError: (error: any) => {
      toast.error(`Failed to create account: ${error?.message || String(error)}`);
    },
  });

  const deleteAccountMutation = trpc.chartOfAccounts.delete.useMutation({
    onSuccess: () => {
      toast.success("Account deleted successfully!");
      utils.chartOfAccounts.list.invalidate();
      utils.chartOfAccounts.getSummary.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Failed to delete account: ${error?.message || String(error)}`);
    },
  });

  const getTypeColor = (type: string) => {
    const colors = {
      asset: "text-blue-600 bg-blue-100",
      liability: "text-red-600 bg-red-100",
      equity: "text-purple-600 bg-purple-100",
      revenue: "text-green-600 bg-green-100",
      expense: "text-orange-600 bg-orange-100",
    };
    return colors[type as keyof typeof colors] || "text-gray-600 bg-gray-100";
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account: any) => {
      const matchesSearch =
        account.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.accountCode.includes(searchTerm);
      const matchesType = typeFilter === "all" || account.accountType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [accounts, searchTerm, typeFilter]);

  const summary = useMemo(() => {
    if (summaryData) return summaryData;
    return {
      totalAssets: accounts.filter((a: any) => a.accountType === "asset").reduce((sum: number, a: any) => sum + (a.balance || 0), 0),
      totalLiabilities: accounts.filter((a: any) => a.accountType === "liability").reduce((sum: number, a: any) => sum + (a.balance || 0), 0),
      totalEquity: accounts.filter((a: any) => a.accountType === "equity").reduce((sum: number, a: any) => sum + (a.balance || 0), 0),
      totalRevenue: accounts.filter((a: any) => a.accountType === "revenue").reduce((sum: number, a: any) => sum + (a.balance || 0), 0),
      totalExpenses: accounts.filter((a: any) => a.accountType === "expense").reduce((sum: number, a: any) => sum + (a.balance || 0), 0),
      totalCostOfGoodsSold: accounts.filter((a: any) => a.accountType === "cost of goods sold").reduce((sum: number, a: any) => sum + (a.balance || 0), 0),
      totalOperatingExpenses: accounts.filter((a: any) => a.accountType === "operating expense").reduce((sum: number, a: any) => sum + (a.balance || 0), 0),
      totalCapitalExpenditure: accounts.filter((a: any) => a.accountType === "capital expenditure").reduce((sum: number, a: any) => sum + (a.balance || 0), 0),
      totalOtherIncome: accounts.filter((a: any) => a.accountType === "other income").reduce((sum: number, a: any) => sum + (a.balance || 0), 0),
      totalOtherExpenses: accounts.filter((a: any) => a.accountType === "other expense").reduce((sum: number, a: any) => sum + (a.balance || 0), 0),
    };
  }, [accounts, summaryData]);

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.accountCode || !newAccount.accountName) {
      toast.error("Account code and name are required");
      return;
    }
    createAccountMutation.mutate({
      ...newAccount,
      balance: Number(newAccount.balance) * 100, // Store in cents
    });
  };

  const handleDeleteAccount = (id: string, code: string) => {
    if (confirm(`Are you sure you want to delete account ${code}?`)) {
      deleteAccountMutation.mutate(id);
    }
  };

  // Permission checks - safe to do after all hooks are called
  if (permissionLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <ModuleLayout
      title="Chart of Accounts"
      description="Manage your accounting chart of accounts"
      icon={<BookOpen className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Accounting", href: "/accounting" },
        { label: "Chart of Accounts", href: "/chart-of-accounts" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleCreateAccount}>
                <DialogHeader>
                  <DialogTitle>Create New Account</DialogTitle>
                  <DialogDescription>Add a new account to your chart of accounts</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Account Code</Label>
                      <Input 
                        id="code" 
                        placeholder="e.g., 1000" 
                        value={newAccount.accountCode}
                        onChange={(e) => setNewAccount({ ...newAccount, accountCode: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Account Type</Label>
                      <Select 
                        value={newAccount.accountType}
                        onValueChange={(value: any) => setNewAccount({ ...newAccount, accountType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asset">Asset</SelectItem>
                          <SelectItem value="liability">Liability</SelectItem>
                          <SelectItem value="equity">Equity</SelectItem>
                          <SelectItem value="revenue">Revenue</SelectItem>
                          <SelectItem value="expense">Expense</SelectItem>
                          <SelectItem value="cost of goods sold">Cost of Goods Sold</SelectItem>
                          <SelectItem value="operating expense">Operating Expense</SelectItem>
                          <SelectItem value="capital expenditure">Capital Expenditure</SelectItem>
                          <SelectItem value="other income">Other Income</SelectItem>
                          <SelectItem value="other expense">Other Expense</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Account Name</Label>
                    <Input 
                      id="name" 
                      placeholder="Enter account name" 
                      value={newAccount.accountName}
                      onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent">Parent Account (Optional)</Label>
                    <Select 
                      value={newAccount.parentAccountId || "none"}
                      onValueChange={(value) => setNewAccount({ ...newAccount, parentAccountId: value === "none" ? null : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Top Level)</SelectItem>
                        {accounts.map((account: any) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.accountCode} - {account.accountName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Enter account description" 
                      rows={3} 
                      value={newAccount.description}
                      onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="balance">Opening Balance (Ksh)</Label>
                    <Input 
                      id="balance" 
                      type="number" 
                      placeholder="0" 
                      value={newAccount.balance}
                      onChange={(e) => setNewAccount({ ...newAccount, balance: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createAccountMutation.isPending}>
                    {createAccountMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create Account
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <StatsCard
            label="Total Assets"
            value={<>Ksh {(summary.totalAssets / 100).toLocaleString()}</>}
            icon={<TrendingUp className="h-5 w-5" />}
            color="border-l-blue-500"
          />

          <StatsCard
            label="Total Liabilities"
            value={<>Ksh {(summary.totalLiabilities / 100).toLocaleString()}</>}
            icon={<TrendingDown className="h-5 w-5" />}
            color="border-l-red-500"
          />

          <StatsCard
            label="Total Equity"
            value={<>Ksh {(summary.totalEquity / 100).toLocaleString()}</>}
            icon={<BookOpen className="h-5 w-5" />}
            color="border-l-purple-500"
          />

          <StatsCard
            label="Total Revenue"
            value={<>Ksh {(summary.totalRevenue / 100).toLocaleString()}</>}
            icon={<TrendingUp className="h-5 w-5" />}
            color="border-l-green-500"
          />

          <StatsCard
            label="Total Expenses"
            value={<>Ksh {(summary.totalExpenses / 100).toLocaleString()}</>}
            icon={<TrendingDown className="h-5 w-5" />}
            color="border-l-orange-500"
          />
        </div>

        <Tabs defaultValue="list" className="w-full">
          <TabsList>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="hierarchy">Hierarchy View</TabsTrigger>
          </TabsList>

          <TabsContent value="hierarchy" className="space-y-6">
            <ChartOfAccountsHierarchy />
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>All Accounts</CardTitle>
                <CardDescription>View and manage your chart of accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search accounts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="asset">Assets</SelectItem>
                      <SelectItem value="liability">Liabilities</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="expense">Expenses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                            Loading accounts...
                          </TableCell>
                        </TableRow>
                      ) : filteredAccounts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No accounts found
                          </TableCell>
                        </TableRow>
                        ) : (
                        filteredAccounts.map((account: any) => (
                          <TableRow key={account.id}>
                            <TableCell className="font-medium">{account.accountCode}</TableCell>
                            <TableCell>{account.accountName}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(account.accountType)}`}>
                                {(account.accountType || 'asset').toUpperCase()}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              Ksh {(Number(account.balance || 0) / 100).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="View"
                                  onClick={() => navigate(`/chart-of-accounts/${account.id}`)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => navigate(`/chart-of-accounts/${account.id}/edit`)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteAccount(account.id, account.accountCode)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ModuleLayout>
  );
}
