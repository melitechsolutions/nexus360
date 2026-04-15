import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WebsiteNav } from "./WebsiteNav";
import { WebsiteFooter } from "./WebsiteFooter";
import {
  Users, DollarSign, UserCog, Briefcase, ShoppingCart, BarChart3,
  Calendar, Ticket, MessageSquare, FileCheck, Target, Sparkles,
  ArrowRight, CheckCircle, Zap, Shield, Globe, Layers,
  Receipt, Package, CreditCard, TrendingUp, Clock, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

const ICON_MAP: Record<string, any> = { Users, DollarSign, UserCog, Briefcase, ShoppingCart, BarChart3, Calendar, Ticket, MessageSquare, FileCheck, Target, Sparkles, Shield, Globe, Zap, Activity, Layers };

const DEFAULT_FEATURE_SECTIONS = [
  {
    category: "CRM & Sales",
    icon: Users,
    color: "from-blue-500 to-blue-600",
    accent: "text-blue-600",
    border: "border-blue-200",
    bg: "bg-blue-50/50",
    desc: "A complete client relationship and sales pipeline — from first contact to closed deal.",
    features: [
      "Client & contact management with full interaction history",
      "Visual pipeline with custom stages",
      "Opportunity tracking and forecasting",
      "Product catalog with pricing and discounts",
      "Quotations and proposals",
      "Activity logging (calls, emails, meetings)",
      "Lead source attribution and conversion tracking",
    ],
  },
  {
    category: "Finance & Billing",
    icon: DollarSign,
    color: "from-emerald-500 to-teal-600",
    accent: "text-emerald-600",
    border: "border-emerald-200",
    bg: "bg-emerald-50/50",
    desc: "End-to-end financial operations — from invoicing to chart of accounts.",
    features: [
      "Invoice creation with itemized line items",
      "Recurring invoice schedules",
      "M-Pesa, Stripe, and bank payment integration",
      "Payment tracking and receipt management",
      "Expense management and approvals",
      "Journal entries and chart of accounts",
      "Profit & Loss, Balance Sheet, Trial Balance",
      "Tax management and VAT reporting",
    ],
  },
  {
    category: "HR & Payroll",
    icon: UserCog,
    color: "from-violet-500 to-purple-600",
    accent: "text-violet-600",
    border: "border-violet-200",
    bg: "bg-violet-50/50",
    desc: "Complete workforce management from hiring to payroll disbursement.",
    features: [
      "Employee records with document management",
      "Department and job group hierarchy",
      "Leave application, approvals, and balances",
      "Attendance tracking with clock in/out",
      "Payroll calculation (basic, allowances, deductions)",
      "PAYE, NHIF, NSSF, HELB statutory deductions",
      "Payslip generation and bulk email delivery",
      "Performance reviews and appraisals",
    ],
  },
  {
    category: "Projects & Work Orders",
    icon: Briefcase,
    color: "from-amber-500 to-orange-600",
    accent: "text-amber-600",
    border: "border-amber-200",
    bg: "bg-amber-50/50",
    desc: "Deliver projects on time and on budget with complete visibility.",
    features: [
      "Project creation with milestones and phases",
      "Task assignment with priorities and deadlines",
      "Time tracking per task and team member",
      "Budget vs actual cost tracking",
      "Work order management with field assignments",
      "Kanban and list views",
      "Team collaboration and file attachments",
    ],
  },
  {
    category: "Procurement",
    icon: ShoppingCart,
    color: "from-rose-500 to-red-600",
    accent: "text-rose-600",
    border: "border-rose-200",
    bg: "bg-rose-50/50",
    desc: "Streamline purchasing from requisition to goods delivery.",
    features: [
      "Purchase requisitions with approval workflows",
      "Local Purchase Orders (LPO) generation",
      "Supplier management and vendor ratings",
      "Goods Received Notes (GRN)",
      "Invoice matching and reconciliation",
      "Procurement budget tracking",
      "Inventory and stock management",
    ],
  },
  {
    category: "Analytics & Reports",
    icon: BarChart3,
    color: "from-cyan-500 to-blue-600",
    accent: "text-cyan-600",
    border: "border-cyan-200",
    bg: "bg-cyan-50/50",
    desc: "Real-time dashboards and reports across every business function.",
    features: [
      "Executive dashboard with KPI widgets",
      "Revenue, expense, and profit trend charts",
      "Sales pipeline and conversion reports",
      "HR headcount and payroll reports",
      "Project completion and time reports",
      "Custom report builder",
      "Scheduled automated report delivery",
    ],
  },
  {
    category: "AI Hub",
    icon: Sparkles,
    color: "from-violet-600 to-indigo-700",
    accent: "text-violet-600",
    border: "border-violet-200",
    bg: "bg-violet-50/50",
    desc: "AI-powered assistance across all modules to speed up your workflows.",
    features: [
      "AI document drafting (proposals, contracts, emails)",
      "Data analysis and anomaly detection",
      "Smart invoice categorization",
      "Predictive cash flow insights",
      "Natural language data queries",
      "AI-assisted performance reviews",
    ],
  },
  {
    category: "Communications",
    icon: MessageSquare,
    color: "from-sky-500 to-cyan-600",
    accent: "text-sky-600",
    border: "border-sky-200",
    bg: "bg-sky-50/50",
    desc: "Keep your team and clients in sync with built-in messaging.",
    features: [
      "Internal team announcements",
      "Automated client notifications",
      "SMS and email dispatch",
      "Document sharing and attachments",
      "Activity feed per record",
    ],
  },
];

export default function Features() {
  const [, navigate] = useLocation();
  const { data: dbContent } = trpc.websiteAdmin.publicFeaturesContent.useQuery(undefined, { retry: false, staleTime: 300000 });

  const heroTitle = dbContent?.heroTitle || "Every feature your business demands";
  const heroBadge = dbContent?.heroBadge || "18 Modules. One Platform.";
  const heroSubtitle = dbContent?.heroSubtitle || "Nexus360 is not a collection of separate tools stitched together — it is one deeply integrated platform where every module shares data, permissions, and workflows.";

  const COLORS = [
    { color: "from-blue-500 to-blue-600", accent: "text-blue-600", border: "border-blue-200", bg: "bg-blue-50/50" },
    { color: "from-emerald-500 to-teal-600", accent: "text-emerald-600", border: "border-emerald-200", bg: "bg-emerald-50/50" },
    { color: "from-violet-500 to-purple-600", accent: "text-violet-600", border: "border-violet-200", bg: "bg-violet-50/50" },
    { color: "from-amber-500 to-orange-600", accent: "text-amber-600", border: "border-amber-200", bg: "bg-amber-50/50" },
    { color: "from-rose-500 to-red-600", accent: "text-rose-600", border: "border-rose-200", bg: "bg-rose-50/50" },
    { color: "from-cyan-500 to-blue-600", accent: "text-cyan-600", border: "border-cyan-200", bg: "bg-cyan-50/50" },
    { color: "from-violet-600 to-indigo-700", accent: "text-violet-600", border: "border-violet-200", bg: "bg-violet-50/50" },
    { color: "from-sky-500 to-cyan-600", accent: "text-sky-600", border: "border-sky-200", bg: "bg-sky-50/50" },
  ];

  const featureSections = dbContent?.sections?.length
    ? dbContent.sections.map((s: any, i: number) => ({
        ...s,
        icon: ICON_MAP[s.icon] || Users,
        ...(COLORS[i % COLORS.length]),
      }))
    : DEFAULT_FEATURE_SECTIONS;

  const defaultPillars = [
    { icon: Shield, title: "Security First", desc: "RBAC, MFA, audit logs, encryption at rest and in transit." },
    { icon: Zap,    title: "Performance",    desc: "Fast, responsive UI optimised for real workloads at scale." },
    { icon: Globe,  title: "Multi-tenant",   desc: "Full data isolation between organisations on one deployment." },
    { icon: Activity, title: "Reliability",  desc: "99.9% uptime SLA with automated failover and backups." },
  ];
  const pillars = dbContent?.pillars?.length
    ? dbContent.pillars.map((p: any) => ({ ...p, icon: ICON_MAP[p.icon] || Shield }))
    : defaultPillars;

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <WebsiteNav />

      {/* Hero */}
      <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-28 overflow-hidden bg-gradient-to-b from-indigo-50/80 via-white to-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-100/60 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-6 bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Layers className="mr-1.5 h-3 w-3" /> {heroBadge}
          </Badge>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6 leading-none">
            {heroTitle}
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            {heroSubtitle}
          </p>
          <Button
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-6 text-lg shadow-lg shadow-indigo-200"
            onClick={() => navigate("/login")}
          >
            Access the Platform <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Feature sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        <div className="space-y-10">
          {featureSections.map((section: any, idx: number) => {
            const Icon = section.icon;
            const isEven = idx % 2 === 0;
            return (
              <div
                key={section.category}
                className={cn(
                  "rounded-2xl border p-8 lg:p-10",
                  section.border,
                  section.bg,
                )}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br", section.color)}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">{section.category}</h2>
                    <p className={cn("text-sm", section.accent)}>{section.desc}</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {section.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <CheckCircle className={cn("h-4 w-4 shrink-0 mt-0.5", section.accent)} />
                      <span className="text-sm text-gray-600 leading-relaxed">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Platform pillars */}
      <section className="py-24 border-t border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs uppercase tracking-widest text-indigo-600 font-semibold mb-3">Platform fundamentals</p>
          <h2 className="text-4xl md:text-5xl font-black mb-14">Solid foundations, every layer</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map((p: any) => {
              const Icon = typeof p.icon === 'string' ? (ICON_MAP[p.icon] || Shield) : p.icon;
              return (
                <div key={p.title} className="rounded-2xl border border-gray-200 bg-white p-7 text-center hover:shadow-lg hover:border-indigo-300 transition-all">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 mb-5">
                    <Icon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{p.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-b from-white to-indigo-50/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-black mb-5">See it in action</h2>
          <p className="text-gray-500 mb-8 text-lg">Request a demo and we will walk you through every module.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 shadow-lg shadow-indigo-200" onClick={() => navigate("/login")}>
              Request Demo <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-300 px-8 py-6" onClick={() => navigate("/pricing")}>
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
}
