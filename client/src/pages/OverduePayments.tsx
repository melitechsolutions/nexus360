import React from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import OverduePaymentDashboard from "@/components/OverduePaymentDashboard";
import { AlertCircle } from "lucide-react";

/**
 * OverduePayments Page
 * 
 * Dedicated page for managing overdue invoice payments
 * - Display all overdue invoices
 * - Send payment reminders (1st, 2nd, final)
 * - Track reminder history
 * - Bulk operations for reminders
 */
export default function OverduePaymentsPage() {
  return (
    <ModuleLayout
      title="Overdue Payments Management"
      description="Track and manage overdue invoices. Send reminders to encourage timely payment and improve cash flow."
      icon={<AlertCircle className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Accounting", href: "/accounting" },
        { label: "Overdue Payments" },
      ]}
    >
      <div className="space-y-6 p-4 sm:p-6">
        <OverduePaymentDashboard />
      </div>
    </ModuleLayout>
  );
}
