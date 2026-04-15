import React, { useState } from "react";
import { toast } from "sonner";
import { WebsiteNav } from "@/pages/website/WebsiteNav";
import { WebsiteFooter } from "@/pages/website/WebsiteFooter";
import { BookOpen, ArrowRight, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DocSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: string[];
}

const documentation: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Learn the basics of Melitech CRM",
    icon: <BookOpen className="h-5 w-5" />,
    content: [
      "Dashboard Overview - Your personalized business dashboard with real-time metrics",
      "Navigation Guide - Understanding the main menu and quick access features",
      "Keyboard Shortcuts - Master shortcuts for faster navigation (Ctrl+K to toggle sidebar)",
      "Settings - Configure your account, preferences, and notification settings",
      "Two-Factor Authentication - Secure your account with 2FA setup",
    ],
  },
  {
    id: "sales-management",
    title: "Sales Management",
    description: "Manage clients, projects, and opportunities",
    icon: <BookOpen className="h-5 w-5" />,
    content: [
      "Client Management - Create, edit, and manage client relationships",
      "Project Planning - Set up and track projects with milestones",
      "Opportunities - Track sales opportunities and pipeline",
      "Estimates & Quotes - Generate professional estimates for clients",
      "Receipts & Invoicing - Manage receipts and invoice processing",
    ],
  },
  {
    id: "accounting",
    title: "Accounting & Finance",
    description: "Handle financial operations and reporting",
    icon: <BookOpen className="h-5 w-5" />,
    content: [
      "Invoicing - Create and manage customer invoices with flexible terms",
      "Payments - Record and track payment transactions",
      "Bank Reconciliation - Reconcile bank accounts with transaction records",
      "Chart of Accounts - Manage your accounting structure",
      "Financial Reports - Generate comprehensive financial reports and analytics",
      "Budgeting - Create and monitor departmental budgets",
    ],
  },
  {
    id: "hr-management",
    title: "Human Resources",
    description: "Manage employees and HR operations",
    icon: <BookOpen className="h-5 w-5" />,
    content: [
      "Employee Management - Maintain employee records and profiles",
      "Attendance Tracking - Monitor attendance and time off",
      "Payroll Management - Process salaries and manage payroll",
      "Leave Management - Request and approve leave with workflows",
      "Departments - Organize and manage company departments",
      "Performance Reviews - Conduct employee evaluations",
    ],
  },
  {
    id: "procurement",
    title: "Procurement",
    description: "Manage orders and supplier relationships",
    icon: <BookOpen className="h-5 w-5" />,
    content: [
      "Local Purchase Orders (LPO) - Create and manage local purchase orders",
      "Purchase Orders - Handle national and international orders",
      "Supplier Management - Maintain supplier database and ratings",
      "Inventory Management - Track stock levels and inventory",
      "Imprests - Manage employee advance requests",
    ],
  },
  {
    id: "automation",
    title: "Workflow & Automation",
    description: "Streamline business processes",
    icon: <BookOpen className="h-5 w-5" />,
    content: [
      "Workflow Automation - Set up automated business processes",
      "Approvals & Workflows - Configure multi-level approval workflows",
      "Time Tracking - Track project time and billable hours",
      "Communications - Internal messaging and team communications",
      "Notifications - Manage alerts and notification preferences",
    ],
  },
];

export default function Documentation() {
  const [selectedSection, setSelectedSection] = useState<string>("getting-started");

  const current = documentation.find((doc) => doc.id === selectedSection);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <WebsiteNav />

      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/80 via-white to-white" />
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-sm font-medium text-indigo-600 mb-6">
            <BookOpen className="w-3.5 h-3.5" />
            Knowledge Base
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              Documentation
            </span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Comprehensive guides for using Nexus360 to its full potential
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-2">
            {documentation.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedSection(doc.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                  selectedSection === doc.id
                    ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium border-l-4 border-blue-600"
                    : "text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span>{doc.title}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {current && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-blue-600">{current.icon}</div>
                  <CardTitle>{current.title}</CardTitle>
                </div>
                <CardDescription>{current.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {current.content.map((item, idx) => (
                    <div
                      key={item || `doc-${idx}`}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                      <ArrowRight className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Need more help? Check our User Guide or contact support.
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" size="sm" asChild>
                      <a href="/user-guide" className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        User Guide
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open("https://www.youtube.com/results?search_query=crm+training+tutorials", "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Video Tutorials
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </section>

      <WebsiteFooter />
    </div>
  );
}
