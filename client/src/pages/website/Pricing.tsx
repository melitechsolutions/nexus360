import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WebsiteNav } from "./WebsiteNav";
import { WebsiteFooter } from "./WebsiteFooter";
import { CheckCircle, X, ArrowRight, Zap, Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency, CURRENCIES, type CurrencyCode } from "./CurrencyContext";
import { trpc } from "@/lib/trpc";

// Default plans (fallback when DB has no custom config)
const DEFAULT_PLANS = [
  {
    name: "Starter",
    monthlyKes: 5999, annualKes: 4799,
    desc: "Perfect for small teams just getting started.",
    highlight: false,
    badge: null as string | null,
    cta: "Get Started",
    link: "/login",
    features: [
      { text: "Up to 10 users",             included: true },
      { text: "Core CRM & Sales",           included: true },
      { text: "Invoicing & Payments",        included: true },
      { text: "Leave & Attendance",          included: true },
      { text: "Basic HR records",           included: true },
      { text: "Standard reports",           included: true },
      { text: "Email support",              included: true },
      { text: "Projects module",            included: false },
      { text: "Procurement",               included: false },
      { text: "Advanced Analytics",         included: false },
      { text: "M-Pesa / Stripe",            included: false },
      { text: "AI Hub",                    included: false },
      { text: "Multi-organization",         included: false },
      { text: "SSO / SAML",                included: false },
      { text: "Dedicated support",          included: false },
    ],
  },
  {
    name: "Professional",
    monthlyKes: 18999, annualKes: 15199,
    desc: "For growing businesses with advanced operational needs.",
    highlight: true,
    badge: "Most Popular" as string | null,
    cta: "Get Started",
    link: "/login",
    features: [
      { text: "Up to 50 users",             included: true },
      { text: "Core CRM & Sales",           included: true },
      { text: "Invoicing & Payments",        included: true },
      { text: "Leave & Attendance",          included: true },
      { text: "Full HR & Payroll",          included: true },
      { text: "Advanced reports",           included: true },
      { text: "Priority support",           included: true },
      { text: "Projects module",            included: true },
      { text: "Procurement",               included: true },
      { text: "Advanced Analytics",         included: true },
      { text: "M-Pesa / Stripe",            included: true },
      { text: "AI Hub",                    included: true },
      { text: "Multi-organization",         included: false },
      { text: "SSO / SAML",                included: false },
      { text: "Dedicated support",          included: false },
    ],
  },
  {
    name: "Enterprise",
    monthlyKes: 0, annualKes: 0,
    desc: "Unlimited scale with white-labeling, SSO, and dedicated management.",
    highlight: false,
    badge: null as string | null,
    cta: "Contact Sales",
    link: "/contact",
    features: [
      { text: "Unlimited users",            included: true },
      { text: "Core CRM & Sales",           included: true },
      { text: "Invoicing & Payments",        included: true },
      { text: "Leave & Attendance",          included: true },
      { text: "Full HR & Payroll",          included: true },
      { text: "Custom reports & SLAs",      included: true },
      { text: "24/7 dedicated support",     included: true },
      { text: "Projects module",            included: true },
      { text: "Procurement",               included: true },
      { text: "Advanced Analytics",         included: true },
      { text: "M-Pesa / Stripe + custom",   included: true },
      { text: "AI Hub",                    included: true },
      { text: "Multi-organization",         included: true },
      { text: "SSO / SAML",                included: true },
      { text: "Dedicated account manager",  included: true },
    ],
  },
];

const DEFAULT_COMPARISON_ROWS = [
  { category: "Users & Scale" },
  { label: "Users", starter: "Up to 10", pro: "Up to 50", ent: "Unlimited" },
  { label: "Organizations", starter: "1", pro: "1", ent: "Unlimited" },
  { label: "Storage", starter: "10 GB", pro: "100 GB", ent: "Unlimited" },
  { category: "Core Modules" },
  { label: "CRM & Sales", starter: true, pro: true, ent: true },
  { label: "Invoicing & Finance", starter: true, pro: true, ent: true },
  { label: "Basic HR", starter: true, pro: true, ent: true },
  { label: "Full Payroll", starter: false, pro: true, ent: true },
  { label: "Projects & Work Orders", starter: false, pro: true, ent: true },
  { label: "Procurement", starter: false, pro: true, ent: true },
  { category: "Advanced Features" },
  { label: "Advanced Analytics", starter: false, pro: true, ent: true },
  { label: "AI Hub", starter: false, pro: true, ent: true },
  { label: "M-Pesa Integration", starter: false, pro: true, ent: true },
  { label: "Stripe Integration", starter: false, pro: true, ent: true },
  { label: "Custom Integrations", starter: false, pro: false, ent: true },
  { category: "Security & Access" },
  { label: "Role-based access", starter: true, pro: true, ent: true },
  { label: "Audit logs", starter: true, pro: true, ent: true },
  { label: "MFA", starter: true, pro: true, ent: true },
  { label: "SSO / SAML", starter: false, pro: false, ent: true },
  { label: "White-labeling", starter: false, pro: false, ent: true },
  { category: "Support" },
  { label: "Email support", starter: true, pro: true, ent: true },
  { label: "Priority support", starter: false, pro: true, ent: true },
  { label: "Dedicated account manager", starter: false, pro: false, ent: true },
  { label: "SLA guarantee", starter: false, pro: false, ent: true },
];

function Cell({ value }: { value: string | boolean | undefined }) {
  if (value === true)  return <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto" />;
  if (value === false) return <X className="h-5 w-5 text-gray-300 mx-auto" />;
  return <span className="text-sm text-gray-600">{value as string}</span>;
}

export default function Pricing() {
  const [, navigate] = useLocation();
  const [annual, setAnnual] = useState(false);
  const { currency, setCurrency, fmt } = useCurrency();

  // Fetch pricing from DB
  const { data: pricingData } = trpc.websiteAdmin.publicPricing.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Use DB-managed pricing config if available, otherwise fall back to defaults
  const customConfig = pricingData?.customConfig;
  const PLANS = customConfig?.plans || DEFAULT_PLANS;
  const COMPARISON_ROWS = customConfig?.comparisonRows || DEFAULT_COMPARISON_ROWS;
  const faqItems = customConfig?.faq || [
    { q: "Can I change plans later?",         a: "Yes. You can upgrade or downgrade at any time. Pro-rated billing is applied automatically." },
    { q: "How are users counted?",             a: "A user is any person invited to your organization who has login access. Deactivated users do not count." },
    { q: "Is there a free trial?",             a: "Yes — contact us for a 14-day full-access trial of the Professional plan, no credit card required." },
    { q: "Do you offer discounts for NGOs?",  a: "Yes. We offer 30% discounts for registered non-profit organizations. Contact sales for details." },
  ];

  // If we have plan prices from the CRM but no custom config, merge prices into defaults
  const mergedPlans = !customConfig && pricingData?.prices ? PLANS.map((plan: any) => {
    const tierMap: Record<string, string> = { 'Starter': 'starter', 'Professional': 'professional', 'Enterprise': 'enterprise' };
    const tier = tierMap[plan.name];
    const priceData = tier ? pricingData.prices?.[tier] : null;
    if (priceData) {
      return {
        ...plan,
        monthlyKes: priceData.monthlyKes || plan.monthlyKes,
        annualKes: priceData.annualKes || Math.round((priceData.monthlyKes || plan.monthlyKes) * 12 * 0.8),
        desc: priceData.description || plan.desc,
      };
    }
    return plan;
  }) : PLANS;

  const planPrice = (plan: typeof DEFAULT_PLANS[0]) => {
    if (plan.monthlyKes === 0) return "Custom";
    return annual ? fmt(plan.annualKes) : fmt(plan.monthlyKes);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <WebsiteNav />

      {/* Hero */}
      <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-28 overflow-hidden bg-gradient-to-b from-indigo-50/80 via-white to-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-100/60 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-6 bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Zap className="mr-1.5 h-3 w-3" /> Simple, transparent pricing
          </Badge>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6">
            Plans that grow<br />
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              with your business
            </span>
          </h1>
          <p className="text-xl text-gray-500 max-w-xl mx-auto mb-10">
            No hidden fees. No per-module charges. One price, everything included for your tier.
          </p>

          {/* Currency selector */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1 flex-wrap justify-center">
              <span className="flex items-center gap-1.5 px-3 text-xs text-gray-400"><Globe className="h-3 w-3" /> Currency:</span>
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code as CurrencyCode)}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    currency.code === c.code ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  {c.symbol} {c.code}
                </button>
              ))}
            </div>
          </div>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 rounded-full border border-gray-200 p-1.5 bg-gray-50">
            <button
              className={cn("px-5 py-2 rounded-full text-sm font-medium transition-all", !annual ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-900")}
              onClick={() => setAnnual(false)}
            >
              Monthly
            </button>
            <button
              className={cn("px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2", annual ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-900")}
              onClick={() => setAnnual(true)}
            >
              Annual
              <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0 px-1.5 py-0">Save 20%</Badge>
            </button>
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {mergedPlans.map((plan: any) => (
              <div
                key={plan.name}
                className={cn(
                  "rounded-2xl border p-8 flex flex-col hover:shadow-xl transition-all duration-300 hover:-translate-y-1",
                  plan.highlight
                    ? "border-indigo-400 bg-gradient-to-b from-indigo-50 to-white shadow-lg shadow-indigo-100 relative"
                    : "border-gray-200 bg-white",
                )}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-indigo-600 text-white border-0 px-3 py-1 text-xs shadow-lg">{plan.badge}</Badge>
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-black">{planPrice(plan)}</span>
                  {plan.monthlyKes !== 0 && <span className="text-gray-400 text-sm">/mo</span>}
                </div>
                {annual && plan.monthlyKes !== 0 && (
                  <p className="text-xs text-emerald-600 mb-3">Billed annually — save 20%</p>
                )}
                <p className="text-sm text-gray-500 mb-6">{plan.desc}</p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2.5 text-sm">
                      {f.included
                        ? <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        : <X className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />}
                      <span className={f.included ? "text-gray-600" : "text-gray-400"}>{f.text}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={cn(
                    "w-full",
                    plan.highlight
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                      : "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700",
                  )}
                  onClick={() => navigate(plan.ctaLink || plan.link)}
                >
                  {plan.cta} {plan.cta !== "Contact Sales" && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-20 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-3">Full comparison</h2>
            <p className="text-gray-500">Everything, side by side.</p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-4 font-semibold text-gray-500 w-1/2">Feature</th>
                  <th className="p-4 font-bold text-center">Starter</th>
                  <th className="p-4 font-bold text-center text-indigo-600">Professional</th>
                  <th className="p-4 font-bold text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) =>
                  "category" in row ? (
                    <tr key={row.category} className="bg-gray-50/80 border-b border-gray-100">
                      <td colSpan={4} className="px-4 py-2 text-xs uppercase tracking-widest font-bold text-indigo-600">
                        {row.category}
                      </td>
                    </tr>
                  ) : (
                    <tr key={row.label} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-gray-600">{row.label}</td>
                      <td className="p-4 text-center"><Cell value={row.starter} /></td>
                      <td className="p-4 text-center bg-indigo-50/30"><Cell value={row.pro} /></td>
                      <td className="p-4 text-center"><Cell value={row.ent} /></td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 border-t border-gray-100 bg-gray-50/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-center mb-10">Pricing FAQ</h2>
          <div className="space-y-6">
            {faqItems.map((item: any) => (
              <div key={item.q} className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow">
                <h4 className="font-semibold mb-2">{item.q}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-b from-white to-indigo-50/50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-black mb-5">Not sure which plan?</h2>
          <p className="text-gray-500 mb-8 text-lg">Talk to us — we will help you choose the right fit.</p>
          <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-6 text-lg shadow-lg shadow-indigo-200" onClick={() => navigate("/contact")}>
            Talk to Sales <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
}
