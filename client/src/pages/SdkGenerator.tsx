import { Download, Package, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function SdkGenerator() {
  const { data: docs, isLoading } = trpc.developerTools.generateApiDocumentation.useQuery({ format: "openapi", version: "1.0" });
  const generate = trpc.developerTools.generateSdks.useMutation({ onSuccess: () => toast.success("SDK generation triggered") });

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-yellow-600" /></div>;

  const d = docs ? JSON.parse(JSON.stringify(docs)) : {} as any;
  const languages = ["JavaScript", "Python", "Java", ".NET", "Go", "Ruby", "PHP", "Swift"];

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-yellow-50 to-green-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">SDK Generator</h1>
          <p className="text-gray-600 mt-2">Generate client SDKs from API documentation</p>
        </div>
        <Package className="w-12 h-12 text-yellow-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Languages", value: String(languages.length), icon: Package },
          { label: "API Version", value: d.version ?? "1.0", icon: Download },
          { label: "Format", value: d.format ?? "OpenAPI", icon: Package },
          { label: "Status", value: d.status ?? "Ready", icon: Package },
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-lg border-2 border-yellow-200 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
              </div>
              <card.icon className="w-10 h-10 text-yellow-600 opacity-20" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-yellow-200 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Generate SDKs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {languages.map((lang) => (
            <div key={lang} className="p-4 border-2 border-yellow-100 rounded-lg hover:border-yellow-300 transition">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{lang} SDK</p>
                  <p className="text-sm text-gray-600">API v{d.version ?? "1.0"}</p>
                </div>
                <button
                  onClick={() => generate.mutate({ language: lang.toLowerCase(), apiVersion: d.version ?? "1.0", outputFormat: "package" })}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded font-semibold transition"
                >
                  Generate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
