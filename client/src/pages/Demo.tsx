import React, { useState } from "react";
import { WebsiteNav } from "@/pages/website/WebsiteNav";
import { WebsiteFooter } from "@/pages/website/WebsiteFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart3,
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Edit2,
  Trash2,
  Plus,
  Layout,
  Play,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";

/**
 * Demo Dashboard
 * Showcases all features and modules available in the Melitech CRM
 * Designed for marketing, testing, and onboarding new users
 */
export default function DemoPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  // Demo data
  const demoStats = {
    activeUsers: 1254,
    activeProjects: 28,
    totalRevenue: 2540000,
    pendingInvoices: 12,
  };

  const demoInvoices = [
    {
      id: "1",
      number: "INV-000001",
      client: "Tech Solutions Ltd",
      amount: 125000,
      status: "sent",
      date: "2026-03-01",
    },
    {
      id: "2",
      number: "INV-000002",
      client: "Digital Agency Inc",
      amount: 89500,
      status: "pending",
      date: "2026-03-02",
    },
    {
      id: "3",
      number: "INV-000003",
      client: "Enterprise Corp",
      amount: 250000,
      status: "draft",
      date: "2026-03-03",
    },
  ];

  const demoProjects = [
    { id: "1", name: "Website Redesign", client: "Tech Solutions", status: "active", progress: 75 },
    { id: "2", name: "Mobile App Dev", client: "Digital Agency", status: "active", progress: 45 },
    { id: "3", name: "Cloud Migration", client: "Enterprise Corp", status: "on-hold", progress: 30 },
  ];

  const features = [
    {
      id: "invoices",
      title: "Invoicing",
      icon: <FileText className="w-6 h-6" />,
      description: "Create, track, and manage invoices",
      capabilities: ["Auto-numbering", "Payment tracking", "Bulk operations", "PDF export"],
    },
    {
      id: "accounting",
      title: "Accounting",
      icon: <DollarSign className="w-6 h-6" />,
      description: "Financial management and reporting",
      capabilities: ["Chart of Accounts", "Bank reconciliation", "Expense tracking", "Financial reports"],
    },
    {
      id: "projects",
      title: "Projects",
      icon: <BarChart3 className="w-6 h-6" />,
      description: "Project and team management",
      capabilities: ["Project tracking", "Team assignments", "Milestone management", "Budget control"],
    },
    {
      id: "hr",
      title: "Human Resources",
      icon: <Users className="w-6 h-6" />,
      description: "Employee and payroll management",
      capabilities: ["Employee records", "Payroll processing", "Leave management", "Attendance tracking"],
    },
    {
      id: "procurement",
      title: "Procurement",
      icon: <TrendingUp className="w-6 h-6" />,
      description: "Supply chain management",
      capabilities: ["LPO management", "Supplier tracking", "Purchase orders", "Inventory"],
    },
    {
      id: "reports",
      title: "Reports & Analytics",
      icon: <BarChart3 className="w-6 h-6" />,
      description: "Business insights and analytics",
      capabilities: ["Financial reports", "Project analytics", "Performance metrics", "Data export"],
    },
  ];

  const demoUsers = [
    { role: "Admin", email: "admin@demo.melitech", permissions: "Full system access" },
    { role: "Accountant", email: "accountant@demo.melitech", permissions: "Accounting & reports" },
    { role: "HR Manager", email: "hr@demo.melitech", permissions: "HR & payroll" },
    { role: "Project Manager", email: "pm@demo.melitech", permissions: "Projects & teams" },
    { role: "Staff", email: "staff@demo.melitech", permissions: "Limited access" },
    { role: "Client", email: "client@demo.melitech", permissions: "Client portal" },
  ];

  const handleDemoAction = (action: string) => {
    toast.success(`Demo: ${action} executed`);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <WebsiteNav />

      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/80 via-white to-white" />
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-violet-100/40 blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-sm font-medium text-indigo-600 mb-6">
            <Play className="w-3.5 h-3.5" />
            Interactive Demo
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              Experience Nexus360
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 max-w-3xl mx-auto">
            Explore every module and feature in our interactive demo. See how Nexus360 transforms your business operations.
          </p>
        </div>
      </section>

      {/* Demo Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="interactive">Interactive Demo</TabsTrigger>
            <TabsTrigger value="accounts">Demo Accounts</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard
                label="Active Users"
                value={demoStats.activeUsers}
                description="Across all roles"
                icon={<Users className="h-5 w-5" />}
                color="border-l-blue-500"
              />

              <StatsCard
                label="Active Projects"
                value={demoStats.activeProjects}
                description="In progress"
                icon={<BarChart3 className="h-5 w-5" />}
                color="border-l-green-500"
              />

              <StatsCard
                label="Total Revenue"
                value={<>Ksh {(demoStats.totalRevenue / 1000).toFixed(0)}K</>}
                description="This period"
                icon={<DollarSign className="h-5 w-5" />}
                color="border-l-green-500"
              />

              <StatsCard
                label="Pending Invoices"
                value={demoStats.pendingInvoices}
                description="Awaiting action"
                icon={<AlertCircle className="h-5 w-5" />}
                color="border-l-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Invoices */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Invoices</CardTitle>
                  <CardDescription>Latest invoice activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {demoInvoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <p className="font-medium">{invoice.number}</p>
                          <p className="text-sm text-muted-foreground">{invoice.client}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">Ksh {invoice.amount.toLocaleString()}</p>
                          <Badge variant="outline" className="text-xs">
                            {invoice.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full mt-4" onClick={() => toast.info("Navigate to Invoices from the sidebar")}>View All Invoices</Button>
                </CardContent>
              </Card>

              {/* Active Projects */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Projects</CardTitle>
                  <CardDescription>Current project status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {demoProjects.map((project) => (
                      <div key={project.id} className="p-3 border rounded">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{project.name}</p>
                          <Badge
                            variant={project.status === "active" ? "default" : "secondary"}
                          >
                            {project.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{project.client}</p>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-right mt-1">{project.progress}%</p>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full mt-4" onClick={() => toast.info("Navigate to Projects from the sidebar")}>View All Projects</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature) => (
                <Card
                  key={feature.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedFeature(feature.id)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">{feature.icon}</div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.capabilities.map((cap, idx) => (
                        <li key={feature || `demo-${idx}`} className="text-sm flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          {cap}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Interactive Demo Tab */}
          <TabsContent value="interactive" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Invoice Demo</CardTitle>
                <CardDescription>Try creating an invoice with auto-generated numbering</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Invoice Number</Label>
                    <Input value="INV-000004" disabled />
                  </div>
                  <div>
                    <Label>Client</Label>
                    <Input placeholder="Select client..." />
                  </div>
                  <div>
                    <Label>Amount (KES)</Label>
                    <Input type="number" placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input type="date" />
                  </div>
                </div>
                <Button
                  onClick={() => handleDemoAction("Invoice created")}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CRUD Operations Demo</CardTitle>
                <CardDescription>Interactive example of Create, Read, Update, Delete operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { icon: <Plus className="w-4 h-4" />, label: "Create new record", action: "Create" },
                    { icon: <Eye className="w-4 h-4" />, label: "View records", action: "View" },
                    { icon: <Edit2 className="w-4 h-4" />, label: "Edit record", action: "Edit" },
                    { icon: <Trash2 className="w-4 h-4" />, label: "Delete record", action: "Delete" },
                  ].map((item) => (
                    <Button
                      key={item.action}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleDemoAction(`${item.action} action executed`)}
                    >
                      {item.icon}
                      <span className="ml-2">{item.label}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Demo Accounts Tab */}
          <TabsContent value="accounts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Demo User Accounts</CardTitle>
                <CardDescription>
                  Use these accounts to test different features and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {demoUsers.map((user, idx) => (
                    <Card key={user.email || `user-${idx}`} className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{user.role}</h4>
                          <Badge>{user.permissions}</Badge>
                        </div>
                        <div className="text-sm">
                          <p className="text-muted-foreground">Email: {user.email}</p>
                          <p className="text-muted-foreground">Password: <code>Demo@123</code></p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(user.email);
                            toast.success("Email copied to clipboard");
                          }}
                        >
                          Copy Email
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Access by Role</CardTitle>
                <CardDescription>Which features each role can access</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <p><strong>Admin:</strong> Full access to all modules and features</p>
                  <p><strong>Accountant:</strong> Accounting, invoices, payments, reports, and bank reconciliation</p>
                  <p><strong>HR Manager:</strong> Employee records, payroll, leave, attendance</p>
                  <p><strong>Project Manager:</strong> Projects, teams, clients, budgets, and reports</p>
                  <p><strong>Staff:</strong> Projects, attendance, leave requests, limited reports</p>
                  <p><strong>Client:</strong> Client portal - view projects, invoices, and documents</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <Sparkles className="w-8 h-8 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-gray-500 mb-8 max-w-xl mx-auto">
            Sign up for a free trial and experience the full power of Nexus360 with your own data.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="/signup">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                Start Free Trial
              </Button>
            </a>
            <a href="/contact">
              <Button size="lg" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                Contact Sales
              </Button>
            </a>
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
}
