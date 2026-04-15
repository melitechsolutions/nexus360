/**
 * WebsiteMocks.tsx
 * Pure CSS/Tailwind mock screenshot components that simulate the Nexus360 UI.
 * Used on the marketing website to show the product without real screenshots.
 */
import React from "react";
import { cn } from "@/lib/utils";
import {
  Zap, Home, Users, DollarSign, Briefcase, BarChart3, Settings,
  Bell, Search, ChevronDown, ArrowUpRight, ArrowDownRight,
  TrendingUp, Package, UserCog, Calendar, CheckCircle2,
} from "lucide-react";

// ── Shared pieces ──────────────────────────────────────────────────────────

function MockBrowser({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-white/15 bg-[#0d0d1a] overflow-hidden shadow-2xl shadow-black/60", className)}>
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-3 py-2 bg-black/40 border-b border-white/8">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
        </div>
        <div className="flex-1 mx-2 rounded bg-white/8 h-4 flex items-center px-2">
          <span className="text-[9px] text-white/30 font-mono">https://app.nexus360.app</span>
        </div>
        <div className="flex gap-1">
          <div className="h-3 w-3 rounded-sm bg-white/10" />
          <div className="h-3 w-3 rounded-sm bg-white/10" />
        </div>
      </div>
      {children}
    </div>
  );
}

function AppTopbar() {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#07070f] border-b border-white/8">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600">
          <Zap className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-bold text-white">Nexus<span className="text-indigo-400">360</span></span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-md bg-white/8 px-2.5 py-1">
          <Search className="h-2.5 w-2.5 text-white/40" />
          <span className="text-[9px] text-white/30">Search…</span>
        </div>
        <Bell className="h-3.5 w-3.5 text-white/40" />
        <div className="h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center">
          <span className="text-[8px] font-bold text-white">JM</span>
        </div>
      </div>
    </div>
  );
}

function AppSidebar({ active = 0 }: { active?: number }) {
  const items = [
    { icon: Home,      label: "Dashboard" },
    { icon: Users,     label: "CRM" },
    { icon: DollarSign,label: "Finance" },
    { icon: UserCog,   label: "HR" },
    { icon: Briefcase, label: "Projects" },
    { icon: BarChart3, label: "Reports" },
    { icon: Settings,  label: "Settings" },
  ];
  return (
    <div className="w-28 shrink-0 bg-[#07070f] border-r border-white/8 py-2 flex flex-col gap-0.5">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-1.5 mx-1.5 px-2 py-1.5 rounded-md text-[9px] font-medium",
              i === active
                ? "bg-indigo-600/25 text-indigo-300"
                : "text-white/35 hover:text-white/60",
            )}
          >
            <Icon className="h-2.5 w-2.5 shrink-0" />
            <span>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── MOCK 1: Dashboard Overview ─────────────────────────────────────────────

export function MockDashboardScreenshot({ className }: { className?: string }) {
  const bars = [55, 72, 48, 88, 63, 91, 74];
  const areaPoints = "0,70 16,55 32,60 48,35 64,45 80,20 96,30 100,28 100,100 0,100";

  return (
    <MockBrowser className={className}>
      <AppTopbar />
      <div className="flex" style={{ height: 320 }}>
        <AppSidebar active={0} />
        <div className="flex-1 p-3 overflow-hidden">
          {/* Page title */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[11px] font-bold text-white">Executive Dashboard</h3>
              <p className="text-[9px] text-white/40">March 2026 · Acme Group</p>
            </div>
            <div className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[9px] text-emerald-400 font-medium">Live</span>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { label: "Revenue",  value: "KSh 8.2M", change: "+14.2%", up: true,  color: "text-emerald-400" },
              { label: "Clients",  value: "2,847",     change: "+5.1%",  up: true,  color: "text-blue-400" },
              { label: "Payroll",  value: "KSh 3.1M",  change: "-2.3%",  up: false, color: "text-violet-400" },
              { label: "Projects", value: "38 active",  change: "+8",     up: true,  color: "text-amber-400" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg border border-white/8 bg-white/3 p-2">
                <p className="text-[8px] text-white/40 mb-0.5">{kpi.label}</p>
                <p className={cn("text-[10px] font-bold", kpi.color)}>{kpi.value}</p>
                <div className={cn("flex items-center gap-0.5 mt-0.5", kpi.up ? "text-emerald-400" : "text-red-400")}>
                  {kpi.up ? <ArrowUpRight className="h-2 w-2" /> : <ArrowDownRight className="h-2 w-2" />}
                  <span className="text-[8px]">{kpi.change}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-3 gap-2">
            {/* Bar chart */}
            <div className="col-span-2 rounded-lg border border-white/8 bg-white/3 p-3">
              <p className="text-[9px] font-medium text-white/60 mb-2">Monthly Revenue (KSh)</p>
              <div className="flex items-end gap-1 h-14">
                {bars.map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full rounded-t-sm"
                      style={{ height: `${h}%`, background: i === 6 ? "linear-gradient(to top, #6366f1, #8b5cf6)" : "rgba(99,102,241,0.3)" }}
                    />
                    <span className="text-[7px] text-white/25">{["Sep","Oct","Nov","Dec","Jan","Feb","Mar"][i]}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Donut mock */}
            <div className="rounded-lg border border-white/8 bg-white/3 p-3">
              <p className="text-[9px] font-medium text-white/60 mb-2">By Module</p>
              <div className="flex justify-center mb-1">
                <svg width="56" height="56" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#6366f1" strokeWidth="6" strokeDasharray="44 44" strokeDashoffset="0" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="6" strokeDasharray="22 66" strokeDashoffset="-44" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="6" strokeDasharray="16 72" strokeDashoffset="-66" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#8b5cf6" strokeWidth="6" strokeDasharray="6 82" strokeDashoffset="-82" />
                </svg>
              </div>
              {[
                { label: "Finance", color: "bg-indigo-500", pct: "50%" },
                { label: "CRM",     color: "bg-emerald-500", pct: "25%" },
                { label: "HR",      color: "bg-amber-500", pct: "18%" },
                { label: "Other",   color: "bg-violet-500", pct: "7%" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className={cn("h-1.5 w-1.5 rounded-full", item.color)} />
                    <span className="text-[8px] text-white/40">{item.label}</span>
                  </div>
                  <span className="text-[8px] text-white/50 font-medium">{item.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MockBrowser>
  );
}

// ── MOCK 2: Invoice / Finance ─────────────────────────────────────────────

export function MockFinanceScreenshot({ className }: { className?: string }) {
  const invoices = [
    { id: "INV-2024",  client: "Acme Corp",     amount: "KSh 184,000", status: "Paid",    statusColor: "text-emerald-400 bg-emerald-500/15" },
    { id: "INV-2025",  client: "Zenith Ltd",    amount: "KSh 92,500",  status: "Pending", statusColor: "text-amber-400 bg-amber-500/15" },
    { id: "INV-2026",  client: "BlueStar Inc",  amount: "KSh 340,000", status: "Paid",    statusColor: "text-emerald-400 bg-emerald-500/15" },
    { id: "INV-2027",  client: "Nova Group",    amount: "KSh 56,800",  status: "Overdue", statusColor: "text-red-400 bg-red-500/15" },
    { id: "INV-2028",  client: "Meridian Co",   amount: "KSh 210,000", status: "Draft",   statusColor: "text-white/50 bg-white/8" },
  ];

  return (
    <MockBrowser className={className}>
      <AppTopbar />
      <div className="flex" style={{ height: 300 }}>
        <AppSidebar active={2} />
        <div className="flex-1 p-3 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[11px] font-bold text-white">Invoices</h3>
              <p className="text-[9px] text-white/40">Finance module</p>
            </div>
            <div className="flex gap-1.5">
              <div className="rounded-md bg-white/8 px-2 py-1 text-[8px] text-white/50">Export</div>
              <div className="rounded-md bg-indigo-600 px-2 py-1 text-[8px] text-white font-medium">+ New Invoice</div>
            </div>
          </div>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "Total Outstanding", value: "KSh 149,300", color: "text-amber-400" },
              { label: "Collected (Mar)",   value: "KSh 524,000", color: "text-emerald-400" },
              { label: "Overdue",           value: "KSh 56,800",  color: "text-red-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-white/8 bg-white/3 p-2">
                <p className="text-[8px] text-white/40">{s.label}</p>
                <p className={cn("text-[11px] font-bold mt-0.5", s.color)}>{s.value}</p>
              </div>
            ))}
          </div>
          {/* Table */}
          <div className="rounded-lg border border-white/8 overflow-hidden">
            <div className="grid grid-cols-4 px-3 py-1.5 bg-white/3 border-b border-white/8">
              {["Invoice", "Client", "Amount", "Status"].map((h) => (
                <span key={h} className="text-[8px] font-semibold text-white/30 uppercase tracking-wide">{h}</span>
              ))}
            </div>
            {invoices.map((inv) => (
              <div key={inv.id} className="grid grid-cols-4 px-3 py-1.5 border-b border-white/5 hover:bg-white/2">
                <span className="text-[9px] text-indigo-400 font-mono">{inv.id}</span>
                <span className="text-[9px] text-white/70">{inv.client}</span>
                <span className="text-[9px] text-white/80 font-medium">{inv.amount}</span>
                <span className={cn("text-[8px] font-medium px-1.5 rounded-full w-fit", inv.statusColor)}>{inv.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MockBrowser>
  );
}

// ── MOCK 3: HR / Payroll ──────────────────────────────────────────────────

export function MockHRScreenshot({ className }: { className?: string }) {
  const employees = [
    { name: "James Kariuki",   dept: "Engineering", gross: "KSh 145,000", net: "KSh 112,300", status: "Processed" },
    { name: "Wanjiru Maina",   dept: "Finance",      gross: "KSh 98,000",  net: "KSh 79,500",  status: "Processed" },
    { name: "David Omondi",    dept: "HR",           gross: "KSh 72,000",  net: "KSh 60,200",  status: "Pending" },
    { name: "Amina Hassan",    dept: "Sales",        gross: "KSh 88,000",  net: "KSh 71,800",  status: "Processed" },
  ];

  return (
    <MockBrowser className={className}>
      <AppTopbar />
      <div className="flex" style={{ height: 280 }}>
        <AppSidebar active={3} />
        <div className="flex-1 p-3 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[11px] font-bold text-white">Payroll Run — March 2026</h3>
              <p className="text-[9px] text-white/40">HR & Payroll module · 92 employees</p>
            </div>
            <div className="rounded-md bg-emerald-600 px-2 py-1 text-[8px] text-white font-medium flex items-center gap-1">
              <CheckCircle2 className="h-2 w-2" /> Approved
            </div>
          </div>
          {/* Summary row */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { label: "Gross Payroll", value: "KSh 9.2M",  color: "text-white" },
              { label: "PAYE Tax",      value: "KSh 1.4M",  color: "text-amber-400" },
              { label: "NHIF/NSSF",     value: "KSh 312K",  color: "text-blue-400" },
              { label: "Net Payroll",   value: "KSh 7.5M",  color: "text-emerald-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-white/8 bg-white/3 p-2">
                <p className="text-[8px] text-white/40">{s.label}</p>
                <p className={cn("text-[10px] font-bold mt-0.5", s.color)}>{s.value}</p>
              </div>
            ))}
          </div>
          {/* Employee table */}
          <div className="rounded-lg border border-white/8 overflow-hidden">
            <div className="grid grid-cols-5 px-3 py-1.5 bg-white/3 border-b border-white/8">
              {["Employee", "Department", "Gross", "Net Pay", "Status"].map((h) => (
                <span key={h} className="text-[8px] font-semibold text-white/30 uppercase tracking-wide">{h}</span>
              ))}
            </div>
            {employees.map((emp) => (
              <div key={emp.name} className="grid grid-cols-5 px-3 py-1.5 border-b border-white/5">
                <span className="text-[9px] text-white/80 font-medium">{emp.name}</span>
                <span className="text-[9px] text-white/50">{emp.dept}</span>
                <span className="text-[9px] text-white/70">{emp.gross}</span>
                <span className="text-[9px] text-emerald-400 font-medium">{emp.net}</span>
                <span className={cn("text-[8px] rounded-full px-1.5 w-fit font-medium",
                  emp.status === "Processed" ? "text-emerald-400 bg-emerald-500/15" : "text-amber-400 bg-amber-500/15"
                )}>{emp.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MockBrowser>
  );
}

// ── MOCK 4: CRM Pipeline ──────────────────────────────────────────────────

export function MockCRMScreenshot({ className }: { className?: string }) {
  const stages = [
    { label: "Lead",       count: 14, total: "KSh 2.1M",  color: "border-blue-500/40 bg-blue-500/5",    deals: ["Tech Corp", "BrightPath", "Summit Inc"] },
    { label: "Proposal",   count: 8,  total: "KSh 5.4M",  color: "border-violet-500/40 bg-violet-500/5", deals: ["Meridian", "Apex Group"] },
    { label: "Negotiation",count: 5,  total: "KSh 8.2M",  color: "border-amber-500/40 bg-amber-500/5",  deals: ["ZenCorp", "BlueStar"] },
    { label: "Won",        count: 22, total: "KSh 14.8M", color: "border-emerald-500/40 bg-emerald-500/5",deals: ["Acme Ltd", "Nova Co"] },
  ];

  return (
    <MockBrowser className={className}>
      <AppTopbar />
      <div className="flex" style={{ height: 300 }}>
        <AppSidebar active={1} />
        <div className="flex-1 p-3 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[11px] font-bold text-white">Sales Pipeline</h3>
              <p className="text-[9px] text-white/40">CRM module · Q1 2026</p>
            </div>
            <div className="flex gap-1.5">
              <div className="rounded-md bg-white/8 px-2 py-1 text-[8px] text-white/50">Filter</div>
              <div className="rounded-md bg-indigo-600 px-2 py-1 text-[8px] text-white font-medium">+ Add Deal</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 h-48">
            {stages.map((stage) => (
              <div key={stage.label} className={cn("rounded-lg border p-2 flex flex-col gap-1.5", stage.color)}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] font-semibold text-white/70">{stage.label}</span>
                  <span className="text-[8px] text-white/40">{stage.count}</span>
                </div>
                <div className="text-[8px] text-white/40 font-medium mb-1">{stage.total}</div>
                {stage.deals.map((deal) => (
                  <div key={deal} className="rounded bg-white/8 px-2 py-1">
                    <span className="text-[8px] text-white/70">{deal}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </MockBrowser>
  );
}
