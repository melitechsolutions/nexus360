import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { TrendingUp, AlertTriangle, CheckCircle, PieChart } from "lucide-react";
import { toast } from "sonner";

export function ExpenseBudgetReport() {
  const [selectedBudget, setSelectedBudget] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch budget allocation report
  const { data: report, isLoading: isLoadingReport, refetch } = trpc.expenses.getBudgetAllocationReport.useQuery({
    // we use a sentinel value for "all" because Radix Select items cannot
    // have an empty-string value.  Convert it back to undefined for the
    // query so the backend treats it as no filter.
    budgetAllocationId:
      selectedBudget === "all" ? undefined : selectedBudget || undefined,
  });

  // Fetch available budget allocations for filter dropdown
  const { data: budgetAllocations } = trpc.expenses.getAvailableBudgetAllocations.useQuery({});

  const filteredReport = report?.filter((item: any) =>
    item.categoryName?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusBadge = (utilizationPercentage: number) => {
    if (utilizationPercentage >= 100) {
      return <Badge className="bg-red-500">Over Budget</Badge>;
    } else if (utilizationPercentage >= 80) {
      return <Badge className="bg-amber-500">Warning</Badge>;
    } else if (utilizationPercentage >= 50) {
      return <Badge className="bg-blue-500">On Track</Badge>;
    } else {
      return <Badge className="bg-green-500">Under Budget</Badge>;
    }
  };

  const getStatusColor = (utilizationPercentage: number) => {
    if (utilizationPercentage >= 100) return "text-red-600";
    if (utilizationPercentage >= 80) return "text-amber-600";
    if (utilizationPercentage >= 50) return "text-blue-600";
    return "text-green-600";
  };

  const getTotalStats = () => {
    if (!report || report.length === 0) return { total: 0, spent: 0, remaining: 0 };
    
    return {
      total: report.reduce((sum: number, item: any) => sum + item.allocatedAmount, 0),
      spent: report.reduce((sum: number, item: any) => sum + item.spentAmount, 0),
      remaining: report.reduce((sum: number, item: any) => sum + item.remaining, 0),
    };
  };

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Total Allocated</p>
              <p className="text-2xl font-bold">Ksh {(stats.total / 100).toLocaleString('en-KE')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Spent on Expenses</p>
              <p className="text-2xl font-bold text-amber-600">Ksh {(stats.spent / 100).toLocaleString('en-KE')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Remaining</p>
              <p className={`text-2xl font-bold ${stats.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                Ksh {(stats.remaining / 100).toLocaleString('en-KE')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Utilization</p>
              <p className={`text-2xl font-bold ${getStatusColor(Math.round((stats.spent / stats.total) * 100))}`}>
                {Math.round((stats.spent / stats.total) * 100)}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Budget Allocations
          </CardTitle>
          <CardDescription>View expenses linked to budget allocations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search by Category</label>
              <Input
                placeholder="Search budget categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Allocation</label>
              <Select value={selectedBudget} onValueChange={setSelectedBudget}>
                <SelectTrigger>
                  <SelectValue placeholder="All allocations" />
                </SelectTrigger>
                <SelectContent>
                  {/* sentinel value of "all" used instead of empty string */}
                  <SelectItem value="all">All Allocations</SelectItem>
                  {Array.isArray(budgetAllocations) && budgetAllocations.map((budget: any) => (
                    <SelectItem key={budget.id} value={budget.id}>
                      {budget.categoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => refetch()}
                className="w-full"
              >
                Refresh Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Allocation Table */}
      <Card>
        <CardHeader>
          <CardTitle>Allocation Details</CardTitle>
          <CardDescription>{filteredReport.length} allocation(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingReport ? (
            <div className="text-center py-8 text-gray-600">Loading report...</div>
          ) : filteredReport.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              No budget allocations found. Create allocations in the Budget Dashboard to track expenses.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Category</th>
                    <th className="text-right py-3 px-4 font-semibold">Allocated</th>
                    <th className="text-right py-3 px-4 font-semibold">Spent</th>
                    <th className="text-right py-3 px-4 font-semibold">Remaining</th>
                    <th className="text-center py-3 px-4 font-semibold">Utilization</th>
                    <th className="text-center py-3 px-4 font-semibold">Expenses</th>
                    <th className="text-center py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReport.map((item: any) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">
                        {item.categoryName}
                      </td>
                      <td className="text-right py-3 px-4">
                        Ksh {(item.allocatedAmount / 100).toLocaleString('en-KE')}
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={item.spentAmount > item.allocatedAmount ? "text-red-600 font-semibold" : ""}>
                          Ksh {(item.spentAmount / 100).toLocaleString('en-KE')}
                        </span>
                      </td>
                      <td className={`text-right py-3 px-4 ${item.remaining < 0 ? "text-red-600 font-semibold" : ""}`}>
                        Ksh {(item.remaining / 100).toLocaleString('en-KE')}
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-32 bg-gray-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                item.utilizationPercentage >= 100 ? "bg-red-500" :
                                item.utilizationPercentage >= 80 ? "bg-amber-500" :
                                item.utilizationPercentage >= 50 ? "bg-blue-500" :
                                "bg-green-500"
                              }`}
                              style={{ width: `${Math.min(item.utilizationPercentage, 100)}%` }}
                            />
                          </div>
                          <span className={`font-semibold text-sm min-w-12 ${getStatusColor(item.utilizationPercentage)}`}>
                            {item.utilizationPercentage}%
                          </span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <Badge variant="outline" className="bg-blue-50">
                          {item.linkedExpenses}
                        </Badge>
                      </td>
                      <td className="text-center py-3 px-4">
                        {getStatusBadge(item.utilizationPercentage)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warning Cards for Over Budget Items */}
      {filteredReport.some((item: any) => item.utilizationPercentage > 100) && (
        <Card className="border-red-500 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Budget Overages Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {filteredReport
                .filter((item: any) => item.utilizationPercentage > 100)
                .map((item: any) => (
                  <li key={item.id} className="flex justify-between items-center p-3 bg-white rounded border border-red-200">
                    <span className="font-medium">{item.categoryName}</span>
                    <span className="text-red-600 font-bold">
                      Overspent by Ksh {((item.spentAmount - item.allocatedAmount) / 100).toLocaleString('en-KE')}
                    </span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
