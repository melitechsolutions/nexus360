import React, { useState, useMemo } from "react";
import { WebsiteNav } from "./website/WebsiteNav";
import { WebsiteFooter } from "./website/WebsiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  Calendar, Clock, Globe, CheckCircle, ArrowRight, ArrowLeft,
  Users, BarChart3, Zap, ChevronLeft, ChevronRight, Video,
  Building2, Star,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────
const TIMEZONES = [
  { label: "Nairobi (EAT)     UTC+3",  value: "Africa/Nairobi",       offset: "+03:00" },
  { label: "Lagos (WAT)       UTC+1",  value: "Africa/Lagos",         offset: "+01:00" },
  { label: "Johannesburg      UTC+2",  value: "Africa/Johannesburg",  offset: "+02:00" },
  { label: "Cairo             UTC+2",  value: "Africa/Cairo",         offset: "+02:00" },
  { label: "Accra (GMT)       UTC+0",  value: "Africa/Accra",         offset: "+00:00" },
  { label: "Casablanca        UTC+1",  value: "Africa/Casablanca",    offset: "+01:00" },
  { label: "London (GMT)      UTC+0",  value: "Europe/London",        offset: "+00:00" },
  { label: "Dubai             UTC+4",  value: "Asia/Dubai",           offset: "+04:00" },
  { label: "New York (EST)    UTC-5",  value: "America/New_York",     offset: "-05:00" },
  { label: "Los Angeles (PST) UTC-8",  value: "America/Los_Angeles",  offset: "-08:00" },
];

const DEMO_DURATIONS = [
  { label: "30 min", value: 30, desc: "Quick overview" },
  { label: "60 min", value: 60, desc: "Full walkthrough", popular: true },
  { label: "90 min", value: 90, desc: "In-depth + Q&A" },
];

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30",
];

// Days blocked from booking (0=Sun, 6=Sat)
const BLOCKED_DAYS = [0, 6];

const DEMO_FEATURES = [
  { icon: Building2,  text: "Multi-tenant setup & org management" },
  { icon: BarChart3,  text: "Live dashboards & financial reporting" },
  { icon: Users,      text: "HR, payroll & employee management" },
  { icon: Zap,        text: "Workflow automation & integrations" },
  { icon: Star,       text: "White-label & custom branding" },
  { icon: Globe,      text: "Multi-currency, KES / USD support" },
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ─── Helpers ─────────────────────────────────────────────────
function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: { date: Date | null; disabled: boolean }[] = [];
  // Padding before first day
  for (let i = 0; i < firstDay; i++) days.push({ date: null, disabled: true });
  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const isPast = date < today;
    const isWeekend = BLOCKED_DAYS.includes(date.getDay());
    days.push({ date, disabled: isPast || isWeekend });
  }
  return days;
}

function formatDateLong(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Step types ───────────────────────────────────────────────
type Step = 1 | 2 | 3;

interface BookingDetails {
  date: Date | null;
  time: string;
  timezone: string;
  duration: number;
  name: string;
  email: string;
  company: string;
  phone: string;
  teamSize: string;
  message: string;
}

const INITIAL_BOOKING: BookingDetails = {
  date: null,
  time: "",
  timezone: "Africa/Nairobi",
  duration: 60,
  name: "",
  email: "",
  company: "",
  phone: "",
  teamSize: "",
  message: "",
};

// ─── Main Component ───────────────────────────────────────────
export default function BookADemo() {
  const today = new Date();
  const [step, setStep] = useState<Step>(1);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [booking, setBooking] = useState<BookingDetails>(INITIAL_BOOKING);
  const [errors, setErrors] = useState<Partial<BookingDetails>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const bookDemoMutation = trpc.websiteAdmin.bookDemo.useMutation({
    onSuccess: () => {
      setConfirmed(true);
      setLoading(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to book demo. Please try again.");
      setLoading(false);
    },
  });

  const calendarDays = useMemo(() => buildCalendarDays(calYear, calMonth), [calYear, calMonth]);

  function setField<K extends keyof BookingDetails>(key: K, val: BookingDetails[K]) {
    setBooking(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  }

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }

  function validateStep1(): boolean {
    const e: Partial<BookingDetails> = {};
    if (!booking.date) (e as any).date = "Select a date";
    if (!booking.time) (e as any).time = "Select a time";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: Partial<BookingDetails> = {};
    if (!booking.name.trim()) e.name = "Name required" as any;
    if (!booking.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.email)) e.email = "Valid email required" as any;
    if (!booking.company.trim()) e.company = "Company required" as any;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNextStep1() {
    if (validateStep1()) setStep(2);
  }

  function handleConfirm() {
    if (!validateStep2()) return;
    if (!booking.date) return;
    setLoading(true);
    bookDemoMutation.mutate({
      name: booking.name,
      email: booking.email,
      company: booking.company || undefined,
      phone: booking.phone || undefined,
      teamSize: booking.teamSize || undefined,
      message: booking.message || undefined,
      date: booking.date.toLocaleDateString("en-GB"),
      time: booking.time,
      timezone: booking.timezone,
      duration: booking.duration,
    });
  }

  const tzLabel = TIMEZONES.find(t => t.value === booking.timezone)?.label || booking.timezone;
  const durationLabel = DEMO_DURATIONS.find(d => d.value === booking.duration)?.label || `${booking.duration} min`;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <WebsiteNav />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="pt-24 pb-12 bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Badge className="mb-5 bg-white/10 text-white border border-white/20">
            <Video className="mr-1.5 h-3.5 w-3.5" />
            Live Product Demo
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            See Nexus360 in action
          </h1>
          <p className="text-indigo-200 text-lg max-w-2xl mx-auto">
            Pick a date and time that works for you. Our team will walk you through the full platform
            tailored to your business needs.
          </p>
        </div>
      </section>

      {/* ── Main booking UI ───────────────────────────────────── */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-6xl px-6">

          {confirmed ? (
            // ── Confirmation screen ──────────────────────────
            <div className="max-w-lg mx-auto text-center py-12">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-6">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">You're all set!</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Your demo has been booked. A calendar invite and confirmation details have been sent to{" "}
                <strong className="text-gray-700 dark:text-gray-300">{booking.email}</strong>.
              </p>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 text-left space-y-3 mb-8">
                {[
                  { icon: Calendar, label: "Date", value: booking.date ? formatDateLong(booking.date) : "" },
                  { icon: Clock,    label: "Time", value: `${booking.time} (${durationLabel})` },
                  { icon: Globe,    label: "Timezone", value: tzLabel },
                  { icon: Video,    label: "Format", value: "Google Meet / Zoom — link in your email" },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3">
                    <row.icon className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span className="text-sm text-gray-500 dark:text-gray-400 w-20 shrink-0">{row.label}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{row.value}</span>
                  </div>
                ))}
              </div>

              <Button variant="outline" onClick={() => { setConfirmed(false); setStep(1); setBooking(INITIAL_BOOKING); }}>
                Book another demo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

              {/* Left sidebar — what you'll see */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 sticky top-24">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white text-sm">Nexus360 Demo</div>
                      <div className="text-xs text-gray-500">Live walkthrough</div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5">
                    A personal, live demo tailored to your industry and team size. No sales pressure — just a genuine product walkthrough.
                  </p>

                  <div className="space-y-2 mb-6">
                    {DEMO_FEATURES.map(f => (
                      <div key={f.text} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <f.icon className="h-4 w-4 text-indigo-500 shrink-0" />
                        {f.text}
                      </div>
                    ))}
                  </div>

                  {/* Booking summary */}
                  {(booking.date || booking.time) && (
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Your selection</p>
                      {booking.date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-indigo-500" />
                          <span className="text-gray-700 dark:text-gray-300">{formatDateShort(booking.date)}</span>
                        </div>
                      )}
                      {booking.time && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-indigo-500" />
                          <span className="text-gray-700 dark:text-gray-300">{booking.time} — {durationLabel}</span>
                        </div>
                      )}
                      {booking.timezone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="h-4 w-4 text-indigo-500" />
                          <span className="text-gray-700 dark:text-gray-300 text-xs">{tzLabel}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right — booking form */}
              <div className="lg:col-span-2">
                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-8">
                  {([1, 2, 3] as Step[]).map(s => (
                    <React.Fragment key={s}>
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                          step === s
                            ? "bg-indigo-600 text-white"
                            : step > s
                              ? "bg-green-500 text-white"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                        )}
                      >
                        {step > s ? <CheckCircle className="h-4 w-4" /> : s}
                      </div>
                      {s < 3 && (
                        <div className={cn(
                          "flex-1 h-0.5 rounded transition-colors",
                          step > s ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"
                        )} />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* ── Step 1: Date & Time ── */}
                {step === 1 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Pick a date & time</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">All times shown in your selected timezone. Weekends unavailable.</p>

                    {/* Timezone + Duration pickers */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Timezone</Label>
                        <select
                          value={booking.timezone}
                          onChange={e => setField("timezone", e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {TIMEZONES.map(tz => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Duration</Label>
                        <div className="flex gap-2">
                          {DEMO_DURATIONS.map(d => (
                            <button
                              key={d.value}
                              type="button"
                              onClick={() => setField("duration", d.value)}
                              className={cn(
                                "flex-1 rounded-lg border-2 px-3 py-2 text-sm transition-all",
                                booking.duration === d.value
                                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium"
                                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                              )}
                            >
                              <div className="font-semibold">{d.label}</div>
                              <div className="text-xs opacity-70">{d.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Calendar */}
                    <div className="mb-6">
                      {/* Month navigation */}
                      <div className="flex items-center justify-between mb-4">
                        <button
                          type="button"
                          onClick={prevMonth}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {MONTHS[calMonth]} {calYear}
                        </span>
                        <button
                          type="button"
                          onClick={nextMonth}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>

                      {/* Day-of-week headers */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAYS_OF_WEEK.map(d => (
                          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                        ))}
                      </div>

                      {/* Days grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, idx) => {
                          if (!day.date) return <div key={`pad-${idx}`} />;
                          const isSelected = booking.date?.toDateString() === day.date.toDateString();
                          const isToday = day.date.toDateString() === today.toDateString();
                          return (
                            <button
                              key={day.date.toISOString()}
                              type="button"
                              disabled={day.disabled}
                              onClick={() => setField("date", day.date!)}
                              className={cn(
                                "h-9 w-full rounded-lg text-sm transition-all duration-150 font-medium",
                                isSelected
                                  ? "bg-indigo-600 text-white shadow-md"
                                  : day.disabled
                                    ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                    : isToday
                                      ? "text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              )}
                            >
                              {day.date.getDate()}
                            </button>
                          );
                        })}
                      </div>
                      {(errors as any).date && (
                        <p className="text-xs text-red-500 mt-2">{(errors as any).date}</p>
                      )}
                    </div>

                    {/* Time slots */}
                    {booking.date && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          Available times — {formatDateShort(booking.date)}
                        </p>
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                          {TIME_SLOTS.map(slot => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setField("time", slot)}
                              className={cn(
                                "rounded-lg border-2 py-2 text-sm font-medium transition-all duration-150",
                                booking.time === slot
                                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 hover:bg-indigo-50/50"
                              )}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                        {(errors as any).time && (
                          <p className="text-xs text-red-500 mt-2">{(errors as any).time}</p>
                        )}
                      </div>
                    )}

                    <div className="mt-8 flex justify-end">
                      <Button onClick={handleNextStep1} className="bg-indigo-600 hover:bg-indigo-700">
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Step 2: Your Details ── */}
                {step === 2 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Your details</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">We'll use this to send your confirmation and calendar invite.</p>

                    <div className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                          <Input
                            id="name"
                            placeholder="Jane Smith"
                            value={booking.name}
                            onChange={e => setField("name", e.target.value)}
                            className={(errors as any).name ? "border-red-400" : ""}
                          />
                          {(errors as any).name && <p className="text-xs text-red-500">{(errors as any).name}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="email">Work Email <span className="text-red-500">*</span></Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="jane@company.com"
                            value={booking.email}
                            onChange={e => setField("email", e.target.value)}
                            className={(errors as any).email ? "border-red-400" : ""}
                          />
                          {(errors as any).email && <p className="text-xs text-red-500">{(errors as any).email}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="company">Company / Organization <span className="text-red-500">*</span></Label>
                          <Input
                            id="company"
                            placeholder="Acme Ltd."
                            value={booking.company}
                            onChange={e => setField("company", e.target.value)}
                            className={(errors as any).company ? "border-red-400" : ""}
                          />
                          {(errors as any).company && <p className="text-xs text-red-500">{(errors as any).company}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+254 700 000 000"
                            value={booking.phone}
                            onChange={e => setField("phone", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="teamSize">Team size</Label>
                        <select
                          id="teamSize"
                          value={booking.teamSize}
                          onChange={e => setField("teamSize", e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select team size</option>
                          <option value="1-5">1–5 people</option>
                          <option value="6-15">6–15 people</option>
                          <option value="16-50">16–50 people</option>
                          <option value="51-200">51–200 people</option>
                          <option value="200+">200+ people</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="msg">Anything specific you'd like to see?</Label>
                        <textarea
                          id="msg"
                          rows={3}
                          placeholder="e.g. payroll processing, multi-tenant setup, invoicing workflow..."
                          value={booking.message}
                          onChange={e => setField("message", e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                      </div>
                    </div>

                    <div className="mt-8 flex justify-between">
                      <Button variant="outline" onClick={() => setStep(1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button onClick={() => { if (validateStep2()) setStep(3); }} className="bg-indigo-600 hover:bg-indigo-700">
                        Review booking <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Step 3: Review & Confirm ── */}
                {step === 3 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Review & confirm</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Please review the details below before confirming.</p>

                    <div className="space-y-4 mb-8">
                      {/* Date & Time */}
                      <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl p-5 border border-indigo-100 dark:border-indigo-900/40">
                        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-3">Demo Details</p>
                        <div className="space-y-2.5">
                          {[
                            { icon: Calendar, label: "Date",     value: booking.date ? formatDateLong(booking.date) : "" },
                            { icon: Clock,    label: "Time",     value: `${booking.time} (${durationLabel})` },
                            { icon: Globe,    label: "Timezone", value: tzLabel },
                            { icon: Video,    label: "Format",   value: "Google Meet — link will be emailed to you" },
                          ].map(row => (
                            <div key={row.label} className="flex items-center gap-3 text-sm">
                              <row.icon className="h-4 w-4 text-indigo-500 shrink-0" />
                              <span className="text-gray-500 dark:text-gray-400 w-20 shrink-0">{row.label}</span>
                              <span className="font-medium text-gray-900 dark:text-white">{row.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Personal details */}
                      <div className="bg-gray-50 dark:bg-gray-900/60 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Details</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {[
                            ["Name",    booking.name],
                            ["Email",   booking.email],
                            ["Company", booking.company],
                            ["Phone",   booking.phone || "—"],
                            ["Team",    booking.teamSize || "—"],
                          ].map(([label, val]) => (
                            <div key={label}>
                              <span className="text-gray-400 dark:text-gray-500">{label}: </span>
                              <span className="font-medium text-gray-900 dark:text-white">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setStep(2)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 min-w-[160px]"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            Booking…
                          </span>
                        ) : (
                          <><CheckCircle className="mr-2 h-4 w-4" />Confirm demo</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
}
