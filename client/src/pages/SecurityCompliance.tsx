import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { Shield, Lock, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Security & Compliance Page (Phase 5.2)
 * 
 * Dashboard for security management and compliance including:
 * - Security score and metrics
 * - Compliance reporting
 * - 2FA management
 * - Data privacy settings
 * - Security audits
 */

export function SecurityCompliance() {
  const [selectedScope, setSelectedScope] = useState<'full' | 'permissions' | 'encryption' | 'access_logs'>('full');

  const { data: dashboard } = useQuery({
    queryKey: ['securityDashboard'],
    queryFn: async () => {
      const result = await trpc.securityCompliance.getSecurityDashboard.query();
      return result;
    },
  });

  const { data: compliance } = useQuery({
    queryKey: ['complianceReport'],
    queryFn: async () => {
      const result = await trpc.securityCompliance.getComplianceReport.query();
      return result;
    },
  });

  return (
    <div className="p-8 space-y-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900">Security & Compliance</h1>
        </div>

        {/* Security Score */}
        {dashboard && (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 mb-2">Overall Security Score</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-blue-600">{dashboard.overallSecureScore}</span>
                  <span className="text-slate-500">/100</span>
                </div>
              </div>
              <div className="text-right space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <span className="text-sm"><strong>{dashboard.summary.vulnerabilities}</strong> vulnerabilities</span>
                </div>
                <div className="text-sm">
                  <strong>{(dashboard.summary.encryptionCoverage).toFixed(1)}%</strong> encryption coverage
                </div>
                <div className="text-sm">
                  <strong>{(dashboard.summary.twoFactorAdoption).toFixed(1)}%</strong> 2FA adoption
                </div>
              </div>
            </div>

            {/* Compliance Checklist */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4">Compliance Status</h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(dashboard.complianceChecklist).map(([standard, status]) => (
                  <div key={standard} className="flex items-center gap-2 p-3 bg-slate-50 rounded">
                    {status === 'compliant' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">{standard.toUpperCase()}</p>
                      <p className="text-xs text-slate-500">{status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Compliance Report */}
        {compliance && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Compliance Metrics */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-slate-900">Compliance Score</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Overall Compliance</span>
                    <span className="text-sm font-bold text-green-600">{compliance.complianceScore}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${compliance.complianceScore}%` }}
                    ></div>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    <strong>{compliance.requirements.filter(r => r.status === 'compliant').length}</strong> of{' '}
                    <strong>{compliance.requirements.length}</strong> requirements met
                  </p>
                </div>
              </div>
            </div>

            {/* 2FA Management */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-slate-900">Two-Factor Authentication</h2>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-slate-600">Current adoption: {(dashboard?.summary.twoFactorAdoption || 0).toFixed(1)}%</p>
                <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium">
                  Enable 2FA
                </button>
                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded">
                  2FA protects accounts with authentication through authenticator app, SMS, or email
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Audit */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Security Audit</h2>
          </div>
          <p className="text-sm text-slate-600 mb-4">Select audit scope and run full security assessment</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {(['full', 'permissions', 'encryption', 'access_logs'] as const).map((scope) => (
              <button
                key={scope}
                onClick={() => setSelectedScope(scope)}
                className={`px-3 py-2 rounded text-sm font-medium transition ${
                  selectedScope === scope
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {scope.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
            Run Audit ({selectedScope})
          </button>
        </div>
      </div>
    </div>
  );
}

export default SecurityCompliance;
