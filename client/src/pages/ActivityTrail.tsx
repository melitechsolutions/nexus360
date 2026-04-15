/**
 * Activity Trail Page
 * Historical activity timeline and change tracking with tRPC integration
 */

import React, { useState } from 'react';
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from '@/components/ModuleLayout';
import { Search, Download, History, XCircle, User, Clock } from 'lucide-react';
import { toast } from 'sonner';

const getActionColor = (action: string) => {
  const colors: Record<string, string> = {
    created: 'bg-green-100 text-green-700',
    updated: 'bg-blue-100 text-blue-700',
    deleted: 'bg-red-100 text-red-700',
    approved: 'bg-purple-100 text-purple-700',
    exported: 'bg-orange-100 text-orange-700',
    login: 'bg-cyan-100 text-cyan-700',
    payment_recorded: 'bg-emerald-100 text-emerald-700',
  };
  return colors[action] || 'bg-gray-100 text-gray-700';
};

const getActionIcon = (action: string) => {
  switch (action) {
    case 'created': return '➕';
    case 'updated': return '✏️';
    case 'deleted': return '🗑️';
    case 'approved': return '✅';
    case 'exported': return '📥';
    case 'login': return '🔐';
    case 'payment_recorded': return '💰';
    default: return '📝';
  }
};

const ActivityTrail: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [page, setPage] = useState(1);

  const activitiesQuery = trpc.activityTrail.list.useQuery({
    page,
    limit: 20,
    search: searchQuery || undefined,
    entityType: selectedEntityType || undefined,
    action: selectedAction || undefined,
  });

  const statsQuery = trpc.activityTrail.getStats.useQuery();
  const entityTypesQuery = trpc.activityTrail.getEntityTypes.useQuery();
  const actionsQuery = trpc.activityTrail.getActions.useQuery();

  const activities = activitiesQuery.data?.activities || [];
  const total = activitiesQuery.data?.total || 0;
  const stats = statsQuery.data;

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Description', 'Status'],
      ...activities.map((a: any) => [
        new Date(a.timestamp || a.createdAt).toISOString(),
        a.userName || 'Unknown',
        a.action,
        a.entityType,
        a.entityId,
        a.description,
        a.status || 'success',
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-trail-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Activity trail exported successfully');
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedEntityType('');
    setSelectedAction('');
    setPage(1);
  };

  return (
    <ModuleLayout
      title="Activity Trail"
      description="Historical activity timeline and change tracking"
      icon={<History className="h-6 w-6" />}
      breadcrumbs={[{label: "Dashboard", href: "/crm-home"}, {label: "Activity Trail"}]}
    >
      <div className="space-y-6">

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-3xl font-bold text-blue-600">{stats?.totalActivities ?? total}</div>
            <div className="text-sm text-gray-600 mt-1">Total Activities</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-3xl font-bold text-green-600">{stats?.successCount ?? 0}</div>
            <div className="text-sm text-gray-600 mt-1">Successful</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-3xl font-bold text-red-600">{stats?.failedCount ?? 0}</div>
            <div className="text-sm text-gray-600 mt-1">Failed</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-3xl font-bold text-purple-600">{stats?.uniqueUsers ?? 0}</div>
            <div className="text-sm text-gray-600 mt-1">Unique Users</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
              <select
                value={selectedEntityType}
                onChange={(e) => { setSelectedEntityType(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">All types</option>
                {(entityTypesQuery.data || []).map((type: string) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={selectedAction}
                onChange={(e) => { setSelectedAction(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">All actions</option>
                {(actionsQuery.data || []).map((action: string) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Activities Timeline */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Activities
              <span className="ml-2 text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{total}</span>
            </h2>
          </div>

          {activitiesQuery.isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">Loading activities...</div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <History className="h-12 w-12 mb-3" />
              <p>No activities found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity: any) => (
                <div key={activity.id} className="relative pl-8 pb-4 border-l-2 border-gray-200 last:border-l-0">
                  <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white"></div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-lg">{getActionIcon(activity.action)}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${getActionColor(activity.action)}`}>
                            {activity.action?.toUpperCase()}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {activity.entityType}
                          </span>
                          {activity.status === 'failed' && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded flex items-center gap-1">
                              <XCircle className="h-3 w-3" /> FAILED
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-medium text-gray-900">{activity.description}</div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {activity.userName || 'Unknown User'}
                          {activity.duration && (
                            <>
                              <span className="text-gray-300">•</span>
                              <Clock className="h-3 w-3" />
                              <span className="font-mono">{activity.duration}ms</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500 ml-4 whitespace-nowrap">
                        <div>{new Date(activity.timestamp || activity.createdAt).toLocaleTimeString()}</div>
                        <div>{new Date(activity.timestamp || activity.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>

                    {activity.changes && typeof activity.changes === 'object' && Object.keys(activity.changes).length > 0 && (
                      <div className="mt-3 p-3 bg-white rounded text-xs border border-gray-100">
                        <div className="font-semibold text-gray-700 mb-2">Changes:</div>
                        <div className="space-y-1">
                          {Object.entries(activity.changes).map(([field, change]: [string, any]) => (
                            <div key={field} className="flex justify-between">
                              <span className="font-medium">{field}:</span>
                              <span>
                                <span className="text-red-600 line-through mr-2">
                                  {change?.old !== null && change?.old !== undefined ? `"${change.old}"` : '-'}
                                </span>
                                <span className="text-green-600">
                                  {change?.new !== null && change?.new !== undefined ? `"${change.new}"` : '-'}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-600">
                Showing {(page - 1) * 20 + 1} - {Math.min(page * 20, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * 20 >= total}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModuleLayout>
  );
};

export default ActivityTrail;
