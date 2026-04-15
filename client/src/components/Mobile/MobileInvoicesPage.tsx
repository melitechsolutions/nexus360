/**
 * Mobile Invoices Page - Optimized for mobile viewing and management
 * Includes filtering, searching, and quick actions
 */

import React, { useState, useMemo } from "react";
import { Search, Plus, Filter, MoreVertical, Download, Send, Eye } from "lucide-react";
import ResponsiveLayout, {
  MobileCard,
  MobileButton,
  MobileSheet,
} from "../Mobile/ResponsiveLayout";
import { useDeviceInfo } from "../../hooks/useMobileHooks";

interface Invoice {
  id: string;
  number: string;
  clientName: string;
  amount: number;
  date: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue";
  currency: string;
}

interface MobileInvoicesPageProps {
  onCreateInvoice?: () => void;
  onEditInvoice?: (id: string) => void;
  onDeleteInvoice?: (id: string) => void;
}

export const MobileInvoicesPage: React.FC<MobileInvoicesPageProps> = ({
  onCreateInvoice,
  onEditInvoice,
  onDeleteInvoice,
}) => {
  const deviceInfo = useDeviceInfo();
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "sent" | "paid" | "overdue">("all");
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

  // Mock data
  const invoices: Invoice[] = [
    {
      id: "1",
      number: "INV-2024-001",
      clientName: "Acme Corp",
      amount: 2500,
      date: "2024-01-15",
      dueDate: "2024-02-15",
      status: "paid",
      currency: "USD",
    },
    {
      id: "2",
      number: "INV-2024-002",
      clientName: "Tech Solutions",
      amount: 3200,
      date: "2024-01-10",
      dueDate: "2024-02-10",
      status: "sent",
      currency: "USD",
    },
    {
      id: "3",
      number: "INV-2024-003",
      clientName: "Global Industries",
      amount: 1800,
      date: "2024-01-01",
      dueDate: "2024-02-01",
      status: "overdue",
      currency: "USD",
    },
    {
      id: "4",
      number: "INV-2024-004",
      clientName: "Local Startup",
      amount: 950,
      date: "2024-01-20",
      dueDate: "2024-02-20",
      status: "draft",
      currency: "USD",
    },
  ];

  // Filter and search
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch =
        invoice.number.toLowerCase().includes(searchText.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(searchText.toLowerCase());
      const matchesFilter =
        filterStatus === "all" || invoice.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [searchText, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      case "sent":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
      case "overdue":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
      case "draft":
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
    }
  };

  const handleQuickAction = (action: string, invoiceId: string) => {
    switch (action) {
      case "view":
        setSelectedInvoice(invoices.find((i) => i.id === invoiceId) || null);
        break;
      case "edit":
        onEditInvoice?.(invoiceId);
        break;
      case "delete":
        if (window.confirm("Are you sure you want to delete this invoice?")) {
          onDeleteInvoice?.(invoiceId);
        }
        break;
    }
    setShowActionMenu(null);
  };

  const getStatusStats = () => {
    return {
      total: invoices.length,
      paid: invoices.filter((i) => i.status === "paid").length,
      pending: invoices.filter((i) => i.status === "sent").length,
      overdue: invoices.filter((i) => i.status === "overdue").length,
    };
  };

  const stats = getStatusStats();

  return (
    <ResponsiveLayout
      header={
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 md:px-6 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Invoices
              </h1>
              <MobileButton
                size="sm"
                onClick={onCreateInvoice}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className={deviceInfo.isMobile ? "" : "flex"}>New</span>
              </MobileButton>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Search by invoice # or client..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </header>
      }
      sidebar={
        <nav className="p-4 space-y-2">
          <NavLink label="Dashboard" icon="📊" />
          <NavLink label="Invoices" icon="📄" active />
          <NavLink label="Clients" icon="👥" />
          <NavLink label="Reports" icon="📈" />
        </nav>
      }
    >
      <div className="space-y-4">
        {/* Stats Cards - Mobile optimized */}
        <div
          className={`grid gap-3 ${
            deviceInfo.isMobile ? "grid-cols-2" : "grid-cols-4"
          }`}
        >
          <StatCard label="Total" value={stats.total} color="blue" />
          <StatCard label="Paid" value={stats.paid} color="green" />
          <StatCard label="Pending" value={stats.pending} color="yellow" />
          <StatCard label="Overdue" value={stats.overdue} color="red" />
        </div>

        {/* Filter Section */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {(["all", "draft", "sent", "paid", "overdue"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filterStatus === status
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Invoices List */}
        {filteredInvoices.length > 0 ? (
          <div className="space-y-2">
            {filteredInvoices.map((invoice) => (
              <MobileCard
                key={invoice.id}
                title={invoice.number}
                subtitle={invoice.clientName}
                onTap={() => handleQuickAction("view", invoice.id)}
              >
                <div className="space-y-3">
                  {/* Amount and Status */}
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {invoice.currency} {invoice.amount.toLocaleString()}
                    </p>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <div>
                      <p className="font-medium text-gray-600 dark:text-gray-300">Issued</p>
                      <p>{new Date(invoice.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600 dark:text-gray-300">Due</p>
                      <p>{new Date(invoice.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleQuickAction("view", invoice.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors min-h-[40px]"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                    {invoice.status !== "paid" && invoice.status !== "overdue" ? (
                      <button
                        onClick={() => handleQuickAction("edit", invoice.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 text-sm font-medium hover:bg-green-200 dark:hover:bg-green-800 transition-colors min-h-[40px]"
                      >
                        <Send className="w-4 h-4" />
                        <span>Send</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => { handleQuickAction("view", invoice.id); setTimeout(() => window.print(), 300); }}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors min-h-[40px]"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    )}
                    <button
                      onClick={() => setShowActionMenu(showActionMenu === invoice.id ? null : invoice.id)}
                      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors relative"
                    >
                      <MoreVertical className="w-4 h-4" />
                      {showActionMenu === invoice.id && (
                        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                          <button
                            onClick={() => handleQuickAction("edit", invoice.id)}
                            className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleQuickAction("delete", invoice.id)}
                            className="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 text-left"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </MobileCard>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No invoices found
            </p>
            <MobileButton onClick={onCreateInvoice} size="sm" className="inline-block">
              Create First Invoice
            </MobileButton>
          </div>
        )}
      </div>

      {/* Invoice Detail Sheet */}
      {selectedInvoice && (
        <MobileSheet
          isOpen={true}
          onClose={() => setSelectedInvoice(null)}
          title="Invoice Details"
        >
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
                Invoice Number
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                {selectedInvoice.number}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
                Client
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                {selectedInvoice.clientName}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
                  Amount
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {selectedInvoice.currency} {selectedInvoice.amount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
                  Status
                </p>
                <span
                  className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedInvoice.status)}`}
                >
                  {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">Issued Date</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(selectedInvoice.date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">Due Date</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
              <MobileButton
                onClick={() => {
                  handleQuickAction("edit", selectedInvoice.id);
                  setSelectedInvoice(null);
                }}
                className="flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Invoice
              </MobileButton>
              <MobileButton
                variant="secondary"
                onClick={() => {
                  window.print();
                  setSelectedInvoice(null);
                }}
                className="flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </MobileButton>
            </div>
          </div>
        </MobileSheet>
      )}
    </ResponsiveLayout>
  );
};

interface StatCardProps {
  label: string;
  value: number;
  color: "blue" | "green" | "yellow" | "red";
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color }) => {
  const colorClasses = {
    blue: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200",
    green: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200",
    yellow: "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200",
    red: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200",
  };

  return (
    <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
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

export default MobileInvoicesPage;
