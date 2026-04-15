import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FolderKanban,
  FileText,
  DollarSign,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";

export default function ClientDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    activeProjects: 0,
    pendingInvoices: 0,
    totalSpent: 0,
    supportTickets: 0,
  });

  // Fetch dashboard metrics
  const { data: dashboardMetrics } = trpc.dashboard.metrics.useQuery();

  useEffect(() => {
    if (dashboardMetrics) {
      setMetrics({
        activeProjects: dashboardMetrics.totalProjects || 0,
        pendingInvoices: dashboardMetrics.pendingInvoices || 0,
        totalSpent: dashboardMetrics.monthlyRevenue || 0,
        supportTickets: 2,
      });
    }
  }, [dashboardMetrics]);

  const clientFeatures = [
    {
      title: "My Projects",
      description: "View your active projects",
      icon: <FolderKanban className="w-8 h-8" />,
      href: "/projects",
      color: "from-blue-500 to-blue-600",
      stat: { label: "Active", value: metrics.activeProjects },
    },
    {
      title: "Invoices",
      description: "View and download invoices",
      icon: <FileText className="w-8 h-8" />,
      href: "/invoices",
      color: "from-green-500 to-green-600",
      stat: { label: "Pending", value: metrics.pendingInvoices },
    },
    {
      title: "Payments",
      description: "View payment history",
      icon: <DollarSign className="w-8 h-8" />,
      href: "/payments",
      color: "from-purple-500 to-purple-600",
      stat: { label: "Total Spent", value: "KES " + (metrics.totalSpent / 1000).toFixed(1) + "K" },
    },
    {
      title: "Support",
      description: "Contact support team",
      icon: <MessageSquare className="w-8 h-8" />,
      href: "#",
      color: "from-orange-500 to-orange-600",
      stat: { label: "Open Tickets", value: metrics.supportTickets },
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-4">
          <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Client Portal
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Welcome back, {user?.name}. Manage your projects and invoices.
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            label="Active Projects"
            value={metrics.activeProjects}
            description="In progress"
            icon={<FolderKanban className="h-5 w-5" />}
            color="border-l-blue-500"
          />

          <StatsCard
            label="Pending Invoices"
            value={metrics.pendingInvoices}
            description="Awaiting payment"
            icon={<FileText className="h-5 w-5" />}
            color="border-l-green-500"
          />

          <StatsCard
            label="Total Spent"
            value={<>KES {(metrics.totalSpent / 1000).toFixed(1)}K</>}
            description="All time"
            icon={<DollarSign className="h-5 w-5" />}
            color="border-l-purple-500"
          />

          <StatsCard
            label="Support Tickets"
            value={metrics.supportTickets}
            description="Open tickets"
            icon={<MessageSquare className="h-5 w-5" />}
            color="border-l-orange-500"
          />
        </div>

        {/* Client Features Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {clientFeatures.map((feature) => (
            <Card
              key={feature.href}
              className="cursor-pointer hover:shadow-lg hover:shadow-primary/10 transition-all group hover:scale-105 border-2 hover:border-primary/50"
              onClick={() => navigate(feature.href)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${feature.color} text-white`}>
                    {feature.icon}
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                <CardTitle className="mt-4">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" className="w-full group-hover:bg-accent">
                    View {feature.title}
                  </Button>
                  <span className="text-sm font-semibold text-muted-foreground">
                    {feature.stat.value}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold">Recent Activity</h3>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">No recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your recent projects and invoices will appear here.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
