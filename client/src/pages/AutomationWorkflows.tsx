import React from "react";
import { Zap, Play, Pause, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function AutomationWorkflows() {
  const { data, isLoading, error } = trpc.automationRules.listRules.useQuery({});
  const utils = trpc.useUtils();

  const toggleStatus = trpc.automationRules.toggleRuleStatus.useMutation({
    onSuccess: () => {
      toast.success("Rule status updated");
      utils.automationRules.listRules.invalidate();
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to toggle status"),
  });

  const rules: any[] = (data as any)?.rules ?? (data as any) ?? [];
  const activeCount = rules.filter((r: any) => r.status === "active" || r.enabled).length;
  const totalExecs = rules.reduce((s: number, r: any) => s + (r.executions ?? r.executionCount ?? 0), 0);
  const avgSuccess = rules.length
    ? (rules.reduce((s: number, r: any) => s + (r.successRate ?? 0), 0) / rules.length).toFixed(1)
    : "0";

  return (
    <ModuleLayout
      title="Automation Workflows"
      icon={<Zap className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "System" },
        { label: "Automation Workflows" },
      ]}
    >
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error.message}</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Workflows</div>
              <div className="text-2xl font-bold">{rules.length}</div>
              <div className="text-xs text-blue-600">{activeCount} active</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Executions</div>
              <div className="text-2xl font-bold">{totalExecs.toLocaleString()}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Avg Success Rate</div>
              <div className="text-2xl font-bold">{avgSuccess}%</div>
            </div>
          </div>

          {rules.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No workflows found</p>
          ) : (
            <div className="space-y-3">
              {rules.map((workflow: any) => (
                <div key={workflow.id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{workflow.name ?? "\u2014"}</h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            workflow.status === "active" || workflow.enabled
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {workflow.status === "active" || workflow.enabled ? "\uD83D\uDFE2 Active" : "\u26AA Paused"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{workflow.trigger ?? workflow.description ?? "\u2014"}</p>
                    </div>
                    <button
                      onClick={() => toggleStatus.mutate({ ruleId: workflow.id })}
                      className="flex-shrink-0"
                      disabled={toggleStatus.isPending}
                    >
                      {workflow.status === "active" || workflow.enabled ? (
                        <Pause className="w-6 h-6 text-blue-600" />
                      ) : (
                        <Play className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-gray-600">Executions</div>
                      <div className="font-semibold">{workflow.executions ?? workflow.executionCount ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Success Rate</div>
                      <div className="font-semibold text-green-600">{workflow.successRate ?? 0}%</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Created</div>
                      <div className="font-semibold">{workflow.createdAt ?? workflow.created ?? "\u2014"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </ModuleLayout>
  );
}
