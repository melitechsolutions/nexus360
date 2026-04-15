/**
 * Mobile Dashboard - Home screen for mobile app
 * Optimized for touch, responsive, and efficient data loading
 */

import React, { useState } from "react";
import { useLocation } from "wouter";
import { Bell, CreditCard, TrendingUp, Users, ArrowRight, RefreshCw } from "lucide-react";
import ResponsiveLayout, { MobileCard, MobileList, MobileButton, MobileSheet } from "../Mobile/ResponsiveLayout";
import { useDeviceInfo, useNetworkStatus, useScroll } from "../../hooks/useMobileHooks";

interface DashboardMetric {
  label: string;
  value: string | number;
  change: number;
  trend: "up" | "down";
  icon: React.ReactNode;
}

interface RecentTransaction {
  id: string;
  title: string;
  amount: number;
  type: "invoice" | "payment" | "expense";
  date: string;
  status: "completed" | "pending" | "overdue";
}

export const MobileDashboard: React.FC = () => {
  const [, navigate] = useLocation();
  const deviceInfo = useDeviceInfo();
  const { isOnline } = useNetworkStatus();
  const scrollInfo = useScroll();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "invoices" | "payments">("all");
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // Mock data
  const metrics: DashboardMetric[] = [
    {
      label: "Total Revenue",
      value: "$45,230",
      change: 12.5,
      trend: "up",
      icon: <CreditCard className="w-6 h-6" />,
    },
    {
      label: "Pending Payments",
      value: "$8,450",
      change: -5.2,
      trend: "down",
      icon: <TrendingUp className="w-6 h-6" />,
    },
    {
      label: "Active Clients",
      value: "124",
      change: 8.3,
      trend: "up",
      icon: <Users className="w-6 h-6" />,
    },
  ];

  const recentTransactions: RecentTransaction[] = [
    {
      id: "1",
      title: "Invoice #INV-2024-001",
      amount: 2500,
      type: "invoice",
      date: "2024-01-15",
      status: "pending",
    },
    {
      id: "2",
      title: "Client Payment Received",
      amount: 3200,
      type: "payment",
      date: "2024-01-14",
      status: "completed",
    },
    {
      id: "3",
      title: "Office Supplies",
      amount: 450,
      type: "expense",
      date: "2024-01-13",
      status: "completed",
    },
    {
      id: "4",
      title: "Invoice #INV-2024-002",
      amount: 1800,
      type: "invoice",
      date: "2024-01-12",
      status: "overdue",
    },
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const filteredTransactions = recentTransactions.filter(
    (t) => activeFilter === "all" || t.type === activeFilter
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
      case "overdue":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "invoice":
        return <CreditCard className="w-4 h-4" />;
      case "payment":
        return <TrendingUp className="w-4 h-4" />;
      case "expense":
        return <ArrowRight className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <ResponsiveLayout
      header={
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 md:px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Welcome back, John Doe
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isOnline && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                  Offline
                </span>
              )}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>
        </header>
      }
      sidebar={
        <nav className="p-4 space-y-2">
          <NavLink label="Dashboard" icon="📊" active />
          <NavLink label="Invoices" icon="📄" />
          <NavLink label="Clients" icon="👥" />
          <NavLink label="Reports" icon="📈" />
          <NavLink label="Settings" icon="⚙️" />
        </nav>
      }
    >
      <div className={`space-y-4 ${deviceInfo.isDesktop ? "grid grid-cols-3 gap-4" : ""}`}>
        {/* Sticky Header on Mobile */}
        {deviceInfo.isMobile && (
          <div className="sticky top-0 z-10 bg-gradient-to-b from-gray-50 to-transparent dark:from-gray-900 pb-2 -mx-4 px-4 pt-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {scrollInfo.isScrolling ? "Scrolling..." : ""}
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        {metrics.map((metric, index) => (
          <MobileCard
            key={index}
            title={metric.label}
            subtitle={`${metric.change > 0 ? "+" : ""}${metric.change}% this month`}
          >
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  {metric.value}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${metric.trend === "up" ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400" : "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400"}`}>
                {metric.icon}
              </div>
            </div>
          </MobileCard>
        ))}

        {/* Notifications */}
        <MobileCard
          title="Recent Alerts"
          actionLabel="View All"
          onTap={() => navigate("/notifications")}
        >
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-1">
                <Bell className="w-4 h-4 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Invoice Overdue
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  INV-2024-002 is overdue
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-1">
                <Bell className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  New Client
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tech Corp signed up today
                </p>
              </div>
            </div>
          </div>
        </MobileCard>

        {/* Filter Section */}
        {deviceInfo.isMobile && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {(["all", "invoices", "payments"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeFilter === filter
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Transactions List */}
        <div className={deviceInfo.isDesktop ? "col-span-3" : ""}>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Transactions
              </h3>
              <button
                onClick={() => setShowFilterSheet(true)}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
              >
                Filter
              </button>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 px-2 -mx-2 rounded transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {transaction.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {transaction.date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        ${transaction.amount.toLocaleString()}
                      </p>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(transaction.status)}`}
                      >
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No transactions found
                  </p>
                </div>
              )}
            </div>

            <MobileButton
              variant="outline"
              size="sm"
              fullWidth
              className="mt-4"
              onClick={() => navigate("/payments")}
            >
              View All Transactions
            </MobileButton>
          </div>
        </div>
      </div>

      {/* Filter Sheet */}
      <MobileSheet
        isOpen={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        title="Filter Transactions"
      >
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Transaction Type
            </h4>
            <div className="space-y-2">
              {(["all", "invoices", "payments", "expenses"] as const).map((filter) => (
                <label key={filter} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="filter"
                    value={filter}
                    checked={activeFilter === filter || (activeFilter === "all" && filter === "all")}
                    onChange={() => setActiveFilter(filter === "expenses" ? "all" : (filter as any))}
                    className="w-4 h-4 rounded-full"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Status
            </h4>
            <div className="space-y-2">
              {["completed", "pending", "overdue"].map((status) => (
                <label key={status} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <MobileButton onClick={() => setShowFilterSheet(false)}>
            Apply Filters
          </MobileButton>
        </div>
      </MobileSheet>
    </ResponsiveLayout>
  );
};

interface NavLinkProps {
  label: string;
  icon: string;
  active?: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ label, icon, active }) => (
  <button
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      active
        ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-medium"
        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
    }`}
  >
    <span className="text-lg">{icon}</span>
    <span>{label}</span>
  </button>
);

export default MobileDashboard;
