import { FileText, Loader2 } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DocumentLibrary() {
  const docsQuery = trpc.fileStorage.listDocuments.useQuery();
  const documents = (docsQuery.data as any[]) ?? [];

  return (
    <ModuleLayout
      title="Document Library"
      icon={<FileText className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Documents" },
        { label: "Library" },
      ]}
    >
      {docsQuery.isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {docsQuery.error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Error: {docsQuery.error.message}</div>
      )}

      {!docsQuery.isLoading && !docsQuery.error && documents.length === 0 && (
        <p className="text-center text-gray-500 py-8">No data found.</p>
      )}

      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Documents ({documents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documents.map((doc: any, idx: number) => (
                <div key={doc.id ?? idx} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between hover:bg-slate-100">
                  <div>
                    <p className="font-medium text-slate-900">{doc.name ?? doc.fileName ?? "—"}</p>
                    <p className="text-sm text-slate-600">
                      {doc.owner ?? doc.uploadedBy ?? "—"} • {doc.size ?? doc.fileSize ?? "—"}
                    </p>
                  </div>
                  <span className="text-sm text-slate-500">{doc.updatedAt ?? doc.createdAt ?? "—"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </ModuleLayout>
  );
}
