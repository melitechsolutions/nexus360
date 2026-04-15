import { Brain, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { toast } from "sonner";

export default function NlpProcessor() {
  const agents = trpc.aiAgents.listAgents.useQuery({ limit: 50 });
  const configureNlp = trpc.aiAgents.implementNlpProcessing.useMutation({
    onSuccess: () => { toast.success("NLP processing configured"); agents.refetch(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <ModuleLayout
      title="NLP Processor"
      icon={<Brain className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "AI" }, { label: "NLP Processor" }]}
    >
      {agents.isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
      ) : agents.error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Failed to load NLP data</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg border-2 border-indigo-200 shadow-md">
              <p className="text-gray-600 text-sm font-semibold">Total Agents</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{agents.data?.total ?? 0}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border-2 border-indigo-200 shadow-md">
              <p className="text-gray-600 text-sm font-semibold">Active</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{(agents.data?.agents ?? []).filter((a: any) => a.status === "ACTIVE" || a.status === "OPERATIONAL").length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border-2 border-indigo-200 shadow-md">
              <p className="text-gray-600 text-sm font-semibold">NLP Tasks</p>
              <button
                onClick={() => configureNlp.mutate({ nlpTasks: ["sentiment_analysis", "entity_extraction", "intent_classification", "summarization"] })}
                disabled={configureNlp.isPending}
                className="mt-2 px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {configureNlp.isPending ? "Configuring..." : "Configure NLP"}
              </button>
            </div>
            <div className="bg-white p-6 rounded-lg border-2 border-indigo-200 shadow-md">
              <p className="text-gray-600 text-sm font-semibold">Status</p>
              <p className="text-3xl font-bold text-green-600 mt-2">Ready</p>
            </div>
          </div>

          {configureNlp.data && (
            <div className="bg-white p-6 rounded-lg border-2 border-green-200 shadow-md">
              <h2 className="text-xl font-bold text-gray-900 mb-4">NLP Configuration Result</h2>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-gray-700">Config ID</span><span className="font-semibold">{configureNlp.data.nlpConfigId}</span></div>
                <div className="flex justify-between"><span className="text-gray-700">Status</span><span className="font-semibold text-green-600">{configureNlp.data.status}</span></div>
                <div className="flex justify-between"><span className="text-gray-700">Tasks</span><span className="font-semibold">{configureNlp.data.tasks?.join(", ")}</span></div>
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-lg border-2 border-indigo-200 shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">AI Agents</h2>
            <div className="space-y-2">
              {(agents.data?.agents ?? []).map((agent: any) => (
                <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-semibold text-gray-900">{agent.agentType}</p>
                    <p className="text-sm text-gray-600">{(agent.capabilities ?? []).join(", ")}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${agent.status === "ACTIVE" || agent.status === "OPERATIONAL" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                    {agent.status}
                  </span>
                </div>
              ))}
              {(agents.data?.agents?.length ?? 0) === 0 && (
                <p className="text-center text-gray-500 py-8">No agents available</p>
              )}
            </div>
          </div>
        </>
      )}
    </ModuleLayout>
  );
}
