import React, { useState } from "react";
import { Settings, Plus, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function RuleBuilder() {
  const { data, isLoading, error } = trpc.automationRules.listRules.useQuery({});
  const utils = trpc.useUtils();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");

  const createRule = trpc.automationRules.createRule.useMutation({
    onSuccess: () => {
      toast.success("Rule created");
      utils.automationRules.listRules.invalidate();
      setShowNew(false);
      setNewName("");
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to create rule"),
  });

  const rules: any[] = (data as any)?.rules ?? (data as any) ?? [];
  const activeCount = rules.filter((r: any) => r.enabled || r.status === "active").length;
  const totalExecs = rules.reduce((s: number, r: any) => s + (r.executionCount ?? r.executions ?? 0), 0);

  return (
    <ModuleLayout
      title="Rule Builder"
      icon={<Settings className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "System" },
        { label: "Rule Builder" },
      ]}
    >
      <div className="flex justify-end">
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New Rule
        </button>
      </div>

      {showNew && (
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h2 className="text-lg font-semibold mb-4">Create New Rule</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Rule Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., High Alert"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => createRule.mutate({ name: newName } as any)}
                disabled={createRule.isPending || !newName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createRule.isPending ? "Creating..." : "Create Rule"}
              </button>
              <button
                onClick={() => setShowNew(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error.message}</div>
      ) : rules.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No rules found</p>
      ) : (
        <>
          <div className="space-y-3">
            {rules.map((rule: any) => (
              <div key={rule.id} className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{rule.name ?? "\u2014"}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          rule.enabled || rule.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {rule.enabled || rule.status === "active" ? "\uD83D\uDFE2 Active" : "\u26AA Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 ml-6">
                      {rule.condition ?? rule.description ?? "\u2014"}
                    </p>
                  </div>
                </div>
                <div className="ml-6 pt-2 border-t">
                  <div className="text-xs text-gray-600">
                    Executed {rule.executionCount ?? rule.executions ?? 0} times
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Rule Statistics</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{rules.length}</div>
                <div className="text-sm text-gray-600">Total Rules</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{activeCount}</div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{totalExecs}</div>
                <div className="text-sm text-gray-600">Total Executions</div>
              </div>
            </div>
          </div>
        </>
      )}
    </ModuleLayout>
  );
}
