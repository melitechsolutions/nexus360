import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PayrollExportModal({ open, onOpenChange }: Props) {
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");

  const exportMutation = trpc.payrollExport.exportPayroll.useMutation();
  const utils = trpc.useUtils();

  const handleExport = async () => {
    try {
      const resp: any = await exportMutation.mutateAsync({ startDate, endDate, employeeId: employeeId || undefined, departmentId: departmentId || undefined, format });
      if (!resp || !resp.success) {
        toast.error(resp?.message || "No data to export");
        return;
      }

      const bytes = Uint8Array.from(atob(resp.data), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: resp.format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resp.filename || `payroll_export.${resp.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${resp.recordCount || 0} records`);
      utils.payroll.list.invalidate();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Export failed", error);
      toast.error(error?.message || "Failed to export payroll");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Payroll</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">End Date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3\">
            <div>
              <label className=\"text-sm text-muted-foreground\">Employee (optional)</label>
              <Input placeholder=\"Employee ID\" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
            </div>
            <div>
              <label className=\"text-sm text-muted-foreground\">Department (optional)</label>
              <Input placeholder=\"Department ID\" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Format</label>
            <Select value={format} onValueChange={(v) => setFormat(v as any)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleExport} disabled={exportMutation.isPending}>{exportMutation.isPending ? 'Exporting...' : 'Export'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
