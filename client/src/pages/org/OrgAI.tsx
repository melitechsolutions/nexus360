import React from "react";
import { useParams, useLocation } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Lock, Sparkles, Brain, FileSearch, Zap, Bot, Star, ExternalLink } from "lucide-react";

const AI_FEATURES = [
  {
    icon: Brain,
    title: "AI Insights",
    description: "Get intelligent summaries and actionable insights from your CRM data, powered by advanced AI analysis.",
    color: "from-purple-600/20 to-purple-600/5",
    iconColor: "text-purple-400",
    href: "/crm/ai",
  },
  {
    icon: Sparkles,
    title: "Predictive Analytics",
    description: "Forecast sales trends, predict churn, and identify high-value opportunities before they arise.",
    color: "from-blue-600/20 to-blue-600/5",
    iconColor: "text-blue-400",
    href: "/crm/ai",
  },
  {
    icon: FileSearch,
    title: "Document Intelligence",
    description: "Automatically extract, classify, and analyze information from contracts, invoices, and documents.",
    color: "from-teal-600/20 to-teal-600/5",
    iconColor: "text-teal-400",
    href: "/crm/ai",
  },
  {
    icon: Zap,
    title: "Smart Automation",
    description: "Automate repetitive tasks, trigger smart workflows, and let AI handle routine operations.",
    color: "from-yellow-600/20 to-yellow-600/5",
    iconColor: "text-yellow-400",
    href: "/crm/ai",
  },
  {
    icon: Bot,
    title: "AI Assistant",
    description: "Chat with your data using natural language. Get answers, drafts, and recommendations instantly.",
    color: "from-indigo-600/20 to-indigo-600/5",
    iconColor: "text-indigo-400",
    href: "/crm/ai",
  },
  {
    icon: Star,
    title: "Smart Recommendations",
    description: "Receive AI-powered suggestions for next steps, follow-ups, pricing, and client engagement.",
    color: "from-pink-600/20 to-pink-600/5",
    iconColor: "text-pink-400",
    href: "/crm/ai",
  },
];

function AccessDenied({ slug }: { slug: string }) {
  const [, setLocation] = useLocation();
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="py-20 text-center">
        <Lock className="h-12 w-12 text-white/20 mx-auto mb-4" />
        <p className="text-white font-semibold text-lg mb-2">Access Restricted</p>
        <p className="text-white/50 text-sm mb-6">AI Hub is not enabled for your organization plan.</p>
        <Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => setLocation(`/org/${slug}/dashboard`)}>
          Back to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}

export default function OrgAI() {
  const params = useParams();
  const slug = params.slug as string;
  const [, setLocation] = useLocation();

  const { data: myOrgData } = trpc.multiTenancy.getMyOrg.useQuery(undefined, { staleTime: 300_000 });
  const featureMap = myOrgData?.featureMap ?? {};
  const accessGranted = !myOrgData || featureMap.ai_hub;

  return (
    <OrgLayout title="AI Hub">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[{ label: "AI Hub" }]} />
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => setLocation(`/org/${slug}/dashboard`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        {!accessGranted ? <AccessDenied slug={slug} /> : (
          <>
            {/* Hero */}
            <Card className="bg-gradient-to-br from-purple-900/40 to-blue-900/30 border-purple-500/20">
              <CardContent className="py-10 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-4">
                  <Sparkles className="h-8 w-8 text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">AI-Powered Intelligence</h2>
                <p className="text-white/60 max-w-lg mx-auto mb-6">
                  Supercharge your operations with advanced AI tools built directly into your CRM platform.
                </p>
                <Button className="bg-purple-600 hover:bg-purple-500 text-white" onClick={() => setLocation("/crm/ai")}>
                  <Bot className="h-4 w-4 mr-2" /> Open AI Workspace
                </Button>
              </CardContent>
            </Card>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {AI_FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title} className={`bg-gradient-to-br ${feature.color} border-white/10 hover:border-white/20 transition-colors`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                          <Icon className={`h-5 w-5 ${feature.iconColor}`} />
                        </div>
                        <CardTitle className="text-sm font-semibold text-white">{feature.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-white/60 mb-4 leading-relaxed">{feature.description}</p>
                      <Button variant="ghost" size="sm"
                        className="text-white/50 hover:text-white hover:bg-white/10 px-0 text-xs"
                        onClick={() => setLocation(feature.href)}>
                        Open in CRM <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </OrgLayout>
  );
}
