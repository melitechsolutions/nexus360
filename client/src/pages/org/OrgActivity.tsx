import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import {
  Activity,
  FileText,
  DollarSign,
  Receipt,
  Briefcase,
  Users,
  CheckSquare,
  ArrowRight,
} from "lucide-react";

type EntityType = "all" | "invoice" | "payment" | "expense" | "project" | "client" | "task" | "projectTask";

const ENTITY_TABS: Array<{ id: EntityType; label: string; icon: React.ElementType }> = [
  { id: "all", label: "All", icon: Activity },
  { id: "invoice", label: "Invoices", icon: FileText },
  { id: "payment", label: "Payments", icon: DollarSign },
  { id: "expense", label: "Expenses", icon: Receipt },
  { id: "project", label: "Projects", icon: Briefcase },
  { id: "client", label: "Clients", icon: Users },
  { id: "task", label: "Tasks", icon: CheckSquare },
];

const ENTITY_COLORS: Record<string, string> = {
  invoice: "#3b82f6",
  payment: "#22c55e",
  expense: "#f59e0b",
  project: "#06b6d4",
  client: "#a855f7",
  task: "#f97316",
  projectTask: "#f97316",
  employee: "#ec4899",
  leave: "#8b5cf6",
  payroll: "#10b981",
};

const ACTION_ICONS: Record<string, string> = {
  create: "➕",
  created: "➕",
  update: "✏️",
  updated: "✏️",
  delete: "🗑️",
  deleted: "🗑️",
  paid: "💰",
  payment_recorded: "💰",
  sent: "📤",
  approved: "✅",
  rejected: "❌",
  completed: "🏁",
  exported: "📥",
  login: "🔐",
  logout: "🚪",
  viewed: "👁️",
};

function getActionIcon(action: string): string {
  const key = Object.keys(ACTION_ICONS).find((k) => action.toLowerCase().includes(k));
  return key ? ACTION_ICONS[key] : "📌";
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en", { day: "numeric", month: "short", year: "2-digit" });
}

function entityHref(slug: string, entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  const t = entityType.toLowerCase();
  if (t.includes("invoice")) return `/org/${slug}/invoices/${entityId}`;
  if (t.includes("project")) return `/org/${slug}/projects/${entityId}`;
  if (t.includes("client")) return `/org/${slug}/clients/${entityId}`;
  if (t.includes("expense")) return `/org/${slug}/expenses`;
  if (t.includes("payment")) return `/org/${slug}/payments`;
  return null;
}

export default function OrgActivity() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<EntityType>("all");

  const { data, isLoading, refetch } = trpc.multiTenancy.getOrgActivity.useQuery(
    {
      limit: 100,
      entityType: activeTab === "all" ? undefined : activeTab,
    },
    { staleTime: 30_000 }
  );

  const activities = data?.activities ?? [];

  return (
    <OrgLayout title="Activity" showOrgInfo={false}>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <OrgBreadcrumb slug={slug} items={[{ label: "Activity" }]} />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Activity Timeline</h1>
            <p className="text-white/50 text-sm mt-0.5">All recent actions across your organization</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {ENTITY_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Timeline */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" />
              {activities.length} {activeTab === "all" ? "" : activeTab + " "}
              {activities.length === 1 ? "entry" : "entries"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full bg-white/5 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 bg-white/5 rounded w-3/4" />
                      <Skeleton className="h-3 bg-white/5 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="py-16 text-center">
                <Activity className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No activity recorded yet</p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical bar */}
                <div className="absolute left-10 top-0 bottom-0 w-px bg-white/5" />

                <div className="divide-y divide-white/5">
                  {activities.map((act: any) => {
                    const entityColor =
                      ENTITY_COLORS[act.entityType?.toLowerCase() ?? ""] ?? "#6b7280";
                    const href = entityHref(slug ?? "", act.entityType, act.entityId);

                    return (
                      <div key={act.id} className="flex gap-4 px-4 py-4 hover:bg-white/5 transition-colors group">
                        {/* Icon bubble */}
                        <div
                          className="relative z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-base"
                          style={{ background: `${entityColor}22`, border: `1px solid ${entityColor}44` }}
                        >
                          {getActionIcon(act.action)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white/90 truncate">
                                {act.description || act.action}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs text-white/40">{act.userName}</span>
                                {act.entityType && (
                                  <Badge
                                    className="text-[10px] capitalize px-1.5 py-0"
                                    style={{
                                      background: `${entityColor}22`,
                                      color: entityColor,
                                      border: "none",
                                    }}
                                  >
                                    {act.entityType.replace(/([A-Z])/g, " $1").trim()}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-white/30 shrink-0 whitespace-nowrap">
                              {timeAgo(act.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Navigate link */}
                        {href && (
                          <button
                            onClick={() => setLocation(href)}
                            className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ArrowRight className="h-4 w-4 text-white/40 hover:text-white" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </OrgLayout>
  );
}
