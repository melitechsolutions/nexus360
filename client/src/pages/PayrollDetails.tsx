import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ModuleLayout } from "@/components/ModuleLayout";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import { Edit2, Trash2, DollarSign } from "lucide-react";
import { trpc } from "@/lib/trpc";
import mutateAsync from '@/lib/mutationHelpers';
import { toast } from "sonner";

export default function PayrollDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch payroll from backend
  const { data: payrollData, isLoading } = trpc.payroll.getById.useQuery(id || "");
  const { data: employeesData = [] } = trpc.employees.list.useQuery();
  const utils = trpc.useUtils();

  const deletePayrollMutation = trpc.payroll.delete.useMutation({
    onSuccess: () => {
      toast.success("Payroll record deleted successfully");
      utils.payroll.list.invalidate();
      setLocation("/payroll");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete payroll record");
    },
  });

  // Get employee info
  const employee = payrollData ? (employeesData as any[]).find((e: any) => e.id === (payrollData as any).employeeId) : null;

  // Format period
  const formatPeriod = (payPeriodStart: string, payPeriodEnd: string) => {
    const start = new Date(payPeriodStart);
    const end = new Date(payPeriodEnd);
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  const formatMonth = (payPeriodStart: string) => {
    const d = new Date(payPeriodStart);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const payrollRecord = payrollData ? {
    id: id,
    employeeId: (payrollData as any).employeeId || "Unknown",
    employeeName: employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee",
    department: employee?.department || "—",
    period: (payrollData as any).payPeriodStart && (payrollData as any).payPeriodEnd
      ? formatPeriod((payrollData as any).payPeriodStart, (payrollData as any).payPeriodEnd)
      : "Unknown Period",
    month: (payrollData as any).payPeriodStart
      ? formatMonth((payrollData as any).payPeriodStart)
      : "",
    baseSalary: ((payrollData as any).basicSalary || 0) / 100,
    allowances: ((payrollData as any).allowances || 0) / 100,
    deductions: ((payrollData as any).deductions || 0) / 100,
    tax: ((payrollData as any).tax || 0) / 100,
    netSalary: ((payrollData as any).netSalary || 0) / 100,
    status: (payrollData as any).status || "draft",
    currency: (payrollData as any).currency || "KES",
  } : null;

  const isPaid = payrollRecord?.status === "processed" || payrollRecord?.status === "paid";

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await mutateAsync(deletePayrollMutation, id || "");
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) {
    return (
      <ModuleLayout
        title="Payroll Details"
        icon={<DollarSign className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "HR", href: "/hr" },
          { label: "Payroll", href: "/payroll" },
          { label: "Details" },
        ]}
        backLink={{ label: "Payroll", href: "/payroll" }}
      >
        <div className="flex items-center justify-center h-64">
          <p>Loading payroll record...</p>
        </div>
      </ModuleLayout>
    );
  }

  if (!payrollRecord) {
    return (
      <ModuleLayout
        title="Payroll Details"
        icon={<DollarSign className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "HR", href: "/hr" },
          { label: "Payroll", href: "/payroll" },
          { label: "Details" },
        ]}
        backLink={{ label: "Payroll", href: "/payroll" }}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p>Payroll record not found</p>
          <Button onClick={() => setLocation("/payroll")}>Back to Payroll</Button>
        </div>
      </ModuleLayout>
    );
  }

  const grossPay = payrollRecord.baseSalary + payrollRecord.allowances;
  const totalDeductions = payrollRecord.deductions + payrollRecord.tax;

  return (
    <ModuleLayout
      title="Payroll Details"
      icon={<DollarSign className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "HR", href: "/hr" },
        { label: "Payroll", href: "/payroll" },
        { label: "Details" },
      ]}
      backLink={{ label: "Payroll", href: "/payroll" }}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setLocation(`/payroll/${id}/edit`)}>
            <Edit2 className="w-4 h-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      }
    >
      <div className="space-y-6">

        {/* Split Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT SIDEBAR */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                {/* Employee name + status */}
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold">{payrollRecord.employeeName}</h2>
                  <Badge variant={isPaid ? "default" : "secondary"} className={isPaid ? "bg-green-600 hover:bg-green-700" : ""}>
                    {isPaid ? "Paid" : "Pending"}
                  </Badge>
                </div>

                <Separator />

                {/* Key fields */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department</span>
                    <span className="font-medium">{payrollRecord.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pay Period</span>
                    <span className="font-medium">{payrollRecord.period}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Currency</span>
                    <span className="font-medium">{payrollRecord.currency}</span>
                  </div>
                </div>

                <Separator />

                {/* Net Salary */}
                <div className="text-center space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Net Salary</p>
                  <p className="text-2xl font-bold">{payrollRecord.currency} {payrollRecord.netSalary.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT CONTENT */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Earnings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Earnings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Salary</span>
                  <span className="font-medium">{payrollRecord.currency} {payrollRecord.baseSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Allowances</span>
                  <span className="font-medium text-green-600">+ {payrollRecord.currency} {payrollRecord.allowances.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-semibold">
                  <span>Gross Pay</span>
                  <span>{payrollRecord.currency} {grossPay.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Deductions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Deductions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Statutory Deductions</span>
                  <span className="font-medium text-red-600">- {payrollRecord.currency} {payrollRecord.deductions.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total Deductions</span>
                  <span className="text-red-600">- {payrollRecord.currency} {payrollRecord.deductions.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Tax */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tax</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">PAYE / Income Tax</span>
                  <span className="font-medium text-red-600">- {payrollRecord.currency} {payrollRecord.tax.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Net Pay Calculation */}
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-base">Net Pay Calculation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gross Pay</span>
                  <span className="font-medium">{payrollRecord.currency} {grossPay.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Less: Deductions</span>
                  <span className="font-medium text-red-600">- {payrollRecord.currency} {payrollRecord.deductions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Less: Tax</span>
                  <span className="font-medium text-red-600">- {payrollRecord.currency} {payrollRecord.tax.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Net Pay</span>
                  <span>{payrollRecord.currency} {payrollRecord.netSalary.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          title="Delete Payroll Record"
          description="Are you sure you want to delete this payroll record? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isLoading={isDeleting}
        />
      </div>
    </ModuleLayout>
  );
}
