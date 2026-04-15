import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, FileText, PieChart, Calculator } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default function TaxCompliancePage() {
  const [from, setFrom] = useState<string>(new Date().toISOString().slice(0,10));
  const [to, setTo] = useState<string>(new Date().toISOString().slice(0,10));
  const [employeeId, setEmployeeId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");

  const paye = trpc.taxCompliance.getPAYEReport.useQuery({ from: new Date(from), to: new Date(to), employeeId: employeeId || undefined, departmentId: departmentId || undefined }, { enabled: !!from && !!to });
  const nssf = trpc.taxCompliance.getNSSFReport.useQuery({ from: new Date(from), to: new Date(to), employeeId: employeeId || undefined, departmentId: departmentId || undefined }, { enabled: !!from && !!to });
  const shif = trpc.taxCompliance.getSHIFReport.useQuery({ from: new Date(from), to: new Date(to), employeeId: employeeId || undefined, departmentId: departmentId || undefined }, { enabled: !!from && !!to });
  const housing = trpc.taxCompliance.getHousingLevyReport.useQuery({ from: new Date(from), to: new Date(to), employeeId: employeeId || undefined, departmentId: departmentId || undefined }, { enabled: !!from && !!to });

  const kraExport = trpc.taxCompliance.getKRAFilingFormat.useQuery({ from: new Date(from), to: new Date(to) }, { enabled: false });
  const ytd = trpc.taxCompliance.getYearToDateSummary.useQuery({ employeeId: employeeId || undefined }, { enabled: false });

  const handleDownloadKRA = async () => {
    try {
      const resp: any = await kraExport.refetch();
      if (!resp || !resp.data) {
        toast.error('No KRA data available for selected range');
        return;
      }
      const bytes = Uint8Array.from(atob(resp.data), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KRA_${from}_${to}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('KRA file downloaded');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to download KRA file');
    }
  };

  const handleYTD = async () => {
    try {
      const resp = await ytd.refetch();
      toast.success('YTD summary fetched');
    } catch (err: any) {
      toast.error('Failed to fetch YTD summary');
    }
  };

  return (
    <ModuleLayout
      title="Tax Compliance"
      description="Generate PAYE, NSSF, SHIF and KRA reports"
      icon={<Calculator className="h-6 w-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Finance", href: "/accounting" },
        { label: "Tax Compliance" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadKRA}><Download className="mr-2 h-4 w-4"/>Download KRA CSV</Button>
          <Button onClick={handleYTD}><FileText className="mr-2 h-4 w-4"/>YTD Summary</Button>
        </div>
      }
    >
      <div className="space-y-6">

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Select date range and optional filters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">From</label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">To</label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Employee ID (optional)</label>
                <Input placeholder="Employee ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Department ID (optional)</label>
                <Input placeholder="Department ID" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>PAYE Withholdings</CardTitle>
            </CardHeader>
            <CardContent>
              {paye.isLoading ? <p>Loading...</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Total PAYE</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {Array.isArray(paye.data) && paye.data.map((r: any) => (
                      <TableRow key={r.month}><TableCell>{r.month}</TableCell><TableCell className="text-right">Ksh {Math.round(r.totalPayee/100).toLocaleString()}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>NSSF</CardTitle>
            </CardHeader>
            <CardContent>
              {nssf.isLoading ? <p>Loading...</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Total NSSF</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {Array.isArray(nssf.data) && nssf.data.map((r: any) => (
                      <TableRow key={r.month}><TableCell>{r.month}</TableCell><TableCell className="text-right">Ksh {Math.round(r.totalNSSF/100).toLocaleString()}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>SHIF</CardTitle>
            </CardHeader>
            <CardContent>
              {shif.isLoading ? <p>Loading...</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Total SHIF</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {Array.isArray(shif.data) && shif.data.map((r: any) => (
                      <TableRow key={r.month}><TableCell>{r.month}</TableCell><TableCell className="text-right">Ksh {Math.round(r.totalSHIF/100).toLocaleString()}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Housing Levy</CardTitle>
            </CardHeader>
            <CardContent>
              {housing.isLoading ? <p>Loading...</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Total Housing Levy</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {Array.isArray(housing.data) && housing.data.map((r: any) => (
                      <TableRow key={r.month}><TableCell>{r.month}</TableCell><TableCell className="text-right">Ksh {Math.round(r.totalHousing/100).toLocaleString()}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
