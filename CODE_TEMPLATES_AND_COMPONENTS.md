# 🛠️ Reusable Code Templates & Components

## Quick Reference: Files to Read First

```
Priority 1 (MUST READ):
├── /client/src/pages/dashboards/SuperAdminDashboard.tsx    <-- Design source
├── /client/src/pages/org/OrgDashboard.tsx                  <-- Current org design
└── /client/src/App.tsx                                      <-- Routing (lines 1-150 for imports, 500+ for routes)

Priority 2 (SHOULD READ):
├── /client/src/pages/dashboards/AdminDashboard.tsx         <-- Layout pattern
├── /client/src/pages/dashboards/ICTDashboard.tsx           <-- Responsive example
├── /client/src/components/Sidebar.tsx                      <-- Nav structure
└── /client/src/pages/org/OrgSettings.tsx                   <-- Settings layout

Priority 3 (REFERENCE):
├── /client/src/hooks/useOrganization.ts                    <-- Org context
├── /client/src/hooks/useAuth.ts                            <-- Auth context
└── /client/src/types/index.ts                              <-- Type definitions
```

---

## 📦 Reusable Component Templates

### 1. OrgLayout.tsx (Main Wrapper)

```typescript
import React, { ReactNode } from 'react';
import { useParams } from 'wouter';
import { Menu, X } from 'lucide-react';
import OrgNavBar from '@/components/OrgNavBar';
import OrgSidebar from '@/components/OrgSidebar';
import { useOrganization } from '@/hooks/useOrganization';

export interface OrgLayoutProps {
  children: ReactNode;
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
  fullWidth?: boolean;
}

export const OrgLayout: React.FC<OrgLayoutProps> = ({
  children,
  title,
  breadcrumbs,
  actions,
  fullWidth = false,
}) => {
  const { slug } = useParams<{ slug: string }>();
  const { org, loading } = useOrganization(slug);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile menu button (hidden on desktop) */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-white shadow-md"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative z-40 h-full w-64 bg-gray-900 text-white
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <OrgSidebar org={org} onNavigate={() => setSidebarOpen(false)} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
          <OrgNavBar
            title={title}
            breadcrumbs={breadcrumbs}
            actions={actions}
            org={org}
          />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className={fullWidth ? 'h-full' : 'p-4 md:p-6 lg:p-8'}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile overlay when sidebar open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default OrgLayout;
```

---

### 2. OrgNavBar.tsx (Top Navigation)

```typescript
import React from 'react';
import { ChevronRight, Globe, LogOut } from 'lucide-react';
import { useLocation, useParams } from 'wouter';
import { Organization } from '@/types';

export interface OrgNavBarProps {
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  org?: Organization;
}

export const OrgNavBar: React.FC<OrgNavBarProps> = ({
  title,
  breadcrumbs = [],
  actions,
  org,
}) => {
  const [, navigate] = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <nav className="flex items-center justify-between px-4 md:px-6 lg:px-8 py-4 md:py-3">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-2 flex-1">
        {breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight size={16} className="text-gray-400" />}
                {crumb.href ? (
                  <button
                    onClick={() => navigate(crumb.href!)}
                    className="hover:text-gray-900 transition"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-gray-900 font-medium">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Center: Title */}
      {title && (
        <h1 className="text-lg md:text-xl font-semibold text-gray-900 mx-4">
          {title}
        </h1>
      )}

      {/* Right: Actions & User Menu */}
      <div className="flex items-center gap-4">
        {actions}

        {/* Organization Selector */}
        <button className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            {org?.logo_url ? (
              <img src={org.logo_url} alt={org.name} className="w-full h-full rounded" />
            ) : (
              <Globe size={16} className="text-white" />
            )}
          </div>
          <span className="text-sm font-medium text-gray-700">{org?.name}</span>
        </button>

        {/* User Menu */}
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
            {user.name?.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default OrgNavBar;
```

---

### 3. StatCard.tsx (Reusable Stat Display)

```typescript
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  colorClass?: string;
  onClick?: () => void;
  compact?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
  trendLabel,
  colorClass = 'bg-blue-100 text-blue-600',
  onClick,
  compact = false,
}) => {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg p-6 shadow-sm hover:shadow-md transition cursor-pointer bg-white border border-gray-200',
        onClick && 'hover:bg-gray-50'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className={cn(
            'mt-3 font-bold',
            compact ? 'text-xl' : 'text-2xl'
          )}>
            {value}
          </p>
          {subValue && (
            <p className="text-xs text-gray-500 mt-2">{subValue}</p>
          )}
          {trendLabel && (
            <p className={cn('text-xs font-medium mt-2', getTrendColor())}>
              {trendLabel}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn(colorClass, 'rounded-lg p-3')}>
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
```

---

### 4. ModuleCard.tsx (Feature Grid Item)

```typescript
import React from 'react';
import { LucideIcon, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  badge?: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({
  title,
  description,
  icon: Icon,
  onClick,
  badge,
  disabled = false,
  comingSoon = false,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || comingSoon}
      className={cn(
        'group relative overflow-hidden rounded-lg border-2 border-gray-200 p-6 text-left transition-all',
        'hover:border-blue-500 hover:shadow-lg',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'bg-white hover:bg-blue-50'
      )}
    >
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:scale-110 transition">
            <Icon size={24} />
          </div>
          {badge && (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
              {badge}
            </span>
          )}
        </div>

        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>

        {comingSoon && (
          <p className="text-xs font-medium text-orange-600 mt-3">Coming Soon</p>
        )}

        <div className="flex items-center gap-2 mt-4 text-blue-600 group-hover:gap-3 transition-all">
          <span className="text-xs font-semibold">Open</span>
          <ArrowRight size={16} />
        </div>
      </div>
    </button>
  );
};

export default ModuleCard;
```

---

### 5. FormToggle.tsx (For SMTP Settings)

```typescript
import React from 'react';

export interface FormToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const FormToggle: React.FC<FormToggleProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="flex items-start justify-between py-4 px-4 border-b border-gray-200 last:border-b-0">
      <div>
        <label className="text-sm font-medium text-gray-900">{label}</label>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>

      {/* Toggle Switch */}
      <button
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`
          relative inline-flex h-8 w-16 items-center rounded-full transition-colors
          ${checked ? 'bg-blue-600' : 'bg-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform
            ${checked ? 'translate-x-9' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
};

export default FormToggle;
```

---

## 📋 Complete OrgDashboard Template (Drop-in Replacement)

```typescript
import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { BarChart3, Users, DollarSign, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import OrgLayout from '@/components/OrgLayout';
import StatCard from '@/components/StatCard';
import ModuleCard from '@/components/ModuleCard';
import { useOrganization } from '@/hooks/useOrganization';

// Sample data - replace with API calls
const sampleStats = [
  {
    label: 'Total Revenue',
    value: '$125,430',
    subValue: 'This Month',
    icon: DollarSign,
    colorClass: 'bg-blue-100 text-blue-600',
  },
  {
    label: 'Active Projects',
    value: '12',
    subValue: 'On Track',
    icon: BarChart3,
    colorClass: 'bg-green-100 text-green-600',
  },
  {
    label: 'Team Members',
    value: '24',
    subValue: 'Active',
    icon: Users,
    colorClass: 'bg-purple-100 text-purple-600',
  },
  {
    label: 'Outstanding Invoices',
    value: '$28,450',
    subValue: 'Due in 30 days',
    icon: TrendingUp,
    colorClass: 'bg-orange-100 text-orange-600',
  },
];

const modules = [
  {
    title: 'CRM',
    description: 'Manage clients and business opportunities',
    icon: Users,
    href: 'crm',
  },
  {
    title: 'Projects',
    description: 'Track and manage your projects',
    icon: BarChart3,
    href: 'projects',
  },
  {
    title: 'Finance',
    description: 'Invoices, payments, and reports',
    icon: DollarSign,
    href: 'billing',
  },
  {
    title: 'HR',
    description: 'Manage team and payroll',
    icon: Users,
    href: 'hr',
  },
];

const OrgDashboard: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const { org } = useOrganization(slug);
  const [stats, setStats] = useState(sampleStats);

  // TODO: Replace with actual API call to fetch org stats
  useEffect(() => {
    // const fetchStats = async () => {
    //   const response = await fetch(`/api/orgs/${slug}/stats`);
    //   const data = await response.json();
    //   setStats(data);
    // };
    // fetchStats();
  }, [slug]);

  return (
    <OrgLayout
      title="Dashboard"
      breadcrumbs={[
        { label: 'Home' },
        { label: 'Dashboard' },
      ]}
    >
      {/* ALERTS SECTION */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle size={20} className="text-yellow-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-900">Outstanding invoices alert</p>
            <p className="text-xs text-yellow-700">You have 3 invoices overdue by more than 30 days</p>
          </div>
        </div>
      </div>

      {/* STAT CARDS SECTION */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            subValue={stat.subValue}
            icon={stat.icon}
            colorClass={stat.colorClass}
          />
        ))}
      </section>

      {/* QUICK ACTIONS / MODULE GRID */}
      <section className="mb-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Quick Access</h2>
          <p className="text-sm text-gray-600">Access your organization's key modules</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((module) => (
            <ModuleCard
              key={module.title}
              title={module.title}
              description={module.description}
              icon={module.icon}
              onClick={() => navigate(`/org/${slug}/${module.href}`)}
            />
          ))}
        </div>
      </section>

      {/* RECENT ACTIVITY */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">Invoice #{1000 + i}</p>
                  <p className="text-xs text-gray-500">Client Name • {new Date().toLocaleDateString()}</p>
                </div>
                <span className="text-sm font-semibold text-green-600">Paid</span>
              </div>
            ))}
          </div>
          <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 mt-4 block">
            View all transactions →
          </a>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={18} />
            Upcoming
          </h3>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="py-3 border-b border-gray-100 last:border-0">
                <p className="text-sm font-medium text-gray-900">Milestone {i}</p>
                <p className="text-xs text-gray-500">{new Date().toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </OrgLayout>
  );
};

export default OrgDashboard;
```

---

## 🔄 Backend Integration Pattern

### API Endpoints to Implement:

```typescript
// GET organization stats
GET /api/orgs/:orgId/stats
Response:
{
  revenue: { thisMonth: 125430, total: 1254300 },
  projects: { active: 12, completed: 45 },
  team: { total: 24, active: 20 },
  invoices: { outstanding: 28450, overdue: 12340 }
}

// GET organization SMTP config
GET /api/orgs/:orgId/email-config
Response:
{
  use_global_smtp: true,
  smtp_config: null  // or { host, port, email, ... }
}

// POST/PUT SMTP config
PUT /api/orgs/:orgId/email-config
Body:
{
  use_global_smtp: boolean,
  smtp_config: {
    host: string,
    port: number,
    email: string,
    username: string,
    password: string  // will be encrypted on backend
  }
}

// POST test SMTP connection
POST /api/orgs/:orgId/email-config/test
Response:
{
  success: boolean,
  message: string
}
```

---

## 🎨 Tailwind Color Tokens

Based on existing global dashboard design, use these colors:

```typescript
// Primary Colors
const colors = {
  primary: '#3B82F6',      // blue-600
  secondary: '#8B5CF6',    // purple-600
  success: '#10B981',      // green-600
  warning: '#F59E0B',      // amber-600
  error: '#EF4444',        // red-600
  
  // Neutral palette
  bg: '#F9FAFB',           // gray-50
  border: '#E5E7EB',       // gray-200
  text: '#111827',         // gray-900
  textLight: '#6B7280',    // gray-500
};

// Use in classes:
className="bg-blue-50 text-blue-600 border-blue-200"
className="bg-green-50 text-green-600 border-green-200"
className="bg-purple-50 text-purple-600 border-purple-200"
```

---

## ✅ Implementation Checklist

- [ ] Create OrgLayout.tsx (copy template above)
- [ ] Create OrgNavBar.tsx (copy template above)
- [ ] Create StatCard.tsx (copy template above)
- [ ] Create ModuleCard.tsx (copy template above)
- [ ] Create FormToggle.tsx (copy template above)
- [ ] Update OrgDashboard.tsx (use template above)
- [ ] Add SMTP config section to OrgSettings.tsx
- [ ] Test components render correctly
- [ ] Test responsive design on mobile
- [ ] Verify data flows from backend API
- [ ] Test navigation between pages

