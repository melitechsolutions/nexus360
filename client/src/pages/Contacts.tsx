import { ModuleLayout } from "@/components/ModuleLayout";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { buildCommunicationComposePath } from "@/lib/communications";
import { downloadCSV } from "@/lib/export-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  Mail,
  Phone,
  Building2,
  Copy,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { PaginationControls, usePagination } from "@/components/ui/data-table-controls";
import { ListPageToolbar } from "@/components/list-page/ListPageToolbar";
import { RowActionsMenu, actionIcons } from "@/components/list-page/RowActionsMenu";
import { TableColumnSettings, useColumnVisibility, type ColumnConfig } from "@/components/list-page/TableColumnSettings";
import { EnhancedBulkActions, bulkExportAction, bulkCopyIdsAction, bulkDeleteAction, bulkEmailAction } from "@/components/list-page/EnhancedBulkActions";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface ContactFormData {
  clientId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  department?: string;
  isPrimary?: boolean;
  notes?: string;
  address?: string;
  city?: string;
  country?: string;
}

const emptyForm: ContactFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  mobile: "",
  jobTitle: "",
  department: "",
  isPrimary: false,
  notes: "",
  address: "",
  city: "",
  country: "",
};

export default function Contacts() {
  const [location, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactFormData>(emptyForm);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  const contactColumns: ColumnConfig[] = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "jobTitle", label: "Job Title" },
    { key: "department", label: "Department" },
    { key: "city", label: "City" },
    { key: "country", label: "Country" },
  ];
  const { visibleColumns, toggleColumn, isVisible, pageSize: colPageSize, updatePageSize, reset } = useColumnVisibility(contactColumns, "contacts");

  const { page, pageSize, setPage, setPageSize, paginate, resetPage } = usePagination(25);

  const utils = trpc.useUtils();

  const { data: clients = [] } = trpc.clients.list.useQuery();
  const clientsArr = Array.isArray(clients) ? clients : (clients as any)?.items ?? [];

  const listQuery = trpc.contacts.list.useQuery(
    { search: search || undefined, limit: 1000 },
    { keepPreviousData: true }
  );

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: () => {
      toast.success("Contact created");
      utils.contacts.list.invalidate();
      setShowDialog(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      toast.success("Contact updated");
      utils.contacts.list.invalidate();
      setShowDialog(false);
      setForm(emptyForm);
      setEditingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      toast.success("Contact deleted");
      utils.contacts.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkDeleteMutation = trpc.contacts.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} contact(s) deleted`);
      utils.contacts.list.invalidate();
      setSelectedContacts(new Set());
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.firstName || !form.lastName) {
      toast.error("First and last name are required");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (contact: any) => {
    setEditingId(contact.id);
    setForm({
      clientId: contact.clientId || "",
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email || "",
      phone: contact.phone || "",
      mobile: contact.mobile || "",
      jobTitle: contact.jobTitle || "",
      department: contact.department || "",
      isPrimary: contact.isPrimary === 1,
      notes: contact.notes || "",
      address: contact.address || "",
      city: contact.city || "",
      country: contact.country || "",
    });
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this contact?")) {
      deleteMutation.mutate(id);
    }
  };

  const contacts = listQuery.data?.data || [];
  const pagedContacts = paginate(contacts);

  return (
    <ModuleLayout
      title="Contacts"
      description="Manage contacts across your organisation"
      icon={<Users className="h-6 w-6" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Contacts" }]}
      actions={
        <Button
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm);
            setShowDialog(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Contact
        </Button>
      }
    >
      <div className="space-y-6">

        {/* Toolbar */}
        <ListPageToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search contacts..."
          onCreateClick={() => { setEditingId(null); setForm(emptyForm); setShowDialog(true); }}
          createLabel="Add Contact"
          onExportClick={() => downloadCSV(contacts, "contacts")}
          onPrintClick={() => window.print()}
          showImport={false}
        />

        {/* Bulk actions */}
        <EnhancedBulkActions
          selectedCount={selectedContacts.size}
          onClear={() => setSelectedContacts(new Set())}
          actions={[
            bulkExportAction(selectedContacts, contacts, contactColumns, "contacts"),
            bulkCopyIdsAction(selectedContacts),
            bulkEmailAction(navigate),
            bulkDeleteAction(selectedContacts, (ids) => bulkDeleteMutation.mutate(ids)),
          ]}
        />

        {/* Table */}
        {listQuery.isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : contacts.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              No contacts found. Create your first contact to get started.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="text-sm text-muted-foreground">{contacts.length} contacts</span>
                <TableColumnSettings columns={contactColumns} visibleColumns={visibleColumns} onToggleColumn={toggleColumn} onReset={reset} pageSize={pageSize} onPageSizeChange={updatePageSize} />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={selectedContacts.size === pagedContacts.length && pagedContacts.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedContacts(new Set(pagedContacts.map((c: any) => c.id)));
                            else setSelectedContacts(new Set());
                          }}
                          className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedContacts.map((contact: any) => (
                      <TableRow key={contact.id} className={selectedContacts.has(contact.id) ? "bg-primary/5" : ""}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedContacts.has(contact.id)}
                            onChange={() => {
                              const next = new Set(selectedContacts);
                              if (next.has(contact.id)) next.delete(contact.id);
                              else next.add(contact.id);
                              setSelectedContacts(next);
                            }}
                            className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                            aria-label={`Select ${contact.firstName}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                              {contact.firstName?.[0]}{contact.lastName?.[0]}
                            </div>
                            {contact.firstName} {contact.lastName}
                            {contact.isPrimary === 1 && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Primary</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {contact.email && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" /> {contact.email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.phone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" /> {contact.phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{contact.jobTitle || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {contact.department && (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" /> {contact.department}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{contact.city || "—"}</TableCell>
                        <TableCell className="text-right">
                          <RowActionsMenu
                            primaryActions={[
                              { label: "View", icon: actionIcons.view, onClick: () => navigate(`/contacts/${contact.id}`) },
                              { label: "Edit", icon: actionIcons.edit, onClick: () => handleEdit(contact) },
                              { label: "Delete", icon: actionIcons.delete, onClick: () => handleDelete(contact.id), variant: "destructive" },
                            ]}
                            menuActions={[
                              { label: "Send Email", icon: actionIcons.email, onClick: () => navigate(buildCommunicationComposePath(location, contact.email)) },
                              { label: "Duplicate Contact", icon: actionIcons.copy, onClick: () => navigate(`/contacts/create?clone=${contact.id}`), separator: true },
                              { label: "Add to Client", icon: <UserPlus className="h-4 w-4" />, onClick: () => navigate(`/contacts/${contact.id}/edit`) },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <PaginationControls
                total={contacts.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); resetPage(); }}
                className="px-2"
              />
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />{editingId ? "Edit Contact" : "New Contact"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5">

              {/* Company Link */}
              <div className="space-y-2">
                <Label>Company / Client</Label>
                <Select
                  value={form.clientId || ""}
                  onValueChange={(v) => setForm({ ...form, clientId: v || undefined })}
                >
                  <SelectTrigger><SelectValue placeholder="Link to a client company (optional)" /></SelectTrigger>
                  <SelectContent className="max-h-56 overflow-y-auto">
                    <SelectItem value="none">— No company —</SelectItem>
                    {clientsArr.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.companyName || c.contactPerson}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Personal Info */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personal Information</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>First Name <span className="text-destructive">*</span></Label>
                  <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="e.g., John" />
                </div>
                <div className="space-y-1">
                  <Label>Last Name <span className="text-destructive">*</span></Label>
                  <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="e.g., Kamau" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Job Title</Label>
                  <Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="e.g., Chief Finance Officer" />
                </div>
                <div className="space-y-1">
                  <Label>Department</Label>
                  <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g., Finance, Operations" />
                </div>
              </div>

              <Separator />

              {/* Contact Details */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Email Address</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@company.com" />
                </div>
                <div className="space-y-1">
                  <Label>Phone (Office)</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254 20 123 4567" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Mobile / WhatsApp</Label>
                  <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="+254 7XX XXX XXX" />
                </div>
                <div className="space-y-1">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Nairobi" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Country</Label>
                  <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Kenya" />
                </div>
                <div className="space-y-1">
                  <Label>Physical Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, Building, Floor" />
                </div>
              </div>

              <Separator />

              {/* Notes & Options */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes & Settings</p>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Background, preferences, relationship history, or anything useful about this contact..."
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={form.isPrimary}
                  onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
                  className="h-4 w-4 cursor-pointer"
                  title="Set as primary contact"
                />
                <Label htmlFor="isPrimary" className="cursor-pointer">Set as Primary Contact for this company</Label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? "Update Contact" : "Create Contact"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleLayout>
  );
}
