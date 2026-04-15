import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { Smartphone, Send, RefreshCw, Zap } from 'lucide-react';

/**
 * Mobile & Responsive Design Page (Phase 5.3)
 * 
 * Mobile app and responsive design management including:
 * - Device registration
 * - Data sync management
 * - Push notifications
 * - Mobile-optimized dashboard
 */

export function MobileResponsiveness() {
  const [syncInProgress, setSyncInProgress] = useState(false);

  const { data: mobileData } = useQuery({
    queryKey: ['mobileOptimizedDashboard'],
    queryFn: async () => {
      const result = await trpc.mobileResponsive.getMobileOptimizedDashboard.query();
      return result;
    },
  });

  const handleSync = async () => {
    setSyncInProgress(true);
    try {
      const result = await trpc.mobileResponsive.getSyncData.query({
        lastSyncTime: new Date().toISOString(),
        entities: ['invoices', 'clients', 'payments'],
      });
      // Handle sync result
    } finally {
      setSyncInProgress(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Smartphone className="w-8 h-8 text-cyan-600" />
          <h1 className="text-3xl font-bold text-slate-900">Mobile & Responsive Design</h1>
        </div>

        {/* Mobile Dashboard Cards */}
        {mobileData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {mobileData.cards.map((card, idx) => (
              <div key={idx} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <p className="text-sm font-medium text-slate-600 mb-2">{card.title}</p>
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                  <span className={`text-xs font-semibold ${
                    card.trend === 'up' || card.trend?.startsWith('+') 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {card.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Device Management */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Smartphone className="w-5 h-5 text-cyan-600" />
            <h2 className="text-xl font-semibold text-slate-900">Device Management</h2>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">iPhone 15 Pro</h3>
                  <p className="text-sm text-slate-500">iOS 17.2 • Last sync: 2 mins ago</p>
                </div>
                <span className="inline-block px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded">
                  ACTIVE
                </span>
              </div>
              <button className="text-sm text-cyan-600 hover:text-cyan-700 font-medium">
                View sync details
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">Samsung Galaxy Tab</h3>
                  <p className="text-sm text-slate-500">Android 14 • Last sync: 1 hour ago</p>
                </div>
                <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded">
                  SYNCED
                </span>
              </div>
              <button className="text-sm text-cyan-600 hover:text-cyan-700 font-medium">
                View sync details
              </button>
            </div>
          </div>

          <button className="mt-6 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition text-sm font-medium">
            Register New Device
          </button>
        </div>

        {/* Data Synchronization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sync Status */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-6">
              <RefreshCw className="w-5 h-5 text-amber-600" />
              <h2 className="text-xl font-semibold text-slate-900">Data Synchronization</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                <span className="text-sm font-medium text-slate-700">Invoices</span>
                <span className="text-sm font-semibold text-slate-900">342 synced</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                <span className="text-sm font-medium text-slate-700">Clients</span>
                <span className="text-sm font-semibold text-slate-900">89 synced</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                <span className="text-sm font-medium text-slate-700">Payments</span>
                <span className="text-sm font-semibold text-slate-900">156 synced</span>
              </div>
              <button
                onClick={handleSync}
                disabled={syncInProgress}
                className="w-full mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm font-medium disabled:opacity-50"
              >
                {syncInProgress ? 'Syncing...' : 'Force Sync Now'}
              </button>
            </div>
          </div>

          {/* Push Notifications */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-6">
              <Send className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-slate-900">Push Notifications</h2>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded cursor-pointer hover:bg-slate-100 transition">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-purple-600 rounded" />
                <span className="text-sm font-medium text-slate-700">Invoice Approvals</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded cursor-pointer hover:bg-slate-100 transition">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-purple-600 rounded" />
                <span className="text-sm font-medium text-slate-700">Critical Alerts</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded cursor-pointer hover:bg-slate-100 transition">
                <input type="checkbox" className="w-4 h-4 text-purple-600 rounded" />
                <span className="text-sm font-medium text-slate-700">Daily Messages</span>
              </label>
              <button className="w-full mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium">
                Save Settings
              </button>
            </div>
          </div>
        </div>

        {/* PWA Status */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-cyan-600" />
            <h2 className="text-xl font-semibold text-slate-900">Progressive Web App</h2>
          </div>
          <p className="text-sm text-slate-600 mb-4">The app can be installed locally and works offline</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded text-center">
              <p className="text-xs text-slate-600 mb-1">Installation</p>
              <p className="text-sm font-semibold text-slate-900">Ready</p>
            </div>
            <div className="p-4 bg-slate-50 rounded text-center">
              <p className="text-xs text-slate-600 mb-1">Offline Mode</p>
              <p className="text-sm font-semibold text-slate-900">Enabled</p>
            </div>
            <div className="p-4 bg-slate-50 rounded text-center">
              <p className="text-xs text-slate-600 mb-1">Cache Status</p>
              <p className="text-sm font-semibold text-slate-900">Updated</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileResponsiveness;
