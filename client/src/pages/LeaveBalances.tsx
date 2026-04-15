import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatsCard } from "@/components/ui/stats-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CalendarDays, Plus, TreePalm, Pencil, HeartPulse, Baby, Umbrella } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const LEAVE_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  annual: { label: "Annual Leave", icon: TreePalm, color: "text-green-500" },
  sick: { label: "Sick Leave", icon: HeartPulse, color: "text-red-500" },
  maternity: { label: "Maternity", icon: Baby, color: "text-pink-500" },
  paternity: { label: "Paternity", icon: Baby, color: "text-blue-500" },
  compassionate: { label: "Compassionate", icon: Umbrella, color: "text-purple-500" },
  unpaid: { label: "Unpaid", icon: CalendarDays, color: "text-gray-500" },
  study: { label: "Study Leave", icon: CalendarDays, color: "text-amber-500" },
};

export default function LeaveBalancesPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState("all");
  const [showAllocate, setShowAllocate] = useState(false);

  const employeesQ = trpc.employees.list.useQuery();
  const summaryQ = trpc.leaveBalances.summary.useQuery({ year });
  const listQ = trpc.leaveBalances.list.useQuery({ year, leaveType: filterType === "all" ? undefined : filterType });
  const allocateMut = trpc.leaveBalances.allocate.useMutation({ onSuccess() { toast.success("Leave allocated"); listQ.refetch(); summaryQ.refetch(); setShowAllocate(false); } });
  const updateMut = trpc.leaveBalances.update.useMutation({ onSuccess() { toast.success("Updated"); listQ.refetch(); summaryQ.refetch(); } });

  const [allocForm, setAllocForm] = useState({ employeeId: "", leaveType: "annual", entitlement: "21", carriedOver: "0" });

  const summary = summaryQ.data || [];
  const balances = listQ.data || [];

  return (
    <ModuleLayout
      title="Leave Balances"
      description="Track and manage employee leave entitlements and usage"
      icon={<CalendarDays className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "HR", href: "/hr" }, { label: "Leave Balances" }]}
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {summary.slice(0, 5).map((s: any) => {
            const lt = LEAVE_TYPES[s.leaveType];
            const Icon = lt?.icon || CalendarDays;
            return (
              <StatsCard
                key={s.leaveType}
                label={lt?.label || s.leaveType}
                value={`${Number(s.totalUsed || 0).toFixed(0)}/${Number(s.totalEntitlement || 0).toFixed(0)}`}
                icon={<Icon className={`h-5 w-5 ${lt?.color || "text-gray-500"}`} />}
              />
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-3">
            <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[year - 1, year, year + 1].map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leave Types</SelectItem>
                {Object.entries(LEAVE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { setAllocForm({ employeeId: "", leaveType: "annual", entitlement: "21", carriedOver: "0" }); setShowAllocate(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Allocate Leave
          </Button>
        </div>

        {/* Balances Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Entitlement</TableHead>
                  <TableHead>Carried Over</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No leave balances found for {year}</TableCell></TableRow>
                )}
                {balances.map((b: any) => {
                  const lt = LEAVE_TYPES[b.leaveType];
                  const total = Number(b.entitlement || 0) + Number(b.carriedOver || 0);
                  const used = Number(b.used || 0);
                  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.employeeName || b.employeeId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{lt?.label || b.leaveType}</Badge>
                      </TableCell>
                      <TableCell>{Number(b.entitlement).toFixed(1)}</TableCell>
                      <TableCell>{Number(b.carriedOver).toFixed(1)}</TableCell>
                      <TableCell>{Number(b.used).toFixed(1)}</TableCell>
                      <TableCell>{Number(b.pending).toFixed(1)}</TableCell>
                      <TableCell className="font-semibold">{Number(b.remaining).toFixed(1)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="w-20 h-2" />
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Allocate Dialog */}
        <Dialog open={showAllocate} onOpenChange={setShowAllocate}>
          <DialogContent>
            <DialogHeader><DialogTitle>Allocate Leave</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Employee *</label>
                <select className="w-full mt-1 border rounded-md px-3 py-2 text-sm" value={allocForm.employeeId} onChange={(e) => setAllocForm({ ...allocForm, employeeId: e.target.value })}>
                  <option value="">Select employee...</option>
                  {(employeesQ.data || []).map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Leave Type</label>
                <Select value={allocForm.leaveType} onValueChange={(v) => setAllocForm({ ...allocForm, leaveType: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAVE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Entitlement (days)</label><Input type="number" className="mt-1" value={allocForm.entitlement} onChange={(e) => setAllocForm({ ...allocForm, entitlement: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Carried Over (days)</label><Input type="number" className="mt-1" value={allocForm.carriedOver} onChange={(e) => setAllocForm({ ...allocForm, carriedOver: e.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowAllocate(false)}>Cancel</Button>
                <Button onClick={() => { if (!allocForm.employeeId) { toast.error("Select an employee"); return; } allocateMut.mutate({ employeeId: allocForm.employeeId, leaveType: allocForm.leaveType as any, year, entitlement: Number(allocForm.entitlement), carriedOver: Number(allocForm.carriedOver) }); }}>Allocate</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleLayout>
  );
}
