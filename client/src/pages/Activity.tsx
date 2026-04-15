import React, { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Activity, ArrowRight } from "lucide-react";

const ENTITY_TABS = [
  { key: "", label: "All" },
  { key: "invoice", label: "Invoices" },
  { key: "payment", label: "Payments" },
  { key: "client", label: "Clients" },
  { key: "project", label: "Projects" },
  { key: "expense", label: "Expenses" },
  { key: "employee", label: "Employees" },
  { key: "task", label: "Tasks" },
];

const ENTITY_COLORS: Record<string, string> = {
  invoice: "#3b82f6",
  payment: "#22c55e",
  expense: "#f59e0b",
  client: "#a855f7",
  project: "#06b6d4",
  employee: "#ec4899",
  task: "#f97316",
  projectTask: "#f97316",
  leave: "#8b5cf6",
  payroll: "#10b981",
};

const ACTION_ICONS: Record<string, string> = {
  created: "➕",
  create: "➕",
  updated: "✏️",
  update: "✏️",
  deleted: "🗑️",
  delete: "🗑️",
  approved: "✅",
  rejected: "❌",
  exported: "📥",
  login: "🔐",
  logout: "🚪",
  payment_recorded: "💰",
  paid: "💰",
  sent: "📤",
  completed: "🏁",
  viewed: "👁️",
};

function getActionIcon(action: string): string {
  const key = Object.keys(ACTION_ICONS).find((k) => action.toLowerCase().includes(k));
  return key ? ACTION_ICONS[key] : "📌";
}

function timeAgo(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return "—";
  const date = new Date(dateVal as string);
  if (isNaN(date.getTime())) return "—";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString("en", { day: "numeric", month: "short" });
}

function entityHref(entityType: string, entityId: string): string {
  const map: Record<string, string> = {
    invoice: "/invoices",
    payment: "/payments",
    expense: "/expenses",
    client: "/clients",
    project: "/projects",
    employee: "/employees",
    leave: "/leave-management",
    payroll: "/payroll",
  };
  const base = map[entityType] || "";
  return base && entityId ? `${base}/${entityId}` : base || "#";
}

export default function ActivityPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("");

  const { data, isLoading } = trpc.activityTrail.list.useQuery({
    limit: 100,
    entityType: activeTab || undefined,
  });

  const activities = Array.isArray(data) ? data : (data as any)?.activities || [];

  return (
    <ModuleLayout
      title="Activity"
      description="System-wide activity timeline and event log"
      icon={<Activity className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Activity" },
      ]}
    >
      <div className="space-y-4">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {ENTITY_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Recent Activity
              {activities.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {activities.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <Skeleton className="h-3 w-1/3 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">No activities found</p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-1">
                  {activities.map((activity: any, idx: number) => {
                    const color = ENTITY_COLORS[activity.entityType] || "#6b7280";
                    const icon = getActionIcon(activity.action || "");
                    const href = entityHref(activity.entityType, activity.entityId);
                    return (
                      <div
                        key={activity.id || idx}
                        className="relative flex gap-3 pl-9 pr-2 py-3 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        {/* Icon circle */}
                        <div
                          className="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-background text-base shrink-0"
                          style={{ background: `${color}22` }}
                        >
                          {icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {activity.description || `${activity.action} ${activity.entityType}`}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {activity.userName && (
                                  <span className="text-xs text-muted-foreground">{activity.userName}</span>
                                )}
                                <Badge
                                  className="text-[10px] px-1.5 py-0 capitalize"
                                  style={{ background: `${color}22`, color, border: "none" }}
                                >
                                  {activity.entityType}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                                  {activity.action?.replace(/_/g, " ")}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {timeAgo(activity.timestamp || activity.createdAt)}
                              </span>
                              {href !== "#" && (
                                <button
                                  onClick={() => setLocation(href)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                                  title="Go to record"
                                >
                                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
