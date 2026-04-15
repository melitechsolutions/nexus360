import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WebsiteNav } from "./WebsiteNav";
import { WebsiteFooter } from "./WebsiteFooter";
import { ArrowRight, Zap, Shield, Users, Globe, Sparkles, Target, Heart, Lightbulb, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

const ICON_MAP: Record<string, any> = { Shield, Lightbulb, Heart, Globe, Sparkles, Target, Award, Users, Zap };

const DEFAULT_VALUES = [
  {
    icon: Shield,
    title: "Reliability",
    desc: "We build platforms that teams depend on every day. Uptime, data integrity, and consistency are non-negotiable.",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: Lightbulb,
    title: "Simplicity",
    desc: "Powerful does not have to mean complex. We design for clarity so your team can get work done without training manuals.",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Heart,
    title: "Customer-first",
    desc: "Every feature we build is driven by real customer feedback. Your business problems shape our product roadmap.",
    color: "from-rose-500 to-red-600",
  },
  {
    icon: Globe,
    title: "Global perspective, local roots",
    desc: "Built with African markets in mind — M-Pesa, KRA, Kenyan payroll — but designed for businesses worldwide.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: Sparkles,
    title: "Innovation",
    desc: "We are not content with the status quo. AI, automation, and continuous improvement are built into how we work.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Target,
    title: "Accountability",
    desc: "We own our results. If something is broken, we fix it. If something can be better, we improve it. No excuses.",
    color: "from-cyan-500 to-blue-600",
  },
];

const DEFAULT_TEAM = [
  { name: "Dr. Jane Mwangi",  role: "Chief Executive Officer",      bio: "15 years of enterprise software leadership across East Africa. Previously Director of Digital Transformation at a pan-African financial group." },
  { name: "Kevin Odhiambo",   role: "Chief Technology Officer",     bio: "Full-stack architect with a track record of scaling SaaS platforms. Open-source contributor and systems design expert." },
  { name: "Amelia Njoroge",   role: "Head of Product",              bio: "Product strategist who has launched B2B products used by 200+ enterprises. Advocates for user-centric design at every layer." },
  { name: "Samuel Otieno",    role: "Head of Customer Success",     bio: "Oversees onboarding, support, and retention. Ensures every Nexus360 customer gets maximum value from day one." },
];

const DEFAULT_MILESTONES = [
  { year: "2022", event: "Nexus360 founded with a mission to unify African business software." },
  { year: "2023", event: "Core platform shipped — CRM, Finance, and HR modules go live." },
  { year: "2024", event: "Procurement, Projects, AI Hub, and M-Pesa integration launched." },
  { year: "2025", event: "Multi-tenant architecture released, enabling group-wide deployments." },
  { year: "2026", event: "18-module platform with 99.9% uptime SLA and enterprise contracts." },
];

export default function About() {
  const [, navigate] = useLocation();
  const { data: dbContent } = trpc.websiteAdmin.publicAboutContent.useQuery(undefined, { retry: false, staleTime: 300000 });

  const heroTitle = dbContent?.heroTitle || "Built to put businesses back in control";
  const heroSubtitle = dbContent?.heroSubtitle || "We started Nexus360 because we were tired of watching great businesses struggle with fragmented tools that never spoke to each other. One invoice in one system. Payroll in another. HR somewhere else. Reports nowhere. We built the platform we wished existed.";
  const missionText = dbContent?.missionText || "We believe business software should work for the people running businesses, not the other way around. Nexus360 is designed to eliminate silos, automate repetitive work, and give leadership real-time visibility into every function — finance, people, operations, and customers — from a single window.";
  const stats = dbContent?.stats?.length ? dbContent.stats : [
    { label: "Organizations powered", value: "200+" },
    { label: "Users on platform",     value: "5,000+" },
    { label: "Uptime SLA",             value: "99.9%" },
    { label: "Modules integrated",     value: "18" },
  ];
  const values = dbContent?.values?.length ? dbContent.values.map((v: any) => ({ ...v, icon: ICON_MAP[v.icon] || Shield })) : DEFAULT_VALUES;
  const milestones = dbContent?.milestones?.length ? dbContent.milestones : DEFAULT_MILESTONES;
  const team = dbContent?.team?.length ? dbContent.team : DEFAULT_TEAM;

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <WebsiteNav />

      {/* Hero */}
      <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-28 overflow-hidden bg-gradient-to-b from-indigo-50/80 via-white to-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-100/60 rounded-full blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-6 bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Zap className="mr-1.5 h-3 w-3" /> Our story
          </Badge>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6 leading-none">
            {heroTitle}
          </h1>
          <p className="text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">
            {heroSubtitle}
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs uppercase tracking-widest text-indigo-600 font-semibold mb-4">Our mission</p>
              <h2 className="text-4xl font-black mb-6 leading-tight">
                Give every business one hub. Total control.
              </h2>
              <p className="text-gray-500 leading-relaxed mb-6">
                {missionText}
              </p>
              <p className="text-gray-500 leading-relaxed">
                We serve businesses across Africa and beyond, with particular depth in Kenya's financial and compliance ecosystem — from M-Pesa to KRA to Kenyan payroll statutes.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((s: any) => (
                <div key={s.label} className="rounded-2xl border border-gray-200 bg-gray-50/50 p-6 text-center hover:shadow-md transition-shadow">
                  <p className="text-4xl font-black text-indigo-600 mb-1">{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 border-t border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-indigo-600 font-semibold mb-3">What we stand for</p>
            <h2 className="text-4xl md:text-5xl font-black">Our values</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="rounded-2xl border border-gray-200 bg-white p-7 hover:shadow-lg hover:border-indigo-300 transition-all">
                  <div className={cn("inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br mb-5", v.color)}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{v.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-indigo-600 font-semibold mb-3">Our journey</p>
            <h2 className="text-4xl font-black">From idea to platform</h2>
          </div>
          <div className="space-y-0">
            {milestones.map((m: any, i: number) => (
              <div key={m.year} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-indigo-500 bg-indigo-100 text-sm font-bold text-indigo-600">
                    {m.year.slice(2)}
                  </div>
                  {i < milestones.length - 1 && <div className="w-px flex-1 bg-gray-200 my-2" />}
                </div>
                <div className={cn("pb-8", i === milestones.length - 1 && "pb-0")}>
                  <p className="text-xs text-indigo-600 font-semibold mb-1">{m.year}</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{m.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 border-t border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-indigo-600 font-semibold mb-3">The people</p>
            <h2 className="text-4xl md:text-5xl font-black">Leadership team</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member: any) => (
              <div key={member.name} className="rounded-2xl border border-gray-200 bg-white p-7 hover:shadow-lg hover:border-indigo-300 transition-all">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-5">
                  <span className="text-xl font-black text-white">{member.name.charAt(0)}</span>
                </div>
                <h3 className="font-bold text-base mb-0.5">{member.name}</h3>
                <p className="text-xs text-indigo-600 mb-3">{member.role}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-b from-white to-indigo-50/50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-black mb-5">Ready to work with us?</h2>
          <p className="text-gray-500 mb-8 text-lg">Let's talk about how Nexus360 can transform your operations.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 shadow-lg shadow-indigo-200" onClick={() => navigate("/contact")}>
              Get in Touch <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-300 px-8 py-6" onClick={() => navigate("/features")}>
              Explore the Platform
            </Button>
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
}
