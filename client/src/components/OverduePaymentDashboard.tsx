import React, { useState } from "react";
import {
  AlertCircle,
  Clock,
  Mail,
  TrendingDown,
  DollarSign,
  Calendar,
  Send,
  Loader2,
  CheckCircle,
  Eye,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  dueDate: string;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  daysOverdue: number;
  status: string;
}

interface ReminderNeeded {
  invoiceId: string;
  invoiceNumber: string;
  daysOverdue: number;
  reminderType: "first" | "second" | "final";
}

export default function OverduePaymentDashboard() {
  const [, setLocation] = useLocation();
  const [selectedReminders, setSelectedReminders] = useState<Set<string>>(new Set());
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  // Fetch overdue invoices
  const { data: overdueInvoices = [], isLoading: isLoadingOverdue } =
    trpc.invoices.payments.getOverdue.useQuery({});

  // Fetch reminders needed
  const { data: remindersNeeded = [], isLoading: isLoadingReminders } =
    trpc.invoices.payments.getRemindersNeeded.useQuery({});

  // Send reminder mutation
  const sendReminderMutation = trpc.invoices.payments.sendReminder.useMutation({
    onSuccess: () => {
      setSendingReminder(null);
    },
    onError: (error) => {
      console.error("Failed to send reminder:", error);
      setSendingReminder(null);
    },
  });

  const handleSendReminder = async (invoiceId: string, reminderType: "first" | "second" | "final") => {
    setSendingReminder(invoiceId);
    try {
      await sendReminderMutation.mutateAsync({
        invoiceId,
        reminderType,
      });
    } catch (error) {
      console.error("Error sending reminder:", error);
    }
  };

  const handleSelectReminder = (invoiceId: string) => {
    const newSelected = new Set(selectedReminders);
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
    } else {
      newSelected.add(invoiceId);
    }
    setSelectedReminders(newSelected);
  };

  const handleSelectAllReminders = () => {
    if (selectedReminders.size === remindersNeeded.length) {
      setSelectedReminders(new Set());
    } else {
      setSelectedReminders(new Set(remindersNeeded.map((r) => r.invoiceId)));
    }
  };

  const handleBulkSendReminders = async () => {
    for (const invoiceId of selectedReminders) {
      const reminder = remindersNeeded.find((r) => r.invoiceId === invoiceId);
      if (reminder) {
        await handleSendReminder(invoiceId, reminder.reminderType);
      }
    }
    setSelectedReminders(new Set());
  };

  const isLoading = isLoadingOverdue || isLoadingReminders;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  // Summary calculations
  const totalOverdue = overdueInvoices.length;
  const totalOverdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
  const averageDaysOverdue =
    totalOverdue > 0
      ? Math.round(overdueInvoices.reduce((sum, inv) => sum + inv.daysOverdue, 0) / totalOverdue)
      : 0;

  const getMostOverdueReminder = (invoiceId: string) => {
    const overdue = overdueInvoices.find((inv) => inv.id === invoiceId);
    if (!overdue) return "first";
    if (overdue.daysOverdue >= 30) return "final";
    if (overdue.daysOverdue >= 14) return "second";
    return "first";
  };

  const getSeverity = (daysOverdue: number) => {
    if (daysOverdue >= 30) return "critical";
    if (daysOverdue >= 14) return "serious";
    if (daysOverdue >= 7) return "warning";
    return "mild";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-300";
      case "serious":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  const formatCurrency = (amount: number) => {
    return `Ksh ${(amount / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-KE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Overdue Payments</h2>
        </div>
        {totalOverdue > 0 && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            {totalOverdue} invoice{totalOverdue !== 1 ? "s" : ""} overdue
          </span>
        )}
      </div>

      {totalOverdue === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
          <p className="text-green-800 font-medium">All invoices are up to date!</p>
          <p className="text-green-700 text-sm mt-1">No overdue payments at this time.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Overdue Amount */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Overdue</p>
                  <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(totalOverdueAmount)}</p>
                </div>
                <DollarSign className="h-10 w-10 text-red-500 opacity-20" />
              </div>
            </div>

            {/* Total Invoices */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Invoices Overdue</p>
                  <p className="text-2xl font-bold text-orange-600 mt-2">{totalOverdue}</p>
                </div>
                <TrendingDown className="h-10 w-10 text-orange-500 opacity-20" />
              </div>
            </div>

            {/* Average Days Overdue */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Avg Days Overdue</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-2">{averageDaysOverdue}</p>
                </div>
                <Clock className="h-10 w-10 text-yellow-500 opacity-20" />
              </div>
            </div>
          </div>

          {/* Reminders Needed Section */}
          {remindersNeeded.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200">
                    {remindersNeeded.length} Reminder{remindersNeeded.length !== 1 ? "s" : ""} Needed
                  </h3>
                </div>
                {selectedReminders.size > 0 && (
                  <button
                    onClick={handleBulkSendReminders}
                    disabled={sendingReminder !== null}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Send Selected ({selectedReminders.size})
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {/* Select All Checkbox */}
                <label className="flex items-center gap-3 p-2 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedReminders.size === remindersNeeded.length && remindersNeeded.length > 0}
                    onChange={handleSelectAllReminders}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                    Select All Reminders
                  </span>
                </label>

                {/* Reminder Items */}
                {remindersNeeded.map((reminder) => (
                  <div key={reminder.invoiceId} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-700">
                    <label className="flex items-center gap-3 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedReminders.has(reminder.invoiceId)}
                        onChange={() => handleSelectReminder(reminder.invoiceId)}
                        className="rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          Invoice {reminder.invoiceNumber}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {reminder.daysOverdue} days overdue • {reminder.reminderType.charAt(0).toUpperCase() + reminder.reminderType.slice(1)} reminder
                        </p>
                      </div>
                    </label>
                    <button
                      onClick={() => handleSendReminder(reminder.invoiceId, reminder.reminderType)}
                      disabled={sendingReminder === reminder.invoiceId}
                      className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {sendingReminder === reminder.invoiceId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Invoices Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Remaining
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Days Overdue
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {overdueInvoices.map((invoice) => {
                    const severity = getSeverity(invoice.daysOverdue);
                    const reminderType = getMostOverdueReminder(invoice.id);

                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {invoice.invoiceNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                          {invoice.clientName}
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {formatDate(invoice.dueDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(invoice.total)}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-red-600">
                          {formatCurrency(invoice.remainingAmount)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(severity)}`}>
                            {invoice.daysOverdue} days
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setLocation(`/invoices/${invoice.id}`)}
                              className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md"
                              title="View Invoice"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleSendReminder(invoice.id, reminderType)}
                              disabled={sendingReminder === invoice.id}
                              className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md disabled:opacity-50"
                              title={`Send ${reminderType} reminder`}
                            >
                              {sendingReminder === invoice.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

