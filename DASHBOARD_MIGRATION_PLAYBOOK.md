# Dashboard Migration Playbook

## Quick Reference Implementation Patterns

This document provides copy-paste ready code patterns for migrating dashboards to responsive design.

---

## Pattern A: Dashboard with Sidebar Navigation (Like AdminDashboard)

### Use Case
- Dashboard has distinct sections with separate navigation items
- Nav items are displayed as clickable buttons in a sidebar
- Examples: AdminDashboard, Projects, Clients

### Implementation Steps

#### Step 1: Add Required Imports
```tsx
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
```

#### Step 2: Define Navigation Items
```tsx
interface NavItem {
  title: string;
  icon: LucideIcon;
  href: string;
  badge?: string | number;
}

const navItems: NavItem[] = [
  { 
    title: "Overview", 
    icon: LayoutDashboard, 
    href: "/dashboard/main" 
  },
  { 
    title: "Employees", 
    icon: Users, 
    href: "/dashboard/employees" 
  },
  { 
    title: "Reports", 
    icon: BarChart3, 
    href: "/reports" 
  },
  // Add more items...
];
```

#### Step 3: Add Component State
```tsx
const [mobileNavOpen, setMobileNavOpen] = useState(false);
const [, setLocation] = useLocation();
```

#### Step 4: Create Return JSX Structure

```tsx
return (
  <div className="flex h-screen gap-0 bg-background">
    {/* ===== DESKTOP SIDEBAR ===== */}
    <Card className="hidden md:flex md:w-60 md:flex-shrink-0 md:flex-col md:rounded-none md:border-r md:bg-card">
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Users className="w-5 h-5" />
          HR Dashboard
        </h2>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              onClick={() => {
                setLocation(item.href);
                setMobileNavOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md",
                "text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.title}</span>
              {item.badge && (
                <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </Card>

    {/* ===== MOBILE OVERLAY SIDEBAR ===== */}
    {mobileNavOpen && (
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={() => setMobileNavOpen(false)}
      >
        <Card className="fixed left-0 top-0 h-full w-64 flex-shrink-0 rounded-none flex flex-col z-50 bg-card">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5" />
              HR Dashboard
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileNavOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    setLocation(item.href);
                    setMobileNavOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md",
                    "text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.title}</span>
                  {item.badge && (
                    <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </Card>
      </div>
    )}

    {/* ===== MAIN CONTENT AREA ===== */}
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <h1 className="text-lg font-bold">HR Dashboard</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Content Container */}
      <div className="flex-1 overflow-auto">
        <ModuleLayout
          title="HR Dashboard"
          description="Manage employees, attendance, and payroll"
          icon={<Users className="h-5 w-5" />}
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "HR" },
          ]}
        >
          {/* Your dashboard content here */}
          <div className="space-y-8">
            {/* Stats cards */}
            {/* Charts */}
            {/* Tables */}
            {/* Feature grids */}
          </div>
        </ModuleLayout>
      </div>
    </div>
  </div>
);
```

---

## Pattern B: Feature Grid Dashboard (Like HRDashboard)

### Use Case
- Dashboard displays a grid of feature/module cards as navigation
- Content is mostly read-only or displays stats
- No dedicated sidebar; features link to other pages
- Examples: HRDashboard, SalesManagerDashboard

### Key Consideration
This pattern may NOT need responsive sidebar since navigation is already card-based and responsive. However, if you want a quick-access sidebar on mobile:

#### Implementation: Add Optional Mobile Quick-Access Bar

```tsx
import { useState } from "react";
import { Menu } from "lucide-react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";

export default function HRDashboard() {
  const [quickAccessOpen, setQuickAccessOpen] = useState(false);
  const [, setLocation] = useLocation();

  const quickAccessItems = [
    { title: "Employees", icon: Users, href: "/hr/employees" },
    { title: "Attendance", icon: Calendar, href: "/hr/attendance" },
    { title: "Leaves", icon: FileText, href: "/hr/leaves" },
    { title: "Payroll", icon: DollarSign, href: "/payroll" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Mobile Quick Access Button */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <h1 className="text-lg font-bold">HR Dashboard</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setQuickAccessOpen(!quickAccessOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Quick Access Dropdown */}
      {quickAccessOpen && (
        <div className="md:hidden p-3 border-b bg-muted space-y-2">
          {quickAccessItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => {
                  setLocation(item.href);
                  setQuickAccessOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent"
              >
                <Icon className="w-4 h-4" />
                {item.title}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <ModuleLayout
          title="HR Dashboard"
          description="Manage employees, attendance, leave requests, and payroll"
          icon={<Users className="h-5 w-5" />}
        >
          <div className="space-y-8">
            {/* Rest of your dashboard content */}
          </div>
        </ModuleLayout>
      </div>
    </div>
  );
}
```

---

## Pattern C: Chat/Message Interface (Like StaffChat)

### Use Case
- Displays channels/conversations in a sidebar
- Main area shows messages or chat content
- Input field at bottom with floating widgets
- Examples: StaffChat, DirectMessages

### Critical Implementation Details

**Key Issue to Avoid**: Send button hidden by floating AI widget

**Solution**: Use `flex-shrink-0` and `sticky bottom-0` for input area

```tsx
const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

// DESKTOP SIDEBAR (hidden on mobile)
<Card className="hidden md:flex md:w-64 md:flex-shrink-0 md:flex-col md:border-r">
  <CardHeader>
    <CardTitle>Channels</CardTitle>
  </CardHeader>
  <CardContent className="flex-1 overflow-y-auto">
    {/* Channels list */}
  </CardContent>
</Card>

// MOBILE OVERLAY SIDEBAR
{mobileSidebarOpen && (
  <div className="fixed inset-0 z-40 bg-black/50 md:hidden">
    <Card className="fixed left-0 top-0 h-full w-64 flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Channels</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {/* Same channels list */}
      </CardContent>
    </Card>
  </div>
)}

// MAIN CHAT AREA
<Card className="flex-1 flex flex-col overflow-hidden">
  <CardHeader>
    <div className="flex items-center justify-between">
      <Button
        className="md:hidden"
        variant="ghost"
        size="icon"
        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      >
        <Menu className="h-4 w-4" />
      </Button>
      <CardTitle>Channel Name</CardTitle>
    </div>
  </CardHeader>

  {/* Messages - scrollable */}
  <CardContent className="flex-1 overflow-y-auto">
    {/* Chat messages */}
  </CardContent>

  {/* Input Area - FIXED at bottom with flex-shrink-0 */}
  <div className="p-3 border-t sticky bottom-0 bg-background flex flex-col gap-2">
    {/* Emoji picker - max-h-32 overflow-y-auto */}
    {/* Input field */}
    {/* Send button - flex-shrink-0 */}
    <div className="flex gap-2 flex-shrink-0">
      <Input
        type="text"
        placeholder="Type a message..."
        className="flex-1 min-w-0"
      />
      <Button className="flex-shrink-0">
        <Send className="h-4 w-4" />
      </Button>
    </div>
  </div>
</Card>
```

---

## Step-by-Step Migration Checklist

### Before You Start
- [ ] Read the current dashboard implementation
- [ ] Identify if it has sidebar navigation (Pattern A) or feature grid (Pattern B)
- [ ] Create a git branch: `git checkout -b responsive/dashboard-name`

### Implementation
- [ ] Add `useState` hook for mobile nav state
- [ ] Add import: `Menu` and `X` from lucide-react
- [ ] Define sidebar items if applicable
- [ ] Wrap return with responsive sidebar structure
- [ ] Test on browser DevTools mobile view (480px width)
- [ ] Test on tablet view (768px width)
- [ ] Test on desktop view (1024px+ width)

### Quality Assurance
- [ ] Sidebar closes when item selected
- [ ] Sidebar closes when backdrop clicked
- [ ] Mobile header menu button toggles sidebar
- [ ] No horizontal scrolling on any breakpoint
- [ ] All content readable on mobile
- [ ] Navigation doesn't overlap content
- [ ] Floating widgets don't cover critical UI

### Before Merging
- [ ] Run `npm run check` - no TypeScript errors
- [ ] Run `npm run build` - builds successfully
- [ ] Test locally on `localhost:3001`
- [ ] Check browser console for warnings/errors
- [ ] Get design review from team

---

## Common Tailwind Classes Reference

| Purpose | Desktop | Mobile |
|---------|---------|--------|
| Sidebar width | `w-60` or `w-64` | `w-64` |
| Show desktop, hide mobile | `hidden md:flex` | - |
| Show mobile, hide desktop | `md:hidden` | - |
| Fill available space | `flex-1` | `flex-1` |
| Prevent shrinking | `flex-shrink-0` | `flex-shrink-0` |
| Overlay | `fixed inset-0` | `fixed inset-0` |
| Overlay layer | `z-40` | `z-40` |
| Backdrop | `bg-black/50` | `bg-black/50` |
| Scrollable area | `overflow-y-auto` | `overflow-y-auto` |
| Sticky bottom | `sticky bottom-0` | `sticky bottom-0` |

---

## Troubleshooting Guide

### Problem: Responsive sidebar not appearing
**Check**:
- State `mobileNavOpen` is `true`
- `{mobileNavOpen && <div>...` is correct
- z-40 is applied to overlay
- `md:hidden` applied to mobile header

### Problem: Sidebar won't close
**Check**:
- `onClick={() => setMobileNavOpen(false)}` on backdrop
- `onClick={() => setMobileNavOpen(false)}` on nav items
- Close button X onClick handler

### Problem: Content jumping or shifting
**Check**:
- Outer container has `flex h-screen`
- Sidebar has `flex-shrink-0`
- Content area has `flex-1`
- No width conflicts

### Problem: Horizontal scrolling on mobile
**Check**:
- Sidebar uses `fixed` not `absolute`
- Content width uses `flex-1` not fixed pixels
- No padding/margin causing overflow
- Check for `w-full` conflicts with `w-64`

### Problem: Send button hidden by AI widget
**Check**:
- Input area has `sticky bottom-0`
- Input buttons have `flex-shrink-0`
- z-index proper (input z-40 or higher)
- Emoji picker has `max-h-32 overflow-y-auto`

---

## Performance Considerations

- Mobile overlays use `fixed` for GPU acceleration
- `overflow-y-auto` on scrollable areas prevents layout shift
- `flex-shrink-0` prevents UI collapse on small screens
- `min-w-0` prevents flex children from exceeding max width

---

## Accessibility Checklist

- [ ] Touch targets at least 44px × 44px (mobile)
- [ ] Contrast ratio 4.5:1 for text
- [ ] Keyboard navigation works (Tab through sidebar items)
- [ ] Menu button has `aria-label`
- [ ] Backdrop dismissible with Escape key
- [ ] Focus visible on interactive elements

---

## Browser Support

- Chrome 88+ ✅
- Firefox 85+ ✅
- Safari 14+ ✅
- Edge 88+ ✅
- Mobile Safari 14+ ✅
- Chrome Mobile 88+ ✅

---

*Generated: April 2026*
