import { useParams, useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Loader2,
  Users,
  DollarSign,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  ArrowLeft,
} from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { useCurrency } from "@/lib/currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function JobGroupDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { formatMoney } = useCurrency();

  const { data: jobGroup, isLoading } = trpc.jobGroups.getById.useQuery(id || "");
  const { data: employeesData = [] } = trpc.employees.list.useQuery();

  const allEmployees = employeesData as any[];
  const groupEmployees = allEmployees.filter(
    (e: any) => e.jobGroupId === id || e.job_group_id === id
  );

  const breadcrumbs = [
    { label: "Dashboard", href: "/" },
    { label: "HR", href: "/hr" },
    { label: "Job Groups", href: "/job-groups" },
    { label: (jobGroup as any)?.name || "Details" },
  ];

  if (isLoading) {
    return (
      <ModuleLayout
        title="Job Group Details"
        icon={<Building2 className="h-5 w-5" />}
        breadcrumbs={breadcrumbs}
        backLink={{ label: "Job Groups", href: "/job-groups" }}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ModuleLayout>
    );
  }

  if (!jobGroup) {
    return (
      <ModuleLayout
        title="Job Group Details"
        icon={<Building2 className="h-5 w-5" />}
        breadcrumbs={breadcrumbs}
        backLink={{ label: "Job Groups", href: "/job-groups" }}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Job group not found.</p>
          <Button onClick={() => navigate("/job-groups")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Job Groups
          </Button>
        </div>
      </ModuleLayout>
    );
  }

  const jg = jobGroup as any;
  const isActive = jg.isActive !== false && jg.isActive !== 0;
  const minSalary = Number(jg.minimumGrossSalary || 0);
  const maxSalary = Number(jg.maximumGrossSalary || 0);

  return (
    <ModuleLayout
      title={jg.name || "Job Group Details"}
      icon={<Building2 className="h-5 w-5" />}
      breadcrumbs={breadcrumbs}
      backLink={{ label: "Job Groups", href: "/job-groups" }}
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Employees</p>
                  <p className="text-2xl font-bold">{groupEmployees.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div>
                <p className="text-xs text-muted-foreground">Min Salary</p>
                <p className="text-lg font-bold text-green-600">{formatMoney(minSalary * 100)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div>
                <p className="text-xs text-muted-foreground">Max Salary</p>
                <p className="text-lg font-bold text-blue-600">{formatMoney(maxSalary * 100)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Job Group Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {jg.name}
              </CardTitle>
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? (
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Active</span>
                ) : (
                  <span className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Inactive</span>
                )}
              </Badge>
            </div>
            {jg.description && (
              <CardDescription>{jg.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Salary Range
                </p>
                <p className="font-semibold">
                  {minSalary > 0 || maxSalary > 0
                    ? `${formatMoney(minSalary * 100)} – ${formatMoney(maxSalary * 100)}`
                    : "Not set"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">Currency</p>
                <p className="font-semibold">{jg.currency || "KES"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employees in this Job Group */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employees in this Job Group
              <Badge variant="secondary" className="ml-1">{groupEmployees.length}</Badge>
            </CardTitle>
            <CardDescription>All employees assigned to the {jg.name} job group</CardDescription>
          </CardHeader>
          <CardContent>
            {groupEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <Users className="h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">No employees assigned to this job group yet.</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupEmployees.map((emp: any) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold shrink-0">
                              {(emp.firstName?.[0] || emp.name?.[0] || "?").toUpperCase()}
                            </div>
                            <span className="whitespace-nowrap">
                              {emp.firstName && emp.lastName
                                ? `${emp.firstName} ${emp.lastName}`
                                : emp.name || "Unknown"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {emp.position || emp.jobTitle || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {emp.department || "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {emp.email ? (
                            <a href={`mailto:${emp.email}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                              <Mail className="h-3 w-3" /> {emp.email}
                            </a>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={(emp.status || "active") === "active" ? "default" : "secondary"}
                            className="capitalize text-xs"
                          >
                            {emp.status || "active"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
