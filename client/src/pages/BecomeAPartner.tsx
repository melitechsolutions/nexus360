import React, { useState } from "react";
import { WebsiteNav } from "./website/WebsiteNav";
import { WebsiteFooter } from "./website/WebsiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Handshake, TrendingUp, Users, Zap, Globe, DollarSign, Award,
  CheckCircle, ArrowRight, Building2, Code2, Send, ChevronRight,
  BarChart3, Shield, Sparkles, HeadphonesIcon,
} from "lucide-react";

// ─── Partnership tiers ───────────────────────────────────────
const PARTNER_TIERS = [
  {
    icon: Send,
    name: "Referral Partner",
    badge: "Start here",
    badgeColor: "bg-blue-50 text-blue-700",
    borderColor: "border-blue-200 hover:border-blue-400",
    accentColor: "text-blue-600",
    desc: "Recommend Nexus360 to businesses you know. Earn a recurring commission for every client you bring.",
    commission: "Up to 15%",
    commissionLabel: "recurring commission",
    features: [
      "No upfront cost or contract",
      "Personal referral link & tracking dashboard",
      "Co-branded marketing assets",
      "Dedicated partner manager",
      "Payouts within 30 days",
    ],
    cta: "Become a Referral Partner",
  },
  {
    icon: Building2,
    name: "Reseller Partner",
    badge: "Most Popular",
    badgeColor: "bg-indigo-600 text-white",
    borderColor: "border-indigo-400 hover:border-indigo-600",
    accentColor: "text-indigo-600",
    desc: "Bundle Nexus360 under your brand. Sell, invoice, and manage client subscriptions as your own product.",
    commission: "Up to 40%",
    commissionLabel: "margin on each sale",
    features: [
      "Full white-label capability",
      "Reseller pricing (significant margin)",
      "Client onboarding & training toolkit",
      "Priority technical support",
      "Joint go-to-market campaigns",
      "Volume-based tier upgrades",
    ],
    cta: "Apply as Reseller",
    highlight: true,
  },
  {
    icon: Code2,
    name: "Technology Partner",
    badge: "API Access",
    badgeColor: "bg-violet-50 text-violet-700",
    borderColor: "border-violet-200 hover:border-violet-400",
    accentColor: "text-violet-600",
    desc: "Integrate your product with Nexus360's API. Co-sell, cross-promote, and reach thousands of businesses.",
    commission: "Custom",
    commissionLabel: "revenue share",
    features: [
      "Full API access & webhooks",
      "Marketplace listing on Nexus360",
      "Co-marketing & joint press releases",
      "Technical integration support",
      "Joint product roadmap influence",
      "Dedicated sandbox environment",
    ],
    cta: "Explore Tech Partnership",
  },
];

// ─── Benefits ────────────────────────────────────────────────
const BENEFITS = [
  { icon: DollarSign,  title: "Attractive Commissions",  desc: "Earn recurring revenue. Our partners average 3x ROI within the first year of joining." },
  { icon: TrendingUp,  title: "Fast-growing Market",     desc: "SME software adoption in Africa is growing 30% YoY. Be positioned at the forefront." },
  { icon: Shield,      title: "Proven Product",          desc: "Nexus360 powers hundreds of businesses. Sell a product your clients will actually love." },
  { icon: HeadphonesIcon, title: "Full Support",        desc: "Dedicated partner success manager, onboarding kit, and priority technical support." },
  { icon: Globe,       title: "Global Reach",            desc: "Multi-currency, multi-language. Serve clients across Africa and beyond." },
  { icon: Sparkles,    title: "Continuous Innovation",   desc: "New modules and features ship monthly. Your clients always have something new to look forward to." },
];

// ─── Stats ───────────────────────────────────────────────────
const STATS = [
  { value: "200+",  label: "Active Businesses" },
  { value: "18+",   label: "Modules" },
  { value: "30%",   label: "YoY Growth" },
  { value: "97%",   label: "Client Retention" },
];

type PartnerType = "referral" | "reseller" | "technology" | "";

interface FormState {
  name: string;
  email: string;
  company: string;
  phone: string;
  website: string;
  partnerType: PartnerType;
  message: string;
}

const INITIAL_FORM: FormState = {
  name: "", email: "", company: "", phone: "", website: "",
  partnerType: "", message: "",
};

export default function BecomeAPartner() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  const contactMutation = trpc.websiteAdmin.submitContact.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setForm(INITIAL_FORM);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit application. Please try again.");
    },
  });

  function validate(): boolean {
    const e: Partial<FormState> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email required";
    if (!form.company.trim()) e.company = "Company name is required";
    if (!form.partnerType) e.partnerType = "Select a partnership type" as any;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    contactMutation.mutate({
      name: form.name,
      email: form.email,
      company: form.company,
      phone: form.phone || undefined,
      website: form.website || undefined,
      subject: `Partner Application – ${form.partnerType}`,
      message: `[Partner Application - ${form.partnerType}]\nCompany: ${form.company}\nPhone: ${form.phone}\nWebsite: ${form.website}\n\n${form.message}`,
    });
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <WebsiteNav />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 text-white pt-28 pb-20">
        {/* Background glow effects */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-violet-600/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-40 h-[400px] w-[400px] rounded-full bg-indigo-500/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <Badge className="mb-6 bg-white/10 text-white hover:bg-white/15 border border-white/20">
            <Handshake className="mr-1.5 h-3.5 w-3.5" />
            Partner Program
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
            Grow your business<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-indigo-300">
              by partnering with us
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-indigo-200 leading-relaxed mb-10">
            Join the Nexus360 Partner Program and earn while helping businesses across Africa
            unlock their full potential with our all-in-one management platform.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="#partner-tiers">
              <Button size="lg" className="bg-white text-indigo-900 hover:bg-indigo-50 font-semibold shadow-lg">
                Choose your partnership <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <a href="#apply">
              <Button size="lg" variant="outline" className="border-white text-white bg-transparent hover:bg-white/15 hover:text-white">
                Apply now
              </Button>
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative mx-auto max-w-4xl px-6 mt-16">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 bg-white/8 backdrop-blur-sm border border-white/15 rounded-2xl px-8 py-6">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-white">{s.value}</div>
                <div className="text-sm text-indigo-300 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Partnership Tiers ─────────────────────────────────── */}
      <section id="partner-tiers" className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Choose your partnership model
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Whether you're an individual consultant or a full-service agency, there's a path for you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PARTNER_TIERS.map(tier => {
              const Icon = tier.icon;
              return (
                <div
                  key={tier.name}
                  className={cn(
                    "relative flex flex-col bg-white dark:bg-gray-800 rounded-2xl border-2 p-8 transition-all duration-200 shadow-sm hover:shadow-lg",
                    tier.borderColor,
                    tier.highlight && "ring-2 ring-indigo-500/30 scale-[1.02]"
                  )}
                >
                  {tier.badge && (
                    <span className={cn("absolute -top-3 left-6 text-xs font-semibold px-3 py-1 rounded-full", tier.badgeColor)}>
                      {tier.badge}
                    </span>
                  )}

                  <div className={cn("mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-700")}>
                    <Icon className={cn("h-6 w-6", tier.accentColor)} />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{tier.name}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">{tier.desc}</p>

                  {/* Commission highlight */}
                  <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl p-4 mb-6">
                    <div className={cn("text-3xl font-bold", tier.accentColor)}>{tier.commission}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{tier.commissionLabel}</div>
                  </div>

                  {/* Feature list */}
                  <ul className="space-y-2 mb-8 flex-1">
                    {tier.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <a href="#apply" onClick={() => setField("partnerType", tier.name.split(" ")[0].toLowerCase() as PartnerType)}>
                    <Button
                      className={cn("w-full", tier.highlight ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "")}
                      variant={tier.highlight ? "default" : "outline"}
                    >
                      {tier.cta} <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────── */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why partner with Nexus360?
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              We invest in your success. Our partners get everything they need to grow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {BENEFITS.map(b => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="group flex gap-4 p-6 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors duration-200">
                  <div className="shrink-0 flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/50 transition-colors">
                    <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{b.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How it works
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Getting started is simple. You can be earning commissions in as little as 48 hours.
            </p>
          </div>

          <div className="relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-12 right-12 h-0.5 bg-gradient-to-r from-indigo-200 via-violet-200 to-indigo-200 dark:from-indigo-800 dark:via-violet-800 dark:to-indigo-800" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { step: "01", title: "Apply", desc: "Fill out the short application form below." },
                { step: "02", title: "Onboard", desc: "Get your partner portal access and resources within 48h." },
                { step: "03", title: "Sell & Refer", desc: "Use your tools to bring in clients." },
                { step: "04", title: "Earn", desc: "Track commissions and receive monthly payouts." },
              ].map(item => (
                <div key={item.step} className="relative flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-gray-800 shadow-md border border-indigo-100 dark:border-indigo-900/40 mb-4 z-10">
                    <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{item.step}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Application Form ──────────────────────────────────── */}
      <section id="apply" className="py-20 bg-white dark:bg-gray-950">
        <div className="mx-auto max-w-2xl px-6">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950 dark:text-indigo-300">
              Apply Now
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Start your partnership journey
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Complete the form below and our team will reach out within 1 business day.
            </p>
          </div>

          {submitted ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Application received!</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8">
                Thank you for your interest. Our partner team will review your application and reach out within 1 business day.
              </p>
              <Button variant="outline" onClick={() => setSubmitted(false)}>
                Submit another application
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 border border-gray-100 dark:border-gray-800">
              {/* Full name + email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    placeholder="Jane Smith"
                    value={form.name}
                    onChange={e => setField("name", e.target.value)}
                    className={errors.name ? "border-red-400" : ""}
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Business Email <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@company.com"
                    value={form.email}
                    onChange={e => setField("email", e.target.value)}
                    className={errors.email ? "border-red-400" : ""}
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>
              </div>

              {/* Company + phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="company">Company / Organization <span className="text-red-500">*</span></Label>
                  <Input
                    id="company"
                    placeholder="Acme Ltd."
                    value={form.company}
                    onChange={e => setField("company", e.target.value)}
                    className={errors.company ? "border-red-400" : ""}
                  />
                  {errors.company && <p className="text-xs text-red-500">{errors.company}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+254 700 000 000"
                    value={form.phone}
                    onChange={e => setField("phone", e.target.value)}
                  />
                </div>
              </div>

              {/* Website */}
              <div className="space-y-1.5">
                <Label htmlFor="website">Website (optional)</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://yourcompany.com"
                  value={form.website}
                  onChange={e => setField("website", e.target.value)}
                />
              </div>

              {/* Partnership type */}
              <div className="space-y-2">
                <Label>Partnership Type <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(["referral", "reseller", "technology"] as PartnerType[]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setField("partnerType", type)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium capitalize transition-all duration-150",
                        form.partnerType === type
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                      )}
                    >
                      {type === "referral" && <Send className="h-5 w-5" />}
                      {type === "reseller" && <Building2 className="h-5 w-5" />}
                      {type === "technology" && <Code2 className="h-5 w-5" />}
                      {type}
                    </button>
                  ))}
                </div>
                {errors.partnerType && <p className="text-xs text-red-500">{errors.partnerType as string}</p>}
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <Label htmlFor="message">Tell us about your business</Label>
                <textarea
                  id="message"
                  rows={4}
                  placeholder="Briefly describe your business, target market, and why you'd like to partner with us..."
                  value={form.message}
                  onChange={e => setField("message", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={contactMutation.isPending}
              >
                {contactMutation.isPending ? "Submitting…" : (
                  <>Submit Application <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Award className="mx-auto h-12 w-12 mb-4 opacity-80" />
          <h2 className="text-3xl font-bold mb-4">Ready to start earning?</h2>
          <p className="text-indigo-200 max-w-xl mx-auto mb-8">
            Join a growing network of partners helping businesses unlock their potential with Nexus360.
          </p>
          <a href="#apply">
            <Button size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold shadow-lg">
              Apply now — it's free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
}
