import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { trpc } from '../utils/trpc';
import { Mail, Calendar, Send, Clock } from 'lucide-react';

/**
 * Email & Calendar Integration Page (Phase 5.4)
 * 
 * Email and calendar management including:
 * - Email integration (Gmail, Outlook)
 * - Calendar synchronization
 * - Event scheduling
 * - Availability checking
 * - Email tracking
 */

export function EmailCalendarIntegration() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: emailIntegration } = useQuery({
    queryKey: ['emailIntegration'],
    queryFn: async () => {
      const result = await trpc.emailCalendar.getEmailIntegration.query();
      return result;
    },
  });

  const { data: availability } = useQuery({
    queryKey: ['availability', selectedDate],
    queryFn: async () => {
      const result = await trpc.emailCalendar.getAvailability.query({
        date: selectedDate,
      });
      return result;
    },
  });

  return (
    <div className="p-8 space-y-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Mail className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900">Email & Calendar Integration</h1>
        </div>

        {/* Email Integrations */}
        {emailIntegration && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <Mail className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-slate-900">Email Integrations</h2>
            </div>

            <div className="space-y-4">
              {emailIntegration.integrations.map((integration, idx) => (
                <div key={idx} className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900 capitalize">{integration.provider}</h3>
                    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded ${
                      integration.connected 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {integration.connected ? 'CONNECTED' : 'NOT CONNECTED'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600 mb-1">Inbox</p>
                      <p className="font-semibold text-slate-900">{integration.inboxCount}</p>
                    </div>
                    <div>
                      <p className="text-slate-600 mb-1">Unread</p>
                      <p className="font-semibold text-slate-900">{integration.unreadCount}</p>
                    </div>
                    <div>
                      <p className="text-slate-600 mb-1">Last Sync</p>
                      <p className="font-semibold text-slate-900">Active</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
              Add Email Account
            </button>
          </div>
        )}

        {/* Calendar & Scheduling */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Calendar Availability */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-cyan-600" />
              <h2 className="text-xl font-semibold text-slate-900">Today's Availability</h2>
            </div>

            <div className="mb-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            {availability && (
              <div className="space-y-3">
                {availability.available.map((slot, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-slate-900">
                          {slot.start} - {slot.end}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">{slot.duration} min</span>
                    </div>
                  </div>
                ))}
                {availability.available.length === 0 && (
                  <p className="text-sm text-slate-600 text-center py-4">No available slots today</p>
                )}
              </div>
            )}
          </div>

          {/* Schedule New Event */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-6">
              <Send className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-slate-900">Schedule Event</h2>
            </div>

            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  placeholder="Team Meeting"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Attendees (emails, comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="john@company.com, jane@company.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <button
                type="button"
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
              >
                Create & Send Invitations
              </button>
            </form>
          </div>
        </div>

        {/* Email Tracking */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6">
            <Mail className="w-5 h-5 text-amber-600" />
            <h2 className="text-xl font-semibold text-slate-900">Email Tracking</h2>
          </div>

          <div className="space-y-4">
            <div className="p-4 border border-slate-200 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">Invoice Reminder - January 2025</h3>
                  <p className="text-sm text-slate-500">Sent to 45 recipients • 3 days ago</p>
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Delivered:</span>
                  <span className="font-semibold text-slate-900">43 of 45</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Opened:</span>
                  <span className="font-semibold text-slate-900">28 (65%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Clicked:</span>
                  <span className="font-semibold text-slate-900">15 (35%)</span>
                </div>
              </div>
            </div>

            <div className="p-4 border border-slate-200 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">Monthly Report - February 2025</h3>
                  <p className="text-sm text-slate-500">Sent to 12 recipients • 2 days ago</p>
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Delivered:</span>
                  <span className="font-semibold text-slate-900">12 of 12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Opened:</span>
                  <span className="font-semibold text-slate-900">9 (75%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Clicked:</span>
                  <span className="font-semibold text-slate-900">6 (50%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
