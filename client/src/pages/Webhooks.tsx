import { Bell, Loader2, CheckCircle } from "lucide-react";
import { Webhook } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function Webhooks() {
  const { data: webhookData, isLoading, refetch } = trpc.developerTools.listWebhooks.useQuery({ limit: 50 });
  const manage = trpc.developerTools.manageWebhooks.useMutation({ onSuccess: () => { toast.success("Webhook updated"); refetch(); } });

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-rose-600" /></div>;

  const wh = webhookData ? JSON.parse(JSON.stringify(webhookData)) : { webhooks: [], total: 0 };
  const active = wh.webhooks.filter((w: any) => w.isActive);

  return (
    <ModuleLayout
      title="Webhooks"
      icon={<Webhook className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Settings" }, { label: "Webhooks" }]}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Webhooks", value: String(wh.total ?? 0), icon: Bell },
          { label: "Active", value: String(active.length), icon: CheckCircle },
          { label: "Inactive", value: String(wh.webhooks.length - active.length), icon: Bell },
          { label: "Total Registered", value: String(wh.webhooks.length), icon: Webhook },
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-lg border-2 border-rose-200 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
              </div>
              <card.icon className="w-10 h-10 text-rose-600 opacity-20" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-rose-200 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Registered Webhooks</h2>
        {wh.webhooks.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No webhooks configured.</p>
        ) : (
          <div className="space-y-2">
            {wh.webhooks.map((hook: any, idx: number) => (
              <div key={hook.id ?? idx} className="p-3 bg-gray-50 rounded border-l-4 border-rose-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{hook.events?.join(", ") ?? hook.url ?? "Webhook"}</p>
                    <p className="text-xs text-gray-600 font-mono">{hook.url}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    hook.isActive ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  }`}>{hook.isActive ? "active" : "paused"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
