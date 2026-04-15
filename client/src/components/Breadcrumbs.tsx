import React from "react";
import { useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const breadcrumbMap: Record<string, BreadcrumbItem[]> = {
  "/": [{ label: "Dashboard", href: "/crm-home" }],
  "/dashboard": [{ label: "Dashboard", href: "/crm-home" }],
  "/clients": [
    { label: "Dashboard", href: "/crm-home" },
    { label: "Clients", href: "/clients" },
  ],
  "/projects": [
    { label: "Dashboard", href: "/crm-home" },
    { label: "Projects", href: "/projects" },
  ],
  "/invoices": [
    { label: "Dashboard", href: "/crm-home" },
    { label: "Accounting", href: "/accounting" },
    { label: "Invoices", href: "/invoices" },
  ],
  "/estimates": [
    { label: "Dashboard", href: "/crm-home" },
    { label: "Sales", href: "/sales" },
    { label: "Estimates", href: "/estimates" },
  ],
  "/receipts": [
    { label: "Dashboard", href: "/crm-home" },
    { label: "Sales", href: "/sales" },
    { label: "Receipts", href: "/receipts" },
  ],
  "/payments": [
    { label: "Dashboard", href: "/crm-home" },
    { label: "Accounting", href: "/accounting" },
    { label: "Payments", href: "/payments" },
  ],
  "/expenses": [
    { label: "Dashboard", href: "/crm-home" },
    { label: "Accounting", href: "/accounting" },
    { label: "Expenses", href: "/expenses" },
  ],
  "/products": [
    { label: "Dashboard", href: "/crm-home" },
    { label: "Products & Services", href: "/products" },
    { label: "Products", href: "/products" },
  ],
  "/services": [
    { label: "Dashboard", href: "/crm-home" },
    { label: "Products & Services", href: "/services" },
    { label: "Services", href: "/services" },
  ],
  "/employees": [
    { label: "Dashboard", href: "/crm-home" },
    { label: "HR", href: "/hr" },
    { label: "Employees", href: "/employees" },
  ],
  "/departments": [
    { label: "Dashboard", href: "/crm-home" },
    { label: "HR", href: "/hr" },
    { label: "Departments", href: "/departments" },
  ],
  "/attendance": [
    { label: "Dashboard", href: "/crm-home" },
    { label: "HR", href: "/hr" },
    { label: "Attendance", href: "/attendance" },
  ],
  "/payroll": [
    { label: "Dashboard", href: "/crm-home" },
    { label: "HR", href: "/hr" },
    { label: "Payroll", href: "/payroll" },
  ],
  "/leave-management": [
    { label: "Dashboard", href: "/crm-home" },
    { label: "HR", href: "/hr" },
    { label: "Leave Management", href: "/leave-management" },
  ],
  "/reports": [
    { label: "Dashboard", href: "/crm-home" },
    { label: "Reports", href: "/reports" },
  ],
  "/accounting": [
    { label: "Dashboard", href: "/crm-home" },
    { label: "Accounting", href: "/accounting" },
  ],
  "/opportunities": [
    { label: "Dashboard", href: "/crm-home" },
    { label: "Sales", href: "/sales" },
    { label: "Opportunities", href: "/opportunities" },
  ],
  "/bank-reconciliation": [
    { label: "Dashboard", href: "/crm-home" },
    { label: "Accounting", href: "/accounting" },
    { label: "Bank Reconciliation", href: "/bank-reconciliation" },
  ],
  "/chart-of-accounts": [
    { label: "Dashboard", href: "/crm-home" },
    { label: "Accounting", href: "/accounting" },
    { label: "Chart of Accounts", href: "/chart-of-accounts" },
  ],
};

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const [location] = useLocation();
  const [, navigate] = useLocation();

  // Get breadcrumb items from map or use provided items
  const breadcrumbItems = items || breadcrumbMap[location] || [{ label: "Dashboard", href: "/crm-home" }];

  return (
    <nav className={cn("flex items-center gap-1 text-sm", className)}>
      {breadcrumbItems.map((item) => (
        <React.Fragment key={item.href || item.label}>
          {breadcrumbItems.indexOf(item) > 0 && (
            <ChevronRight className="w-4 h-4 text-slate-400 mx-1" />
          )}
          {item.href ? (
            <button
              onClick={() => navigate(item.href!)}
              className="text-slate-600 hover:text-slate-900 transition-colors font-medium"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-slate-900 font-semibold">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

