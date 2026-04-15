import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useCurrencySettings } from "@/lib/currency";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Coins,
  Loader2,
  PiggyBank,
} from "lucide-react";

export default function BudgetDetails() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { code: currencyCode } = useCurrencySettings();

  const { data: budget, isLoading } = trpc.budgets.getById.useQuery(params.id!, {
    enabled: !!params.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Budget not found</p>
        <Button variant="outline" onClick={() => setLocation("/budgets")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Budgets
        </Button>
      </div>
    );
  }

  const spent = budget.amount - budget.remaining;
  const percentage = budget.amount > 0 ? Math.min(100, Math.round((spent / budget.amount) * 100)) : 0;
  const progressColor =
    percentage >= 90 ? "bg-red-500" : percentage >= 70 ? "bg-yellow-500" : "bg-green-500";
  const statusLabel = percentage >= 90 ? "Critical" : percentage >= 70 ? "Warning" : "On Track";
  const statusClass =
    percentage >= 90
      ? "bg-red-100 text-red-800"
      : percentage >= 70
      ? "bg-yellow-100 text-yellow-800"
      : "bg-green-100 text-green-800";

  return (
    <ModuleLayout
      title={`${budget.departmentName || "Department"} Budget`}
      description="Budget Details"
      icon={<PiggyBank className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Accounting", href: "/accounting" },
        { label: "Budgets", href: "/budgets" },
        { label: budget.departmentName || "Budget" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation(`/budgets/${budget.id}/edit`)}>
            Edit Budget
          </Button>
          <Button variant="outline" onClick={() => setLocation("/budgets")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>
      }
    >
      <div className="max-w-4xl space-y-6">
        {/* Status Banner */}
        <div className="flex items-center justify-between">
          <Badge className={`text-sm px-3 py-1 ${statusClass}`}>
            {statusLabel}
          </Badge>
          {budget.createdAt && (
            <span className="text-sm text-muted-foreground">
              Created {new Date(budget.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Budget Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Budget Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-medium">{budget.departmentName || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Fiscal Year
                </p>
                <p className="font-medium">{budget.fiscalYear}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="w-4 h-4 text-green-600" />
              Financial Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="font-medium text-lg">
                  {currencyCode} {(budget.amount / 100).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Spent</p>
                <p className="font-medium text-lg text-red-600">
                  {currencyCode} {(spent / 100).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="font-medium text-lg text-green-600">
                  {currencyCode} {(budget.remaining / 100).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Budget utilization</span>
                <span className="font-medium">{percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`${progressColor} h-3 rounded-full transition-all`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
