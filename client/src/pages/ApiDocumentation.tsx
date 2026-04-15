import { Code, BookOpen, Terminal, Zap, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function ApiDocumentation() {
  const { data: docs, isLoading } = trpc.developerTools.generateApiDocumentation.useQuery({ format: "openapi", version: "1.0" });

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;

  const d = docs ? JSON.parse(JSON.stringify(docs)) : {} as any;
  const endpoints = d.endpoints ?? d.paths ?? [];
  const endpointList = Array.isArray(endpoints) ? endpoints : Object.entries(endpoints).map(([path, methods]: any) => ({ path, ...methods }));

  return (
    <ModuleLayout
      title="API Documentation"
      icon={<BookOpen className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Tools" }, { label: "API Documentation" }]}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Endpoints", value: String(endpointList.length || d.totalEndpoints || 0), icon: Code },
          { label: "Format", value: d.format ?? "OpenAPI", icon: Terminal },
          { label: "Version", value: d.version ?? "1.0", icon: BookOpen },
          { label: "Status", value: d.status ?? "Generated", icon: Zap },
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-lg border-2 border-green-200 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
              </div>
              <card.icon className="w-10 h-10 text-green-600 opacity-20" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-green-200 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">API Endpoints</h2>
        {endpointList.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No endpoint documentation available.</p>
        ) : (
          <div className="space-y-3">
            {endpointList.slice(0, 20).map((ep: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded border-l-4 border-green-500">
                {ep.method && (
                  <span className={`px-3 py-1 rounded font-bold text-white text-sm ${
                    ep.method === "GET" ? "bg-blue-600" :
                    ep.method === "POST" ? "bg-green-600" :
                    ep.method === "PUT" ? "bg-orange-600" :
                    "bg-red-600"
                  }`}>{ep.method}</span>
                )}
                <div className="flex-1">
                  <p className="font-mono text-sm font-semibold text-gray-900">{ep.path ?? ep.name ?? ep.endpoint ?? "—"}</p>
                  <p className="text-xs text-gray-600">{ep.description ?? ep.summary ?? ""}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {d.documentation && (
        <div className="bg-gray-900 text-white p-6 rounded-lg border-2 border-gray-700 shadow-md">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Terminal className="w-5 h-5" /> Generated Documentation
          </h2>
          <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-green-400 whitespace-pre-wrap">
            {typeof d.documentation === "string" ? d.documentation : JSON.stringify(d.documentation, null, 2)}
          </pre>
        </div>
      )}
    </ModuleLayout>
  );
}
