import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Plus, Edit2, Trash2, Search, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { format } from "date-fns";
import { StatsCard } from "@/components/ui/stats-card";

export default function Holidays() {
  useRequireFeature("hr:view");
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", date: "", type: "public" as "public" | "company" | "optional",
    description: "", isRecurring: true,
  });

  const holidays = trpc.holidays.list.useQuery({ year });
  const utils = trpc.useUtils();

  const createHoliday = trpc.holidays.create.useMutation({
    onSuccess: () => { toast.success("Holiday created"); closeForm(); utils.holidays.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateHoliday = trpc.holidays.update.useMutation({
    onSuccess: () => { toast.success("Holiday updated"); closeForm(); utils.holidays.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteHoliday = trpc.holidays.delete.useMutation({
    onSuccess: () => { toast.success("Deleted"); setDeleteId(null); utils.holidays.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ name: "", date: "", type: "public", description: "", isRecurring: true });
  };

  const openEdit = (h: any) => {
    setEditId(h.id);
    setForm({ name: h.name, date: h.date?.split("T")[0] || h.date, type: h.type || "public", description: h.description || "", isRecurring: !!h.isRecurring });
    setShowForm(true);
  };

  const handleSave = () => {
    if (editId) {
      updateHoliday.mutate({ id: editId, ...form });
    } else {
      createHoliday.mutate(form);
    }
  };

  const filtered = (holidays.data || []).filter((h: any) =>
    !search || h.name.toLowerCase().includes(search.toLowerCase())
  );

  const typeColors: Record<string, string> = { public: "default", company: "secondary", optional: "outline" };

  return (
    <ModuleLayout
      title="Holiday Calendar"
      description="Manage public and company holidays"
      icon={CalendarDays}
      breadcrumbs={[{ label: "HR", href: "/employees" }, { label: "Holidays" }]}
    >
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <StatsCard label="Total Holidays" value={filtered.length} icon={<Calendar className="h-5 w-5" />} color="border-l-blue-500" />
        <StatsCard label="Public Holidays" value={filtered.filter((h: any) => h.type === "public").length} icon={<CalendarDays className="h-5 w-5" />} color="border-l-green-500" />
        <StatsCard label="Company Holidays" value={filtered.filter((h: any) => h.type === "company").length} icon={<CalendarDays className="h-5 w-5" />} color="border-l-purple-500" />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search holidays..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" /> Add Holiday</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {holidays.isLoading ? (
            <div className="flex justify-center p-8"><Spinner /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recurring</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No holidays for {year}</TableCell></TableRow>
                ) : filtered.map((h: any) => {
                  const d = new Date(h.date);
                  return (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{h.name}</TableCell>
                      <TableCell>{format(d, "MMM d, yyyy")}</TableCell>
                      <TableCell>{format(d, "EEEE")}</TableCell>
                      <TableCell><Badge variant={typeColors[h.type] as any || "outline"}>{h.type}</Badge></TableCell>
                      <TableCell>{h.isRecurring ? "Yes" : "No"}</TableCell>
                      <TableCell className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(h)}><Edit2 className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(h.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Holiday" : "Add Holiday"}</DialogTitle>
            <DialogDescription>Add or edit a public/company holiday</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Holiday name" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
            <Input type="date" value={form.date} onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))} />
            <Select value={form.type} onValueChange={(v: any) => setForm(p => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public Holiday</SelectItem>
                <SelectItem value="company">Company Holiday</SelectItem>
                <SelectItem value="optional">Optional</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm(p => ({ ...p, isRecurring: e.target.checked }))} />
              Recurring annually
            </label>
            <Button className="w-full" disabled={!form.name || !form.date || createHoliday.isPending || updateHoliday.isPending} onClick={handleSave}>
              {(createHoliday.isPending || updateHoliday.isPending) ? <Spinner className="mr-2" /> : null}
              {editId ? "Update" : "Create"} Holiday
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Holiday?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteHoliday.mutate({ id: deleteId })}>Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </ModuleLayout>
  );
}
