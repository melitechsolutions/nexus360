import React, { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  FileText,
  Briefcase,
  CheckSquare,
} from "lucide-react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type CalendarEvent = {
  id: string;
  type: "invoice" | "project" | "task";
  title: string;
  date: string;
  status: string;
  href: string;
  color: string;
};

function EventTypeIcon({ type }: { type: CalendarEvent["type"] }) {
  if (type === "invoice") return <FileText className="h-3 w-3 shrink-0" />;
  if (type === "project") return <Briefcase className="h-3 w-3 shrink-0" />;
  return <CheckSquare className="h-3 w-3 shrink-0" />;
}

export default function CalendarPage() {
  const [, setLocation] = useLocation();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  );

  const { data, isLoading } = trpc.dashboard.getCalendarEvents.useQuery(
    { year, month },
    { staleTime: 60_000 }
  );

  const events: CalendarEvent[] = (data?.events ?? []) as CalendarEvent[];

  const eventsByDate: Record<string, CalendarEvent[]> = {};
  events.forEach((ev) => {
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
    eventsByDate[ev.date].push(ev);
  });

  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const selectedEvents = selectedDay ? (eventsByDate[selectedDay] ?? []) : [];

  return (
    <ModuleLayout
      title="Calendar"
      description="Invoice deadlines, project milestones, and task due dates"
      icon={<CalendarIcon className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Calendar" },
      ]}
    >
      <div className="space-y-6">
        {/* Header actions */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            {[
              { color: "#3b82f6", label: "Invoice due" },
              { color: "#a855f7", label: "Project deadline" },
              { color: "#f97316", label: "Task due" },
              { color: "#22c55e", label: "Completed / Paid" },
              { color: "#ef4444", label: "Overdue / Urgent" },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full inline-block" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setYear(today.getFullYear());
              setMonth(today.getMonth() + 1);
              setSelectedDay(todayStr);
            }}
          >
            Today
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Calendar grid */}
          <Card className="xl:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">
                  {MONTH_NAMES[month - 1]} {year}
                </CardTitle>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              {/* Day cells */}
              {isLoading ? (
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-px">
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const dayEvents = eventsByDate[dateStr] ?? [];
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDay;

                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSelectedDay(dateStr === selectedDay ? null : dateStr)}
                        className={`relative min-h-[72px] p-1.5 rounded text-left transition-colors border ${
                          isSelected
                            ? "bg-primary/10 border-primary/30 ring-1 ring-primary/30"
                            : isToday
                            ? "bg-muted border-border ring-1 ring-border"
                            : "border-transparent hover:bg-muted/50 hover:border-border"
                        }`}
                      >
                        <span
                          className={`text-xs font-medium ${
                            isToday
                              ? "text-primary font-bold"
                              : isSelected
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {day}
                        </span>
                        <div className="mt-0.5 space-y-0.5">
                          {dayEvents.slice(0, 3).map((ev) => (
                            <div
                              key={ev.id}
                              className="flex items-center gap-0.5 px-0.5 py-px rounded text-[10px] leading-tight truncate"
                              style={{ background: `${ev.color}22`, color: ev.color }}
                            >
                              <EventTypeIcon type={ev.type} />
                              <span className="truncate">{ev.title}</span>
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-muted-foreground px-0.5">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Day detail panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                {selectedDay
                  ? new Date(selectedDay + "T00:00:00").toLocaleDateString("en", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  : "Select a day"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDay ? (
                <p className="text-muted-foreground text-sm text-center py-8">Click a day to see events</p>
              ) : selectedEvents.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No events on this day</p>
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => setLocation(ev.href)}
                      className="w-full text-left rounded-lg p-3 hover:bg-muted transition-colors border border-border group"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-0.5 h-2 w-2 rounded-full shrink-0"
                          style={{ background: ev.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                            {ev.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              className="text-[10px] capitalize px-1.5 py-0"
                              style={{ background: `${ev.color}22`, color: ev.color, border: "none" }}
                            >
                              {ev.type}
                            </Badge>
                            <span className="text-[10px] capitalize text-muted-foreground">
                              {ev.status.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Month summary */}
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">Month Summary</p>
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-5 rounded" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[
                      { type: "invoice" as const, label: "Invoice deadlines", color: "#3b82f6" },
                      { type: "project" as const, label: "Project milestones", color: "#a855f7" },
                      { type: "task" as const, label: "Tasks due", color: "#f97316" },
                    ].map(({ type, label, color }) => {
                      const count = events.filter((e) => e.type === type).length;
                      return (
                        <div key={type} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                            {label}
                          </span>
                          <span className="font-medium">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
