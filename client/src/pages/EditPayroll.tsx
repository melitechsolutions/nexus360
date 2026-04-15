import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { DollarSign, ArrowLeft, Loader2, Trash2, Save, Download } from "lucide-react";
import { APP_TITLE } from "@/const";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";

export default function EditPayroll() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const companyInfo = useCompanyInfo();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    month: new Date().toISOString().split("T")[0].slice(0, 7),
    basicSalary: "",
    allowances: "",
    deductions: "",
    status: "pending",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(true);

  const { data: payroll } = trpc.payroll.getById.useQuery(
    id || "",
    { enabled: !!id }
  );

  const { data: employees = [] } = trpc.employees.list.useQuery();

  useEffect(() => {
    if (payroll) {
      setFormData({
        employeeId: payroll.employeeId || "",
        month: payroll.month
          ? new Date(payroll.month).toISOString().split("T")[0].slice(0, 7)
          : new Date().toISOString().split("T")[0].slice(0, 7),
        basicSalary: payroll.basicSalary ? (payroll.basicSalary / 100).toString() : "",
        allowances: payroll.allowances ? (payroll.allowances / 100).toString() : "",
        deductions: payroll.deductions ? (payroll.deductions / 100).toString() : "",
        status: payroll.status || "pending",
        notes: payroll.notes || "",
      });
      setIsLoading(false);
    }
  }, [payroll]);

  const updatePayrollMutation = trpc.payroll.update.useMutation({
    onSuccess: () => {
      toast.success("Payroll record updated successfully!");
      utils.payroll.list.invalidate();
      utils.payroll.getById.invalidate(id || "");
      navigate("/payroll");
    },
    onError: (error: any) => {
      toast.error(`Failed to update payroll record: ${error.message}`);
    },
  });

  const deletePayrollMutation = trpc.payroll.delete.useMutation({
    onSuccess: () => {
      toast.success("Payroll record deleted successfully!");
      utils.payroll.list.invalidate();
      navigate("/payroll");
    },
    onError: (error: any) => {
      toast.error(`Failed to delete payroll record: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.month || !formData.basicSalary) {
      toast.error("Please fill in all required fields");
      return;
    }

    updatePayrollMutation.mutate({
      id: id || "",
      employeeId: formData.employeeId,
      month: new Date(`${formData.month}-01`),
      basicSalary: Math.round(parseFloat(formData.basicSalary) * 100),
      allowances: formData.allowances ? Math.round(parseFloat(formData.allowances) * 100) : undefined,
      deductions: formData.deductions ? Math.round(parseFloat(formData.deductions) * 100) : undefined,
      status: formData.status as any,
      notes: formData.notes || undefined,
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this payroll record? This action cannot be undone.")) {
      deletePayrollMutation.mutate(id || "");
    }
  };

  const getEmployeeName = () => {
    const employee = (employees as any[]).find((emp: any) => emp.id === formData.employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  };

  const handleDownloadPDF = useCallback(async () => {
    setIsGeneratingPDF(true);
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Please allow popups to download PDF");
        setIsGeneratingPDF(false);
        return;
      }
      
      const basicSalary = parseFloat(formData.basicSalary || '0');
      const allowances = parseFloat(formData.allowances || '0');
      const deductions = parseFloat(formData.deductions || '0');
      const netSalary = basicSalary + allowances - deductions;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payslip - ${getEmployeeName()} - ${formData.month}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .company-info { text-align: right; font-size: 12px; }
            .document-title { font-size: 28px; font-weight: bold; color: #1e40af; margin-bottom: 10px; }
            .employee-info { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .info-row:last-child { border-bottom: none; }
            .label { font-weight: bold; color: #6b7280; }
            .earnings-section, .deductions-section { margin-bottom: 20px; }
            .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; padding: 8px; background: #e5e7eb; border-radius: 4px; }
            .amount-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .net-salary { font-size: 20px; font-weight: bold; color: #059669; text-align: right; padding: 15px; background: #d1fae5; border-radius: 8px; margin-top: 20px; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-processed { background: #dbeafe; color: #1e40af; }
            .status-paid { background: #d1fae5; color: #065f46; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="document-title">PAYSLIP</div>
              <div>Period: ${formData.month}</div>
            </div>
            <div class="company-info">
              <strong>${APP_TITLE}</strong><br>
              ${companyInfo.address ? companyInfo.address + '<br>' : ''}
              ${companyInfo.email || ''}
            </div>
          </div>
          
          <div class="employee-info">
            <div class="info-row">
              <span class="label">Employee Name:</span>
              <span>${getEmployeeName()}</span>
            </div>
            <div class="info-row">
              <span class="label">Pay Period:</span>
              <span>${formData.month}</span>
            </div>
            <div class="info-row">
              <span class="label">Status:</span>
              <span class="status status-${(formData.status || 'pending')}">${(formData.status || 'pending').toUpperCase()}</span>
            </div>
          </div>
          
          <div class="earnings-section">
            <div class="section-title">Earnings</div>
            <div class="amount-row">
              <span>Basic Salary</span>
              <span>KES ${basicSalary.toLocaleString()}</span>
            </div>
            <div class="amount-row">
              <span>Allowances</span>
              <span>KES ${allowances.toLocaleString()}</span>
            </div>
            <div class="amount-row" style="font-weight: bold;">
              <span>Total Earnings</span>
              <span>KES ${(basicSalary + allowances).toLocaleString()}</span>
            </div>
          </div>
          
          <div class="deductions-section">
            <div class="section-title">Deductions</div>
            <div class="amount-row">
              <span>Total Deductions</span>
              <span>KES ${deductions.toLocaleString()}</span>
            </div>
          </div>
          
          <div class="net-salary">
            Net Salary: KES ${netSalary.toLocaleString()}
          </div>
          
          ${formData.notes ? `
            <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px;">
              <strong>Notes:</strong><br>
              ${formData.notes}
            </div>
          ` : ''}
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      toast.success("PDF download initiated");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [formData, employees]);

  if (isLoading) {
    return (
      <ModuleLayout
        title="Edit Payroll"
        description="Update payroll record"
        icon={<DollarSign className="w-6 h-6" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "HR", href: "/hr" },
          { label: "Payroll", href: "/payroll" },
          { label: "Edit Payroll" },
        ]}
      >
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Edit Payroll"
      description="Update payroll record"
      icon={<DollarSign className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "HR", href: "/hr" },
        { label: "Payroll", href: "/payroll" },
        { label: "Edit Payroll" },
      ]}
    >
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Edit Payroll</CardTitle>
            <CardDescription>
              Update the payroll record below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee *</Label>
                  <Select
                    value={formData.employeeId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, employeeId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(employees) && employees.map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {(emp.firstName || "")} {(emp.lastName || "")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="month">Month *</Label>
                  <Input
                    id="month"
                    type="month"
                    value={formData.month}
                    onChange={(e) =>
                      setFormData({ ...formData, month: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="basicSalary">Basic Salary (Ksh) *</Label>
                  <Input
                    id="basicSalary"
                    type="number"
                    placeholder="0.00"
                    value={formData.basicSalary}
                    onChange={(e) =>
                      setFormData({ ...formData, basicSalary: e.target.value })
                    }
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allowances">Allowances (Ksh)</Label>
                  <Input
                    id="allowances"
                    type="number"
                    placeholder="0.00"
                    value={formData.allowances}
                    onChange={(e) =>
                      setFormData({ ...formData, allowances: e.target.value })
                    }
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="deductions">Deductions (Ksh)</Label>
                  <Input
                    id="deductions"
                    type="number"
                    placeholder="0.00"
                    value={formData.deductions}
                    onChange={(e) =>
                      setFormData({ ...formData, deductions: e.target.value })
                    }
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processed">Processed</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <div className="flex gap-2 justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deletePayrollMutation.isPending}
                >
                  {deletePayrollMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/payroll")}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                  >
                    {isGeneratingPDF ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download Payslip
                  </Button>
                  <Button
                    type="submit"
                    disabled={updatePayrollMutation.isPending}
                  >
                    {updatePayrollMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Update Payroll
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
