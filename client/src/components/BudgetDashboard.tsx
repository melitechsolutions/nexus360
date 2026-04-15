import React, { useState, useMemo } from "react";
import { TrendingUp, AlertTriangle, DollarSign, PieChart, BarChart3, TrendingDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import Button from "./Button";
import Toast from "./Toast";
import { useCurrencySettings } from "@/lib/currency";

interface BudgetSummary {
  year: number;
  projects: {
    total: number;
    spent: number;
    remaining: number;
    percentage: number;
  };
  departments: {
    total: number;
    spent: number;
    remaining: number;
    percentage: number;
    overBudgetCount: number;
  };
  combined: {
    total: number;
    spent: number;
    remaining: number;
  };
}

export function BudgetDashboard() {
  const { code: currencyCode } = useCurrencySettings();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const summaryQuery = trpc.budget.dashboard.summary.useQuery({ year: selectedYear });
  const byDepartmentQuery = trpc.budget.dashboard.byDepartment.useQuery({ year: selectedYear });
  const byProjectQuery = trpc.budget.dashboard.byProject.useQuery();
  const alertsQuery = trpc.budget.dashboard.alerts.useQuery();

  const summary = summaryQuery.data as BudgetSummary | undefined;

  const years = useMemo(() => {
    const years = [];
    for (let i = new Date().getFullYear(); i >= 2020; i--) {
      years.push(i);
    }
    return years;
  }, []);

  const getStatusColor = (percentage: number): string => {
    if (percentage >= 100) return "text-red-600 bg-red-50";
    if (percentage >= 80) return "text-orange-600 bg-orange-50";
    if (percentage >= 50) return "text-blue-600 bg-blue-50";
    return "text-green-600 bg-green-50";
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-orange-500";
    if (percentage >= 50) return "bg-blue-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Budget Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor and manage budget allocations across projects and departments</p>
        </div>
        <div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Budget Alerts */}
      {alertsQuery.data && alertsQuery.data.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Budget Alerts</h3>
              <p className="text-sm text-red-800 mt-1">
                {alertsQuery.data.length} item(s) over budget
              </p>
              <ul className="mt-2 space-y-1">
                {alertsQuery.data.slice(0, 3).map((alert) => (
                  <li key={alert.id} className="text-sm text-red-800 flex items-center justify-between">
                    <span>{alert.name}</span>
                    <span className="font-semibold">
                      {(alert.overage / 100).toLocaleString("en-US", {
                        style: "currency",
                        currency: currencyCode,
                      })}
                      over
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Combined Budget */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Overall Budget</h3>
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Total Budget</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(summary.combined.total / 100).toLocaleString("en-US", {
                    style: "currency",
                    currency: currencyCode,
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Spent</p>
                <p className="text-xl font-semibold text-gray-900">
                  {(summary.combined.spent / 100).toLocaleString("en-US", {
                    style: "currency",
                    currency: currencyCode,
                  })}
                </p>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <p className="text-sm text-gray-600">Remaining</p>
                <p className="text-xl font-semibold text-green-600">
                  {(summary.combined.remaining / 100).toLocaleString("en-US", {
                    style: "currency",
                    currency: currencyCode,
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Projects Budget */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Projects</h3>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm text-gray-600">Budget Used</p>
                  <span className="text-sm font-semibold text-gray-900">{summary.projects.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getProgressColor(summary.projects.percentage)}`}
                    style={{ width: `${Math.min(summary.projects.percentage, 100)}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-600">Budgeted</p>
                  <p className="font-semibold text-gray-900">
                    {(summary.projects.total / 100 / 1000).toFixed(1)}k
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Spent</p>
                  <p className="font-semibold text-gray-900">
                    {(summary.projects.spent / 100 / 1000).toFixed(1)}k
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Departments Budget */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Departments</h3>
              <BarChart3 className="w-5 h-5 text-green-600" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm text-gray-600">Budget Used</p>
                  <span className="text-sm font-semibold text-gray-900">{summary.departments.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getProgressColor(summary.departments.percentage)}`}
                    style={{ width: `${Math.min(summary.departments.percentage, 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-sm">
                <p className="text-red-600 font-semibold">
                  {summary.departments.overBudgetCount} over budget
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Department Breakdown */}
      {byDepartmentQuery.data && byDepartmentQuery.data.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Department Budgets</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Department</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Category</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Budgeted</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Spent</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Remaining</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Progress</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {byDepartmentQuery.data.map((dept: any) => (
                  <tr key={dept.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{dept.departmentId}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{dept.category || "-"}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900 font-medium">
                      {(dept.budgeted / 100).toLocaleString("en-US", {
                        style: "currency",
                        currency: currencyCode,
                      })}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900 font-medium">
                      {(dept.spent / 100).toLocaleString("en-US", {
                        style: "currency",
                        currency: currencyCode,
                      })}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium">
                      <span className={dept.remaining < 0 ? "text-red-600" : "text-green-600"}>
                        {(dept.remaining / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: currencyCode,
                        })}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getProgressColor(dept.percentage)}`}
                            style={{ width: `${Math.min(dept.percentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-8">{dept.percentage}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          dept.status === "over"
                            ? "bg-red-100 text-red-800"
                            : dept.status === "at"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {dept.status === "over" ? "Over" : dept.status === "at" ? "At" : "Under"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Project Breakdown */}
      {byProjectQuery.data && byProjectQuery.data.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Budgets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {byProjectQuery.data.map((project: any) => (
              <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm text-gray-600">Project ID</p>
                    <p className="font-semibold text-gray-900">{project.projectId}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded ${
                      project.status === "over"
                        ? "bg-red-100 text-red-800"
                        : project.status === "at"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {project.status === "over" ? "Over" : project.status === "at" ? "At" : "Under"}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600">Budgeted</p>
                      <p className="font-semibold text-gray-900">
                        {(project.budgeted / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: currencyCode,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Spent</p>
                      <p className="font-semibold text-gray-900">
                        {(project.spent / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: currencyCode,
                        })}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm text-gray-600">Progress</p>
                      <span className="text-sm font-semibold text-gray-900">{project.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getProgressColor(project.percentage)}`}
                        style={{ width: `${Math.min(project.percentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  {project.remaining < 0 && (
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-xs text-red-800 font-semibold">
                        Over by{" "}
                        {((Math.abs(project.remaining) / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: currencyCode,
                        }))}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

export default BudgetDashboard;
