import React from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, ArrowRight } from "lucide-react";
import { Truck, FileText, Wallet, DollarSign, Users } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";

interface ProcurementModule {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  bgColor: string;
  action: string;
}

export default function ProcurementMaster() {
  const [, navigate] = useLocation();
  const { allowed, isLoading } = useRequireFeature("procurement:view");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  const procurementModules: ProcurementModule[] = [
    {
      id: "suppliers",
      title: "Suppliers",
      description: "Manage supplier database, contacts, and ratings",
      icon: <Truck className="w-8 h-8" />,
      href: "/suppliers",
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950",
      action: "Manage Suppliers",
    },
    {
      id: "lpos",
      title: "Local Purchase Orders",
      description: "Create and track local purchase orders",
      icon: <FileText className="w-8 h-8" />,
      href: "/lpos",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      action: "View LPOs",
    },
    {
      id: "orders",
      title: "Purchase Orders",
      description: "Manage and track purchase orders",
      icon: <ShoppingCart className="w-8 h-8" />,
      href: "/orders",
      color: "text-cyan-600",
      bgColor: "bg-cyan-50 dark:bg-cyan-950",
      action: "View Orders",
    },
    {
      id: "imprests",
      title: "Imprests",
      description: "Handle employee cash advances and imprest requests",
      icon: <Wallet className="w-8 h-8" />,
      href: "/imprests",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950",
      action: "Manage Imprests",
    },
    {
      id: "budgets",
      title: "Budgets",
      description: "Track and manage department budgets",
      icon: <DollarSign className="w-8 h-8" />,
      href: "/budgets",
      color: "text-rose-600",
      bgColor: "bg-rose-50 dark:bg-rose-950",
      action: "View Budgets",
    },
    {
      id: "departments",
      title: "Departments",
      description: "Manage organizational departments",
      icon: <Users className="w-8 h-8" />,
      href: "/departments",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
      action: "Manage Departments",
    },
  ];

  return (
    <ModuleLayout
      title="Procurement Management"
      description="Complete procurement operations including suppliers, purchase orders, imprests, and budget tracking"
      icon={<ShoppingCart className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Procurement" },
      ]}
    >
      <div className="space-y-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            label="Procurement Modules"
            value={procurementModules.length}
            description="Core modules available"
            color="border-l-purple-500"
          />

          <StatsCard label="Quick Access" value="6" description="Modules with full CRUD" color="border-l-green-500" />

          <StatsCard label="Integration" value="✓" description="Fully integrated" color="border-l-blue-500" />
        </div>

        {/* Procurement Modules Grid */}
        <div className="space-y-4">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">Procurement Modules</h2>
            <p className="text-gray-600">Access all procurement management tools and modules</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {procurementModules.map((module) => (
              <Card
                key={module.id}
                className="cursor-pointer hover:shadow-lg hover:shadow-primary/10 transition-all group border-2 hover:border-primary/50"
                onClick={() => navigate(module.href)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg ${module.bgColor}`}>
                      <div className={module.color}>
                        {module.icon}
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                  <CardTitle className="mt-4 text-base">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full group-hover:bg-accent">
                    {module.action}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Information Section */}
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-700">
          <CardHeader>
            <CardTitle className="text-lg">Procurement Management Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Key Features:</h4>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                  <span>Supplier management with ratings and audit trails</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                  <span>Local and international purchase order creation and tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                  <span>Employee imprest and cash advance management</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                  <span>Department budget allocation and tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                  <span>Import/Export functionality for all modules</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                  <span>Advanced search and filtering capabilities</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
