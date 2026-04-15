import { GitBranch, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useUserLookup } from "@/hooks/useUserLookup";

export default function VersionControl() {
  const { getUserName } = useUserLookup();
  const { data: documents, isLoading } = trpc.fileStorage.listDocuments.useQuery({ limit: 50 });

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-slate-600" /></div>;

  const docs = documents ? JSON.parse(JSON.stringify(documents)) : { documents: [], total: 0 };
  const docList = docs.documents ?? docs.files ?? [];

  return (
    <ModuleLayout
      title="Version Control"
      icon={<GitBranch className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "System" }, { label: "Version Control" }]}
    >
      <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
        <GitBranch size={32} /> Version Control
      </h1>

      <div className="grid grid-cols-4 gap-4">
        {[
          { title: "Total Documents", value: String(docs.total ?? docList.length) },
          { title: "Latest Version", value: docList[0]?.version ?? "—" },
          { title: "Authors", value: String(new Set(docList.map((d: any) => d.createdBy ?? d.uploadedBy)).size) },
          { title: "File Types", value: String(new Set(docList.map((d: any) => d.type ?? d.mimeType)).size) },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-4 rounded-lg shadow border-l-4 border-slate-600">
            <p className="text-sm text-slate-600">{stat.title}</p>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Document Versions</h2>
        {docList.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No documents found.</p>
        ) : (
          <div className="space-y-3">
            {docList.map((doc: any, idx: number) => (
              <div key={doc.id ?? idx} className="p-4 bg-slate-50 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900">{doc.name ?? doc.fileName ?? "Document"}</p>
                  <p className="text-sm text-slate-600">{getUserName(doc.createdBy ?? doc.uploadedBy) || "—"} {doc.createdAt ? `• ${new Date(doc.createdAt).toLocaleDateString()}` : ""}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">{doc.size ?? "—"}</p>
                  <span className={`px-2 py-1 text-xs font-bold rounded mt-1 inline-block ${
                    idx === 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                  }`}>{idx === 0 ? "CURRENT" : `v${doc.version ?? docList.length - idx}`}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
