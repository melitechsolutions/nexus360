import { MessageSquare, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { toast } from "sonner";

export default function ChatbotAgent() {
  const agents = trpc.aiAgents.listAgents.useQuery({ limit: 50 });
  const createAgent = trpc.aiAgents.configureAutonomousAgent.useMutation({
    onSuccess: () => { toast.success("Agent configured"); agents.refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const chatbots = (agents.data?.agents ?? []).filter((a: any) => a.agentType === "chatbot" || a.agentType === "assistant");

  return (
    <ModuleLayout
      title="Chatbot Agent"
      icon={<MessageSquare className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "AI" }, { label: "Chatbot Agent" }]}
    >
      {agents.isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-violet-600" /></div>
      ) : agents.error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Failed to load agents</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg border-2 border-violet-200 shadow-md">
              <p className="text-gray-600 text-sm font-semibold">Total Agents</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{agents.data?.total ?? 0}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border-2 border-violet-200 shadow-md">
              <p className="text-gray-600 text-sm font-semibold">Chatbots</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{chatbots.length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border-2 border-violet-200 shadow-md">
              <p className="text-gray-600 text-sm font-semibold">Active</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{(agents.data?.agents ?? []).filter((a: any) => a.status === "ACTIVE").length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border-2 border-violet-200 shadow-md">
              <p className="text-gray-600 text-sm font-semibold">Configure New</p>
              <button
                onClick={() => createAgent.mutate({ agentType: "chatbot", capabilities: ["conversation", "faq", "escalation"] })}
                disabled={createAgent.isPending}
                className="mt-2 px-3 py-1 bg-violet-600 text-white rounded text-sm hover:bg-violet-700 disabled:bg-gray-400"
              >
                {createAgent.isPending ? "Creating..." : "+ New Chatbot"}
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border-2 border-violet-200 shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Agents</h2>
            <div className="space-y-2">
              {(agents.data?.agents ?? []).map((agent: any) => (
                <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-semibold text-gray-900">{agent.agentType}</p>
                    <p className="text-sm text-gray-600">{(agent.capabilities ?? []).join(", ")}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${agent.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                    {agent.status}
                  </span>
                </div>
              ))}
              {(agents.data?.agents?.length ?? 0) === 0 && (
                <p className="text-center text-gray-500 py-8">No agents configured yet</p>
              )}
            </div>
          </div>
        </>
      )}
    </ModuleLayout>
  );
}
