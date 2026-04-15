import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatsCard } from "@/components/ui/stats-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Briefcase, Plus, Pencil, Trash2, Users, CheckCircle, Clock, UserPlus } from "lucide-react";

const JOB_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "on_hold", label: "On Hold" },
];

const JOB_TYPES = [
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];

const APPLICANT_STAGES = [
  { value: "applied", label: "Applied", color: "bg-blue-100 text-blue-800" },
  { value: "screening", label: "Screening", color: "bg-yellow-100 text-yellow-800" },
  { value: "interview", label: "Interview", color: "bg-purple-100 text-purple-800" },
  { value: "assessment", label: "Assessment", color: "bg-indigo-100 text-indigo-800" },
  { value: "offer", label: "Offer", color: "bg-green-100 text-green-800" },
  { value: "hired", label: "Hired", color: "bg-emerald-100 text-emerald-800" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-800" },
];

export default function RecruitmentPage() {
  const [tab, setTab] = useState("postings");
  const [showJobForm, setShowJobForm] = useState(false);
  const [showAppForm, setShowAppForm] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [editingApp, setEditingApp] = useState<any>(null);
  const [filterJobStatus, setFilterJobStatus] = useState("all");
  const [filterAppStage, setFilterAppStage] = useState("all");

  const statsQ = trpc.recruitment.stats.useQuery();
  const postingsQ = trpc.recruitment.listPostings.useQuery({ status: filterJobStatus === "all" ? undefined : filterJobStatus });
  const applicantsQ = trpc.recruitment.listApplicants.useQuery({ stage: filterAppStage === "all" ? undefined : filterAppStage });

  const createJobMut = trpc.recruitment.createPosting.useMutation({ onSuccess() { toast.success("Job posted"); postingsQ.refetch(); statsQ.refetch(); closeJobForm(); } });
  const updateJobMut = trpc.recruitment.updatePosting.useMutation({ onSuccess() { toast.success("Job updated"); postingsQ.refetch(); statsQ.refetch(); closeJobForm(); } });
  const deleteJobMut = trpc.recruitment.deletePosting.useMutation({ onSuccess() { toast.success("Job deleted"); postingsQ.refetch(); statsQ.refetch(); } });

  const createAppMut = trpc.recruitment.createApplicant.useMutation({ onSuccess() { toast.success("Applicant added"); applicantsQ.refetch(); statsQ.refetch(); closeAppForm(); } });
  const updateAppMut = trpc.recruitment.updateApplicant.useMutation({ onSuccess() { toast.success("Applicant updated"); applicantsQ.refetch(); statsQ.refetch(); closeAppForm(); } });
  const deleteAppMut = trpc.recruitment.deleteApplicant.useMutation({ onSuccess() { toast.success("Applicant removed"); applicantsQ.refetch(); statsQ.refetch(); } });

  // Job form
  const emptyJob = { title: "", department: "", location: "", type: "full_time", description: "", requirements: "", salaryMin: "", salaryMax: "", status: "draft", closingDate: "" };
  const [jobForm, setJobForm] = useState(emptyJob);
  const closeJobForm = () => { setShowJobForm(false); setEditingJob(null); setJobForm(emptyJob); };

  // Applicant form
  const emptyApp = { jobPostingId: "", firstName: "", lastName: "", email: "", phone: "", resumeUrl: "", stage: "applied", notes: "" };
  const [appForm, setAppForm] = useState(emptyApp);
  const closeAppForm = () => { setShowAppForm(false); setEditingApp(null); setAppForm(emptyApp); };

  const openEditJob = (j: any) => {
    setEditingJob(j);
    setJobForm({
      title: j.title, department: j.department || "", location: j.location || "",
      type: j.type || "full_time", description: j.description || "", requirements: j.requirements || "",
      salaryMin: j.salaryMin?.toString() || "", salaryMax: j.salaryMax?.toString() || "",
      status: j.status || "draft", closingDate: j.closingDate ? j.closingDate.slice(0, 10) : "",
    });
    setShowJobForm(true);
  };

  const openEditApp = (a: any) => {
    setEditingApp(a);
    setAppForm({
      jobPostingId: a.jobPostingId, firstName: a.firstName, lastName: a.lastName,
      email: a.email || "", phone: a.phone || "", resumeUrl: a.resumeUrl || "",
      stage: a.stage || "applied", notes: a.notes || "",
    });
    setShowAppForm(true);
  };

  const stats = statsQ.data || { totalPostings: 0, openPostings: 0, totalApplicants: 0, hiredCount: 0 };

  return (
    <ModuleLayout
      title="Recruitment"
      description="Manage job postings and track applicants through the hiring pipeline"
      icon={<Briefcase className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "HR", href: "/hr" }, { label: "Recruitment" }]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatsCard label="Total Postings" value={stats.totalPostings} icon={<Briefcase className="h-5 w-5 text-blue-500" />} />
          <StatsCard label="Open Positions" value={stats.openPostings} icon={<Clock className="h-5 w-5 text-amber-500" />} />
          <StatsCard label="Total Applicants" value={stats.totalApplicants} icon={<Users className="h-5 w-5 text-purple-500" />} />
          <StatsCard label="Hired" value={stats.hiredCount} icon={<CheckCircle className="h-5 w-5 text-green-500" />} />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="postings">Job Postings</TabsTrigger>
            <TabsTrigger value="applicants">Applicants</TabsTrigger>
          </TabsList>

          {/* POSTINGS TAB */}
          <TabsContent value="postings" className="space-y-4">
            <div className="flex items-center justify-between">
              <Select value={filterJobStatus} onValueChange={setFilterJobStatus}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {JOB_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={() => { setJobForm(emptyJob); setEditingJob(null); setShowJobForm(true); }}><Plus className="h-4 w-4 mr-2" /> New Job Posting</Button>
            </div>
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Closing Date</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(postingsQ.data || []).length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No job postings found</TableCell></TableRow>
                  )}
                  {(postingsQ.data || []).map((j: any) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-medium">{j.title}</TableCell>
                      <TableCell>{j.department || "-"}</TableCell>
                      <TableCell><Badge variant="outline">{JOB_TYPES.find((t) => t.value === j.type)?.label || j.type}</Badge></TableCell>
                      <TableCell>{j.location || "-"}</TableCell>
                      <TableCell><Badge variant={j.status === "open" ? "default" : "secondary"}>{JOB_STATUSES.find((s) => s.value === j.status)?.label || j.status}</Badge></TableCell>
                      <TableCell>{j.closingDate ? new Date(j.closingDate).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditJob(j)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete posting?")) deleteJobMut.mutate({ id: j.id }); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          {/* APPLICANTS TAB */}
          <TabsContent value="applicants" className="space-y-4">
            <div className="flex items-center justify-between">
              <Select value={filterAppStage} onValueChange={setFilterAppStage}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {APPLICANT_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={() => { setAppForm(emptyApp); setEditingApp(null); setShowAppForm(true); }}><UserPlus className="h-4 w-4 mr-2" /> Add Applicant</Button>
            </div>
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Job Posting</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(applicantsQ.data || []).length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No applicants found</TableCell></TableRow>
                  )}
                  {(applicantsQ.data || []).map((a: any) => {
                    const stageMeta = APPLICANT_STAGES.find((s) => s.value === a.stage);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.firstName} {a.lastName}</TableCell>
                        <TableCell>{a.email || "-"}</TableCell>
                        <TableCell>{a.jobTitle || "-"}</TableCell>
                        <TableCell><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stageMeta?.color || "bg-gray-100 text-gray-800"}`}>{stageMeta?.label || a.stage}</span></TableCell>
                        <TableCell>{a.appliedDate ? new Date(a.appliedDate).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditApp(a)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete applicant?")) deleteAppMut.mutate({ id: a.id }); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>

        {/* Job Posting Dialog */}
        <Dialog open={showJobForm} onOpenChange={(v) => { if (!v) closeJobForm(); }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingJob ? "Edit Job Posting" : "New Job Posting"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><label className="text-sm font-medium">Title *</label><Input className="mt-1" value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Department</label><Input className="mt-1" value={jobForm.department} onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Location</label><Input className="mt-1" value={jobForm.location} onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Job Type</label>
                  <Select value={jobForm.type} onValueChange={(v) => setJobForm({ ...jobForm, type: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{JOB_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={jobForm.status} onValueChange={(v) => setJobForm({ ...jobForm, status: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{JOB_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Salary Min</label><Input type="number" className="mt-1" value={jobForm.salaryMin} onChange={(e) => setJobForm({ ...jobForm, salaryMin: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Salary Max</label><Input type="number" className="mt-1" value={jobForm.salaryMax} onChange={(e) => setJobForm({ ...jobForm, salaryMax: e.target.value })} /></div>
              </div>
              <div><label className="text-sm font-medium">Closing Date</label><Input type="date" className="mt-1" value={jobForm.closingDate} onChange={(e) => setJobForm({ ...jobForm, closingDate: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Description</label><Textarea className="mt-1" rows={3} value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Requirements</label><Textarea className="mt-1" rows={3} value={jobForm.requirements} onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeJobForm}>Cancel</Button>
                <Button onClick={() => {
                  if (!jobForm.title) { toast.error("Job title is required"); return; }
                  const data: any = { ...jobForm, salaryMin: jobForm.salaryMin ? Number(jobForm.salaryMin) : undefined, salaryMax: jobForm.salaryMax ? Number(jobForm.salaryMax) : undefined };
                  if (editingJob) updateJobMut.mutate({ id: editingJob.id, ...data });
                  else createJobMut.mutate(data);
                }}>{editingJob ? "Update" : "Create"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Applicant Dialog */}
        <Dialog open={showAppForm} onOpenChange={(v) => { if (!v) closeAppForm(); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingApp ? "Edit Applicant" : "Add Applicant"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Job Posting *</label>
                <select className="w-full mt-1 border rounded-md px-3 py-2 text-sm" value={appForm.jobPostingId} onChange={(e) => setAppForm({ ...appForm, jobPostingId: e.target.value })}>
                  <option value="">Select job posting...</option>
                  {(postingsQ.data || []).map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">First Name *</label><Input className="mt-1" value={appForm.firstName} onChange={(e) => setAppForm({ ...appForm, firstName: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Last Name *</label><Input className="mt-1" value={appForm.lastName} onChange={(e) => setAppForm({ ...appForm, lastName: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Email</label><Input type="email" className="mt-1" value={appForm.email} onChange={(e) => setAppForm({ ...appForm, email: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Phone</label><Input className="mt-1" value={appForm.phone} onChange={(e) => setAppForm({ ...appForm, phone: e.target.value })} /></div>
              </div>
              <div>
                <label className="text-sm font-medium">Stage</label>
                <Select value={appForm.stage} onValueChange={(v) => setAppForm({ ...appForm, stage: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{APPLICANT_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium">Notes</label><Textarea className="mt-1" rows={2} value={appForm.notes} onChange={(e) => setAppForm({ ...appForm, notes: e.target.value })} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeAppForm}>Cancel</Button>
                <Button onClick={() => {
                  if (!appForm.jobPostingId || !appForm.firstName || !appForm.lastName) { toast.error("Job posting, first name, and last name are required"); return; }
                  if (editingApp) updateAppMut.mutate({ id: editingApp.id, ...appForm });
                  else createAppMut.mutate(appForm as any);
                }}>{editingApp ? "Update" : "Add"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleLayout>
  );
}
