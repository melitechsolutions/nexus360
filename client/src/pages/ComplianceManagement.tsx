import { useState } from "react";
import { Shield, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function ComplianceManagement() {
  const [activeStandard, setActiveStandard] = useState("GDPR");
  const dashboard = trpc.securityCompliance.getSecurityDashboard.useQuery({});
  const report = trpc.securityCompliance.getComplianceReport.useQuery({ standard: activeStandard });

  return (
    <ModuleLayout
      title="Compliance Management"
      icon={<Shield className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Security" }, { label: "Compliance Management" }]}
    >
      {dashboard.isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : dashboard.error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Failed to load compliance data</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <p className="text-sm text-slate-600">Security Score</p>
              <p className="text-2xl font-bold text-slate-900">{dashboard.data?.overallSecureScore ?? 0}%</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
              <p className="text-sm text-slate-600">Vulnerabilities</p>
              <p className="text-2xl font-bold text-slate-900">{dashboard.data?.summary?.vulnerabilities ?? 0}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <p className="text-sm text-slate-600">Compliance</p>
              <p className="text-2xl font-bold text-slate-900">{dashboard.data?.summary?.complianceStatus ?? "—"}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
              <p className="text-sm text-slate-600">2FA Adoption</p>
              <p className="text-2xl font-bold text-slate-900">{dashboard.data?.summary?.twoFactorAdoption ?? 0}%</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {["GDPR", "HIPAA", "SOC2", "ISO27001"].map((std) => (
              <button key={std} onClick={() => setActiveStandard(std)}
                className={`px-4 py-2 rounded-lg font-medium transition ${activeStandard === std ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-slate-100 shadow"}`}>
                {std}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">{activeStandard} Report</h2>
              {report.isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
              ) : report.error ? (
                <p className="text-red-600">Failed to load report</p>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-700">Status</p>
                    <p className="text-lg font-bold flex items-center gap-2 mt-1">
                      {report.data?.status === "compliant" ? (
                        <><CheckCircle size={20} className="text-green-600" /><span className="text-green-600">Compliant</span></>
                      ) : (
                        <><XCircle size={20} className="text-red-600" /><span className="text-red-600">{report.data?.status}</span></>
                      )}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-700">Score</p>
                    <p className="text-2xl font-bold text-slate-900">{report.data?.score ?? 0}%</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Compliance Checklist</h2>
              <div className="space-y-2">
                {Object.entries(dashboard.data?.complianceChecklist ?? {}).map(([key, val]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{key}</p>
                      <p className="text-sm text-slate-600">Last audit: {val.lastAudit ?? "—"}</p>
                    </div>
                    <span className={`px-3 py-1 rounded text-sm font-medium ${val.compliant ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {val.compliant ? "Compliant" : "Review Needed"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {(report.data?.requirements?.length ?? 0) > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">{activeStandard} Requirements</h2>
              <div className="space-y-2">
                {report.data!.requirements.map((req: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100">
                    <p className="font-medium text-slate-900">{typeof req === "string" ? req : req.title ?? req.name ?? JSON.stringify(req)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </ModuleLayout>
  );
}
