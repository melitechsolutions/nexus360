import { useState } from "react";
import { RefreshCw, Database, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { toast } from "sonner";

export default function OfflineSync() {
  const [deviceId, setDeviceId] = useState("");
  const syncMutation = trpc.mobileApp.initializeOfflineSync.useMutation({
    onSuccess: (data) => toast.success(`Sync initialized for device ${data.deviceId}`),
    onError: (err) => toast.error(err.message),
  });

  return (
    <ModuleLayout
      title="Offline Sync"
      icon={<RefreshCw className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "System" }, { label: "Offline Sync" }]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border-2 border-blue-200 shadow-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Initialize Sync</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Device ID</label>
              <input type="text" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="Enter device identifier" className="w-full p-2 border-2 border-gray-300 rounded" />
            </div>
            <button
              onClick={() => { if (deviceId) syncMutation.mutate({ deviceId, entities: ["contacts", "leads", "deals"] }); }}
              disabled={!deviceId || syncMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded font-semibold transition flex items-center justify-center gap-2"
            >
              {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync Now
            </button>
          </div>
        </div>

        {syncMutation.data && (
          <div className="bg-white p-6 rounded-lg border-2 border-green-200 shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Sync Result</h2>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-gray-700">Device</span><span className="font-semibold">{syncMutation.data.deviceId}</span></div>
              <div className="flex justify-between"><span className="text-gray-700">Sync Token</span><span className="font-semibold text-xs truncate max-w-[200px]">{syncMutation.data.syncToken}</span></div>
              <div className="flex justify-between"><span className="text-gray-700">Entities</span><span className="font-semibold">{syncMutation.data.entities?.join(", ")}</span></div>
              <div className="flex justify-between"><span className="text-gray-700">Queued Changes</span><span className="font-semibold">{syncMutation.data.queuedChanges}</span></div>
              <div className="flex justify-between"><span className="text-gray-700">Last Sync</span><span className="font-semibold">{new Date(syncMutation.data.lastSync).toLocaleString()}</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-blue-200 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Sync Entities</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {["contacts", "leads", "deals", "tasks", "notes", "documents"].map((entity) => (
            <div key={entity} className="p-3 bg-blue-50 rounded text-center">
              <Database className="h-5 w-5 mx-auto text-blue-600 mb-1" />
              <p className="text-sm font-semibold text-gray-900 capitalize">{entity}</p>
            </div>
          ))}
        </div>
      </div>
    </ModuleLayout>
  );
}
