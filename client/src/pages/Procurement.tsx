import { useState, useEffect } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { ShoppingCart, FileText, Truck, BarChart3, Plus, Package, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { StatsCard } from "@/components/ui/stats-card";
import { cn } from "@/lib/utils";

export default function Procurement() {
  const [, navigate] = useLocation();
  const [procurementData, setProcurementData] = useState({
    totalRequests: 0,
    totalOrders: 0,
    totalSpend: 0,
    activeVendors: 0,
  });

  // Fetch procurement data from backend
  const { data: requests = [] } = trpc.procurement.list.useQuery();
  const { data: purchaseOrders = [] } = trpc.lpo.list.useQuery();
  const { data: vendors = [] } = trpc.suppliers?.list?.useQuery?.() || { data: [] };

  // Calculate procurement metrics
  useEffect(() => {
    // Defensive check to ensure all data is available and is an array before proceeding
    if (!Array.isArray(requests) || !Array.isArray(purchaseOrders)) {
      return;
    }
    
    const totalSpend = (purchaseOrders as any[]).reduce((sum, po) => sum + (po.amount || 0), 0) / 100;
    const vendorSet = new Set((purchaseOrders as any[]).map((po: any) => po.vendorId).filter(Boolean));

    setProcurementData({
      totalRequests: requests.length,
      totalOrders: purchaseOrders.length,
      totalSpend,
      activeVendors: vendorSet.size,
    });
  }, [requests, purchaseOrders, vendors]);

  const procurementModules = [
    {
      title: "Purchase Requests",
      description: "Create and manage procurement requisitions",
      icon: ShoppingCart,
      href: "/procurement/requests",
      stats: { label: "Total Requests", value: procurementData.totalRequests.toString() },
      borderColor: "border-l-orange-500",
      iconBg: "bg-orange-50 dark:bg-orange-950",
      iconColor: "text-orange-500",
    },
    {
      title: "Purchase Orders",
      description: "Track and manage purchase orders",
      icon: FileText,
      href: "/procurement/orders",
      stats: { label: "Active Orders", value: procurementData.totalOrders.toString() },
      borderColor: "border-l-blue-500",
      iconBg: "bg-blue-50 dark:bg-blue-950",
      iconColor: "text-blue-500",
    },
    {
      title: "Suppliers",
      description: "Manage vendor and supplier information",
      icon: Truck,
      href: "/suppliers",
      stats: { label: "Active Vendors", value: procurementData.activeVendors.toString() },
      borderColor: "border-l-green-500",
      iconBg: "bg-green-50 dark:bg-green-950",
      iconColor: "text-green-500",
    },
    {
      title: "Inventory",
      description: "Track stock levels and warehouse management",
      icon: Package,
      href: "/inventory",
      stats: { label: "SKUs", value: "0" },
      borderColor: "border-l-purple-500",
      iconBg: "bg-purple-50 dark:bg-purple-950",
      iconColor: "text-purple-500",
    },
  ];

  return (
    <ModuleLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Procurement", href: "/procurement" },
      ]}
      title="Procurement"
      description="Manage purchase requests, orders, and supplier relationships"
      icon={<ShoppingCart className="w-6 h-6" />}
    >
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="flex gap-3 flex-wrap">
          <Button onClick={() => navigate("/lpos/create")} className="gap-2">
            <Plus className="h-4 w-4" />
            New Request
          </Button>
          <Button onClick={() => navigate("/orders/create")} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            New Purchase Order
          </Button>
          <Button onClick={() => navigate("/suppliers/create")} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            New Supplier
          </Button>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Total Requests" value={procurementData.totalRequests} description="Active requisitions" color="border-l-orange-500" />

          <StatsCard label="Active Orders" value={procurementData.totalOrders} description="Purchase orders" color="border-l-purple-500" />

          <StatsCard
            label="Total Spend"
            value={<>KES {(procurementData.totalSpend).toLocaleString('en-US', { maximumFractionDigits: 0 })}</>}
            description="YTD procurement spend"
            color="border-l-green-500"
          />

          <StatsCard label="Active Suppliers" value={procurementData.activeVendors} description="Vendor relationships" color="border-l-blue-500" />
        </div>

        {/* Modules Grid - Unified Card Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {procurementModules.map((module) => {
            const IconComponent = module.icon;
            return (
              <button
                key={module.href}
                onClick={() => navigate(module.href)}
                className={cn(
                  "group relative overflow-hidden rounded-xl border-l-4 p-4 sm:p-5 text-left transition-all duration-300",
                  "bg-white dark:bg-slate-800/60 border-t border-r border-b border-slate-200 dark:border-slate-700",
                  "hover:shadow-xl hover:-translate-y-1 cursor-pointer",
                  module.borderColor
                )}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.07] transition-opacity duration-300 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-lg ${module.iconBg}`}>
                      <IconComponent className={`h-5 w-5 ${module.iconColor}`} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-50">{module.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{module.description}</p>
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{module.stats.label}</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-50 mt-0.5">{module.stats.value}</p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500 bg-gradient-to-r from-transparent via-current to-transparent"></div>
              </button>
            );
          })}
        </div>
      </div>
    </ModuleLayout>
  );
}
