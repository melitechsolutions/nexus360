import React from "react";
import { Button } from "@/components/ui/button";
import {
  Package,
  Users,
  FileText,
  DollarSign,
  Search,
  Plus,
  LucideIcon,
} from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  variant?: "search" | "default";
  className?: string;
}

const iconMap: Record<string, LucideIcon> = {
  products: Package,
  employees: Users,
  invoices: FileText,
  payments: DollarSign,
};

/**
 * EmptyState component for lists with no data
 * Provides clear visual indication and CTA for users
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  variant = "default",
  className = "",
}: EmptyStateProps) {
  const isSearch = variant === "search";

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        {isSearch ? (
          <Search className="w-8 h-8 text-muted-foreground" />
        ) : Icon ? (
          <Icon className="w-8 h-8 text-muted-foreground" />
        ) : (
          <Package className="w-8 h-8 text-muted-foreground" />
        )}
      </div>

      <h3 className="text-lg font-semibold">{title}</h3>

      {description && (
        <p className="text-sm text-muted-foreground mt-2 max-w-sm text-center">
          {description}
        </p>
      )}

      {(actionLabel || onAction || actionHref) && (
        <div className="mt-6">
          {actionHref ? (
            <Button
              onClick={() => (window.location.href = actionHref)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              {actionLabel || "Get Started"}
            </Button>
          ) : onAction ? (
            <Button onClick={onAction} className="gap-2">
              <Plus className="w-4 h-4" />
              {actionLabel || "Create"}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * Specialized empty states for common scenarios
 */

export function EmptyProducts({
  onCreateClick,
}: {
  onCreateClick?: () => void;
}) {
  return (
    <EmptyState
      icon={iconMap.products}
      title="No products yet"
      description="Start by creating your first product. Add details like name, price, and inventory levels."
      actionLabel="Create Product"
      onAction={onCreateClick}
    />
  );
}

export function EmptyEmployees({
  onCreateClick,
}: {
  onCreateClick?: () => void;
}) {
  return (
    <EmptyState
      icon={iconMap.employees}
      title="No employees yet"
      description="Add your team members to get started. Include their roles, departments, and salary information."
      actionLabel="Add Employee"
      onAction={onCreateClick}
    />
  );
}

export function EmptyInvoices({
  onCreateClick,
}: {
  onCreateClick?: () => void;
}) {
  return (
    <EmptyState
      icon={iconMap.invoices}
      title="No invoices yet"
      description="Create your first invoice to start tracking payments and managing billing."
      actionLabel="Create Invoice"
      onAction={onCreateClick}
    />
  );
}

export function EmptyPayments({
  onCreateClick,
}: {
  onCreateClick?: () => void;
}) {
  return (
    <EmptyState
      icon={iconMap.payments}
      title="No payments recorded"
      description="Start recording payment transactions. Link payments to invoices for better tracking."
      actionLabel="Record Payment"
      onAction={onCreateClick}
    />
  );
}

export function EmptySearchResults({
  query,
}: {
  query?: string;
}) {
  return (
    <EmptyState
      variant="search"
      title="No results found"
      description={
        query
          ? `No results match "${query}". Try adjusting your search terms.`
          : "No results found. Try adjusting your filters or search query."
      }
    />
  );
}
