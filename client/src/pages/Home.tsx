import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import {
  FolderKanban,
  Users,
  FileText,
  Receipt,
  DollarSign,
  Package,
  Briefcase,
  CreditCard,
  BarChart3,
  UserCog,
  ArrowRight,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  // useEffect must be called before any conditional returns
  useEffect(() => {
    // Don't redirect while loading to see actual auth state
    if (loading) {
      return;
    }

    // If not authenticated, show the home page (not redirecting)
    // Users can view the landing page even without authentication
    // If they want to access protected features, they'll be redirected
    if (!isAuthenticated) {
      return;
    }

    // If authenticated, redirect to dashboard for authenticated users
    navigate("/crm/super-admin");
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Show the home page for both authenticated and unauthenticated users
  // Protected pages handle their own auth checks

  const features = [
    {
      title: "Projects",
      description: "Manage and track all your projects",
      icon: FolderKanban,
      href: "/projects",
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Clients",
      description: "Client relationship management",
      icon: Users,
      href: "/clients",
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "Invoices",
      description: "Create and manage invoices",
      icon: FileText,
      href: "/invoices",
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      title: "Estimates",
      description: "Generate quotations and estimates",
      icon: Receipt,
      href: "/estimates",
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950",
    },
    {
      title: "Payments",
      description: "Track payments and transactions",
      icon: DollarSign,
      href: "/payments",
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      title: "Products",
      description: "Product catalog management",
      icon: Package,
      href: "/products",
      color: "text-cyan-500",
      bgColor: "bg-cyan-50 dark:bg-cyan-950",
    },
    {
      title: "Services",
      description: "Service offerings catalog",
      icon: Briefcase,
      href: "/services",
      color: "text-indigo-500",
      bgColor: "bg-indigo-50 dark:bg-indigo-950",
    },
    {
      title: "Accounting",
      description: "Financial management and reports",
      icon: CreditCard,
      href: "/accounting",
      color: "text-pink-500",
      bgColor: "bg-pink-50 dark:bg-pink-950",
    },
    {
      title: "Reports",
      description: "Analytics and insights",
      icon: BarChart3,
      href: "/reports",
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950",
    },
    {
      title: "HR",
      description: "Human resources management",
      icon: UserCog,
      href: "/hr",
      color: "text-rose-500",
      bgColor: "bg-rose-50 dark:bg-rose-950",
    },
  ];

  return (
    <ModuleLayout
      title="Welcome to Your CRM"
      description="Manage your clients, projects, invoices, and more from one powerful platform"
      icon={<FolderKanban className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
      ]}
    >
      <div className="space-y-8">

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.href}
                className="cursor-pointer hover:shadow-lg hover:shadow-primary/10 transition-all group hover:scale-105 border-2 hover:border-primary/50"
                onClick={() => navigate(feature.href)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg ${feature.bgColor}`}>
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                  <CardTitle className="mt-4">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full group-hover:bg-accent">
                    View {feature.title}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold mb-6">Quick Overview</h3>
          <div className="grid gap-4 md:grid-cols-4">
            <StatsCard
              label="Total Projects"
              value="0"
              description="Get started by creating a project"
              icon={<FolderKanban className="h-5 w-5" />}
              color="border-l-blue-500"
            />

            <StatsCard
              label="Active Clients"
              value="0"
              description="Add your first client"
              icon={<Users className="h-5 w-5" />}
              color="border-l-green-500"
            />

            <StatsCard
              label="Pending Invoices"
              value="0"
              description="No pending invoices"
              icon={<FileText className="h-5 w-5" />}
              color="border-l-purple-500"
            />

            <StatsCard label="Revenue" value="KES 0" description="This month" icon={<DollarSign className="h-5 w-5" />} color="border-l-emerald-500" />
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}

