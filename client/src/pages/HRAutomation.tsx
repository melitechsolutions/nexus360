import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/ModuleLayout";
import { StatsCard } from "@/components/ui/stats-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Zap, AlertTriangle, Calendar, Play, Plus, Trash2, Clock,
  FileText, Users, DollarSign, CheckCircle, XCircle, RefreshCw,
} from "lucide-react";

export default function HRAutomation() {
  const [tab, setTab] = useState("dashboard");
  const { data: stats, refetch: refetchStats } = trpc.hrAutomation.getStats.useQuery();
  const { data: rules, refetch: refetchRules } = trpc.hrAutomation.getRules.useQuery();
  const { data: logs, refetch: refetchLogs } = trpc.hrAutomation.getLogs.useQuery({ limit: 50 });
  const { data: expiringContracts } = trpc.hrAutomation.getExpiringContracts.useQuery({ days: 30 });

  const runAutomation = trpc.hrAutomation.runAutomation.useMutation({
    onSuccess: (data) => {
      toast.success(`Automation completed: ${data.results.length} rules executed`);
      refetchStats(); refetchLogs();
    },
    onError: (err) => toast.error(err.message),
  });

  const runLeaveAccrual = trpc.hrAutomation.runLeaveAccrual.useMutation({
    onSuccess: (data) => { toast.success(data.message); refetchStats(); refetchLogs(); },
    onError: (err) => toast.error(err.message),
  });

  const generatePayroll = trpc.hrAutomation.generatePayroll.useMutation({
    onSuccess: (data) => { toast.success(data.message); refetchStats(); },
    onError: (err) => toast.error(err.message),
  });

  const createRule = trpc.hrAutomation.createRule.useMutation({
    onSuccess: () => { toast.success("Rule created"); refetchRules(); },
  });

  const deleteRule = trpc.hrAutomation.deleteRule.useMutation({
    onSuccess: () => { toast.success("Rule deleted"); refetchRules(); },
  });

  const updateRule = trpc.hrAutomation.updateRule.useMutation({
    onSuccess: () => { refetchRules(); },
  });

  const [newRule, setNewRule] = useState({ name: "", type: "leave_accrual" as string, schedule: "monthly", config: "{}" });
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());

  return (
    <ModuleLayout
      title="HR Automation"
      description="Automate leave accrual, contract alerts, payroll generation, and more"
      icon={<Zap className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm" },
        { label: "HR", href: "/hr/employees" },
        { label: "Automation" },
      ]}
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Expiring Contracts" value={stats?.expiringContracts ?? 0} icon={<AlertTriangle className="h-5 w-5" />} />
          <StatsCard label="Leave Accruals" value={stats?.pendingAccrual ?? 0} icon={<Calendar className="h-5 w-5" />} />
          <StatsCard label="Draft Payrolls" value={stats?.pendingPayroll ?? 0} icon={<DollarSign className="h-5 w-5" />} />
          <StatsCard label="Active Rules" value={stats?.activeRules ?? 0} icon={<Zap className="h-5 w-5" />} />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="rules">Automation Rules</TabsTrigger>
            <TabsTrigger value="actions">Quick Actions</TabsTrigger>
            <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Expiring Contracts */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Contracts Expiring (30 days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!expiringContracts || expiringContracts.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No contracts expiring soon</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Expires</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expiringContracts.slice(0, 10).map((c: any) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.first_name} {c.last_name}</TableCell>
                            <TableCell><Badge variant="outline">{c.contract_type}</Badge></TableCell>
                            <TableCell>{c.end_date ? new Date(c.end_date).toLocaleDateString() : "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Recent Automation Logs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recent Automation Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!logs || logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No automation activity yet</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {logs.slice(0, 10).map((log: any) => (
                        <div key={log.id} className="flex items-center gap-2 text-sm border-b pb-2">
                          {log.status === "success" ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{log.rule_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{log.result}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {log.executed_at ? new Date(log.executed_at).toLocaleString() : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Automation Rules</CardTitle>
                  <CardDescription>Configure automated HR processes</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => runAutomation.mutate()} disabled={runAutomation.isPending}>
                    <Play className="h-4 w-4 mr-1" /> Run All
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button><Plus className="h-4 w-4 mr-1" /> New Rule</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Create Automation Rule</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div><Label>Name</Label><Input value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} /></div>
                        <div>
                          <Label>Type</Label>
                          <Select value={newRule.type} onValueChange={(v) => setNewRule({ ...newRule, type: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="leave_accrual">Leave Accrual</SelectItem>
                              <SelectItem value="contract_alert">Contract Expiry Alert</SelectItem>
                              <SelectItem value="payroll_generation">Payroll Generation</SelectItem>
                              <SelectItem value="probation_alert">Probation Alert</SelectItem>
                              <SelectItem value="birthday_reminder">Birthday Reminder</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Schedule</Label>
                          <Select value={newRule.schedule} onValueChange={(v) => setNewRule({ ...newRule, schedule: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button className="w-full" onClick={() => { createRule.mutate(newRule); setNewRule({ name: "", type: "leave_accrual", schedule: "monthly", config: "{}" }); }}>
                          Create Rule
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {!rules || rules.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No automation rules configured. Create one to get started.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Schedule</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.map((rule: any) => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium">{rule.name}</TableCell>
                          <TableCell><Badge variant="outline">{rule.type}</Badge></TableCell>
                          <TableCell>{rule.schedule}</TableCell>
                          <TableCell>
                            <Switch
                              checked={!!rule.is_active}
                              onCheckedChange={(v) => updateRule.mutate({ id: rule.id, isActive: v })}
                            />
                          </TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteRule.mutate({ id: rule.id })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quick Actions Tab */}
          <TabsContent value="actions">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Leave Accrual */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" /> Leave Accrual
                  </CardTitle>
                  <CardDescription>Run monthly leave accrual for all active employees</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => runLeaveAccrual.mutate({ leaveType: "annual", accrualDays: 1.75 })}
                    disabled={runLeaveAccrual.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" /> Run Accrual (1.75 days)
                  </Button>
                </CardContent>
              </Card>

              {/* Payroll Generation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-500" /> Generate Payroll
                  </CardTitle>
                  <CardDescription>Auto-generate payroll for all active employees</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label>Month</Label>
                      <Select value={String(payrollMonth)} onValueChange={(v) => setPayrollMonth(parseInt(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              {new Date(2024, i).toLocaleString("default", { month: "long" })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Label>Year</Label>
                      <Input type="number" value={payrollYear} onChange={(e) => setPayrollYear(parseInt(e.target.value))} />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => generatePayroll.mutate({ month: payrollMonth, year: payrollYear })}
                    disabled={generatePayroll.isPending}
                  >
                    <Play className="h-4 w-4 mr-1" /> Generate Payroll
                  </Button>
                </CardContent>
              </Card>

              {/* Run All Automation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-500" /> Run All Automation
                  </CardTitle>
                  <CardDescription>Execute all active automation rules at once</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => runAutomation.mutate()}
                    disabled={runAutomation.isPending}
                  >
                    <Play className="h-4 w-4 mr-1" /> Execute All Rules
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Automation Logs</CardTitle>
              </CardHeader>
              <CardContent>
                {!logs || logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No automation logs yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rule</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Executed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.rule_name}</TableCell>
                          <TableCell>
                            <Badge variant={log.status === "success" ? "default" : "destructive"}>
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{log.result}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {log.executed_at ? new Date(log.executed_at).toLocaleString() : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ModuleLayout>
  );
}
