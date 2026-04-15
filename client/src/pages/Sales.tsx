import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { TrendingUp, FileText, Briefcase, Receipt, Plus, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

export default function Sales() {
  const [, navigate] = useLocation();

  const salesModules = [
    {
      title: "Estimates",
      description: "Create and manage quotations for clients",
      icon: FileText,
      href: "/estimates",
      stats: { label: "Total Estimates", value: "0" },
      borderColor: "border-l-blue-500",
      iconBg: "bg-blue-50 dark:bg-blue-950",
      iconColor: "text-blue-500",
    },
    {
      title: "Opportunities",
      description: "Track and manage sales opportunities",
      icon: Briefcase,
      href: "/opportunities",
      stats: { label: "Active Opportunities", value: "0" },
      borderColor: "border-l-purple-500",
      iconBg: "bg-purple-50 dark:bg-purple-950",
      iconColor: "text-purple-500",
    },
    {
      title: "Receipts",
      description: "Manage payment receipts and confirmations",
      icon: Receipt,
      href: "/receipts",
      stats: { label: "Total Receipts", value: "0" },
      borderColor: "border-l-green-500",
      iconBg: "bg-green-50 dark:bg-green-950",
      iconColor: "text-green-500",
    },
  ];

  return (
    <ModuleLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Sales", href: "/sales" },
      ]}
      title="Sales"
      description="Manage estimates, opportunities, and receipts"
      icon={<TrendingUp className="w-6 h-6" />}
    >
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button onClick={() => navigate("/estimates/create")} className="gap-2">
            <Plus className="h-4 w-4" />
            New Estimate
          </Button>
          <Button onClick={() => navigate("/opportunities/create")} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            New Opportunity
          </Button>
          <Button onClick={() => navigate("/receipts/create")} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            New Receipt
          </Button>
        </div>

        {/* Sales Modules Grid - Unified Card Style */}
        <div className="grid gap-4 md:grid-cols-3">
          {salesModules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.title}
                onClick={() => navigate(module.href)}
                className={cn(
                  "group relative overflow-hidden rounded-xl border-l-4 p-4 sm:p-5 text-left transition-all duration-300",
                  "bg-white dark:bg-slate-800/60 border-t border-r border-b border-slate-200 dark:border-slate-700",
                  "hover:shadow-xl hover:-translate-y-1 cursor-pointer",
                  module.borderColor
                )}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.07] transition-opacity duration-300 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-lg ${module.iconBg}`}>
                      <Icon className={`h-5 w-5 ${module.iconColor}`} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-50">{module.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{module.description}</p>
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{module.stats.label}</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-50 mt-0.5">{module.stats.value}</p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500 bg-gradient-to-r from-transparent via-current to-transparent"></div>
              </button>
            );
          })}
        </div>
      </div>
    </ModuleLayout>
  );
}

