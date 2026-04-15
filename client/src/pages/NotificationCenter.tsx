/**
 * Notification Center Page
 * 
 * Comprehensive notification management with:
 * - Real-time notification list with filtering
 * - Notification preferences configuration
 * - Read status management
 * - Notification statistics and trends
 * - Multi-channel delivery settings
 */

import React, { useState } from 'react';
import { trpc } from "@/lib/trpc";
import {
  Bell, Mail, MessageSquare, Settings, Trash2, Check, Clock, AlertCircle,
  TrendingUp, Filter, Search, Eye, EyeOff, X
} from 'lucide-react';
import { ModuleLayout } from "@/components/ModuleLayout";

// Notification Item Component
const NotificationItem: React.FC<{
  notification: any;
  onRead: (id: number) => void;
  onDelete: (id: number) => void;
}> = ({ notification, onRead, onDelete }) => {
  const priorityColor = {
    high: 'border-red-300 bg-red-50',
    medium: 'border-yellow-300 bg-yellow-50',
    low: 'border-gray-300 bg-gray-50',
  }[notification.priority] || 'border-gray-300 bg-gray-50';

  const categoryIcon = {
    finance: '💰',
    sales: '📊',
    hr: '👥',
    operations: '⚙️',
    system: '🔧',
    reports: '📈',
  }[notification.category] || '📌';

  return (
    <div className="flex gap-4 bg-white p-4 rounded-lg border border-gray-200">
      <div className="text-2xl">{categoryIcon}</div>
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-gray-900">{notification.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded ${
            notification.read ? 'bg-gray-200 text-gray-700' : 'bg-blue-200 text-blue-700'
          }`}>
            {notification.read ? 'Read' : 'Unread'}
          </span>
        </div>

        {notification.actionUrl && (
          <div className="mt-3 flex gap-2 items-center">
            <a
              href={notification.actionUrl}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {notification.actionLabel || 'View'} →
            </a>
          </div>
        )}

        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(notification.timestamp).toLocaleString()}
          </span>
          <span className="px-2 py-1 bg-gray-200 rounded text-gray-700">{notification.category}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onRead(notification.id)}
          className="p-2 hover:bg-gray-300 rounded transition-colors"
          title={notification.read ? 'Mark unread' : 'Mark read'}
        >
          {notification.read ? (
            <EyeOff className="w-4 h-4 text-gray-600" />
          ) : (
            <Eye className="w-4 h-4 text-blue-600" />
          )}
        </button>
        <button
          onClick={() => onDelete(notification.id)}
          className="p-2 hover:bg-red-100 rounded transition-colors"
          title="Delete notification"
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>
    </div>
  );
};

// Preferences Panel Component
const PreferencesPanel: React.FC<{
  preferences: any;
  onUpdate: (prefs: any) => void;
}> = ({ preferences, onUpdate }) => {
  const [channels, setChannels] = useState(preferences.channels || {});
  const [quietHours, setQuietHours] = useState(preferences.quietHours || {});

  const handleChannelChange = (channel: string) => {
    const updated = { ...channels, [channel]: !channels[channel] };
    setChannels(updated);
    onUpdate({ channels: updated });
  };

  const handleQuietHoursChange = (field: string, value: any) => {
    const updated = { ...quietHours, [field]: value };
    setQuietHours(updated);
    onUpdate({ quietHours: updated });
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Notification Channels
        </h3>
        <div className="space-y-3">
          {Object.entries(channels).map(([channel, enabled]) => (
            <label key={channel} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled as boolean}
                onChange={() => handleChannelChange(channel)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-gray-700 capitalize">{channel}</span>
            </label>
          ))}
        </div>
      </div>

      <hr className="border-gray-200" />

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Quiet Hours
        </h3>
        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={quietHours.enabled || false}
            onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-gray-700">Enable quiet hours</span>
        </label>

        {quietHours.enabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
              <input
                type="time"
                value={quietHours.start || '18:00'}
                onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                className="px-3 py-2 w-full border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
              <input
                type="time"
                value={quietHours.end || '08:00'}
                onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                className="px-3 py-2 w-full border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Statistics Component
const NotificationStats: React.FC<{
  stats: any;
}> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="text-sm text-gray-600 mb-1">Total Notifications</div>
        <div className="text-3xl font-bold text-gray-900">{stats.summary?.totalNotifications || 0}</div>
        <div className="text-xs text-gray-500 mt-2">All time</div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="text-sm text-gray-600 mb-1">Unread</div>
        <div className="text-3xl font-bold text-blue-600">{stats.summary?.unreadCount || 0}</div>
        <div className="text-xs text-gray-500 mt-2">Awaiting your attention</div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="text-sm text-gray-600 mb-1">Read</div>
        <div className="text-3xl font-bold text-green-600">{stats.summary?.readCount || 0}</div>
        <div className="text-xs text-gray-500 mt-2">Already reviewed</div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="text-sm text-gray-600 mb-1">Engagement Rate</div>
        <div className="text-3xl font-bold text-purple-600">{((stats.engagementRate || 0) * 100).toFixed(0)}%</div>
        <div className="text-xs text-gray-500 mt-2">Per day average</div>
      </div>
    </div>
  );
};

// Main Notification Center Page
export default function NotificationCenterPage() {
  const [activeTab, setActiveTab] = useState<'notifications' | 'preferences' | 'stats'>('notifications');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Queries
  const notificationsQuery = trpc.notifications.list.useQuery({
    limit: 50,
    offset: 0,
    unreadOnly: filterType === 'unread',
    category: selectedCategory || undefined,
  });

  const preferencesQuery = trpc.notifications.getPreferences.useQuery({});
  const statsQuery = trpc.notifications.getStats.useQuery({});

  // Mutations
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation();
  const deleteNotificationMutation = trpc.notifications.delete.useMutation();
  const updatePreferencesMutation = trpc.notifications.updatePreferences.useMutation();
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation();

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markAsReadMutation.mutateAsync({ notificationId });
      await notificationsQuery.refetch();
      await statsQuery.refetch();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDelete = async (notificationId: number) => {
    try {
      await deleteNotificationMutation.mutateAsync({ notificationId });
      await notificationsQuery.refetch();
      await statsQuery.refetch();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleUpdatePreferences = async (prefs: any) => {
    try {
      await updatePreferencesMutation.mutateAsync(prefs);
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync({});
      await notificationsQuery.refetch();
      await statsQuery.refetch();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      notificationsQuery.refetch(),
      statsQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const filteredNotifications = (notificationsQuery.data?.notifications || []).filter(n =>
    searchQuery === '' || n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ModuleLayout
      title="Notification Center"
      icon={<Bell className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Notification Center" }]}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Bell className="w-10 h-10 text-blue-600" />
            Notification Center
          </h1>
          <p className="text-gray-600 mt-1">Manage your notifications and preferences</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {refreshing ? '⟳' : '↻'} Refresh
          </button>
          {filterType !== 'read' && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Statistics */}
      {activeTab === 'notifications' && statsQuery.isSuccess && (
        <NotificationStats stats={statsQuery.data} />
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 bg-white p-4 rounded-t-lg">
        {(['notifications', 'preferences', 'stats'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'notifications' && 'Notifications'}
            {tab === 'preferences' && 'Preferences'}
            {tab === 'stats' && 'Statistics'}
          </button>
        ))}
      </div>

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(['all', 'unread', 'read'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filterType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {type === 'all' && 'All Notifications'}
                  {type === 'unread' && '🔔 Unread'}
                  {type === 'read' && '✓ Read'}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {['finance', 'sales', 'hr', 'operations', 'system', 'reports'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Notification List */}
          {notificationsQuery.isLoading ? (
            <div className="bg-white p-8 rounded-lg border border-gray-200 text-center text-gray-600">
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No notifications to display</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleMarkAsRead}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && preferencesQuery.isSuccess && (
        <PreferencesPanel
          preferences={preferencesQuery.data}
          onUpdate={handleUpdatePreferences}
        />
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && statsQuery.isSuccess && (
        <div className="space-y-6">
          {/* Category Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">By Category</h3>
              <div className="space-y-2">
                {Object.entries(statsQuery.data.byCategory || {}).map(([cat, count]: [string, any]) => (
                  <div key={cat} className="flex justify-between items-center">
                    <span className="text-gray-700 capitalize">{cat}</span>
                    <span className="font-semibold text-blue-600">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">By Priority</h3>
              <div className="space-y-2">
                {Object.entries(statsQuery.data.byPriority || {}).map(([priority, count]: [string, any]) => (
                  <div key={priority} className="flex justify-between items-center">
                    <span className="text-gray-700 capitalize">{priority}</span>
                    <span className="font-semibold text-red-600">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Daily Average</div>
                  <div className="text-2xl font-bold text-gray-900">{statsQuery.data.averageNotificationsPerDay}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Most Active</div>
                  <div className="text-lg font-semibold text-blue-600 capitalize">{statsQuery.data.mostActiveCategory}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              7-Day Trend
            </h3>
            <div className="space-y-2">
              {(statsQuery.data.trend || []).map((day: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{day.date}</span>
                  <div className="flex items-center gap-2 flex-1 ml-4">
                    <div className="h-6 bg-blue-200 rounded" style={{ width: `${(day.count / 30) * 100}%` }} />
                    <span className="text-sm font-medium text-gray-700 w-16 text-right">{day.count} sent</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
