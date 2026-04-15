import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { type ClientFilters } from "@/components/SearchAndFilter";
import { trpc } from "@/lib/trpc";
import { exportToCsv } from "@/utils/exportCsv";
import { buildCommunicationComposePath } from "@/lib/communications";
import {
  Users,
  Plus,
  Mail,
  Phone,
  Building2,
  MapPin,
  Eye,
  Edit,
  Trash2,
  Search,
  Loader2,
  DollarSign,
  CheckSquare,
  ArrowUpDown,
  Copy,
  Pencil,
  Activity,
  FileText,
  FolderOpen,
} from "lucide-react";
import { computeHealthScoreForClient } from "@/lib/healthScore";
import { PaginationControls, BulkActionsBar, usePagination, useTableSelection } from "@/components/ui/data-table-controls";
import { ListPageToolbar } from "@/components/list-page/ListPageToolbar";
import { SummaryStatCards, type SummaryCard } from "@/components/list-page/SummaryStatCards";
import { TableColumnSettings, useColumnVisibility, type ColumnConfig } from "@/components/list-page/TableColumnSettings";
import { RowActionsMenu, actionIcons } from "@/components/list-page/RowActionsMenu";
import { EnhancedBulkActions, bulkExportAction, bulkCopyIdsAction, bulkDeleteAction, bulkEmailAction } from "@/components/list-page/EnhancedBulkActions";

const COLUMNS: ColumnConfig[] = [
  { key: "client", label: "Client", defaultVisible: true },
  { key: "contact", label: "Contact", defaultVisible: true },
  { key: "company", label: "Company", defaultVisible: true },
  { key: "phone", label: "Phone", defaultVisible: false },
  { key: "address", label: "Address", defaultVisible: false },
  { key: "tags", label: "Tags", defaultVisible: true },
  { key: "category", label: "Category", defaultVisible: true },
  { key: "projects", label: "Projects", defaultVisible: true },
  { key: "revenue", label: "Revenue", defaultVisible: true },
  { key: "health", label: "Health", defaultVisible: true },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "accountOwner", label: "Account Owner", defaultVisible: false },
];

function computeClientHealth(clientId: string, invoices: any[], projects: any[]) {
  return computeHealthScoreForClient(clientId, invoices, projects);
}

interface ClientDisplay {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  status: "active" | "inactive";
  projects: number;
  totalRevenue: number;
}

export default function Clients() {
  // CALL ALL HOOKS UNCONDITIONALLY AT TOP LEVEL
  const { allowed, isLoading } = useRequireFeature("clients:view");
  
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ClientFilters>({
    status: "all",
    type: "all",
    sortBy: "name",
    sortOrder: "asc",
  });

  // Pagination & selection (all hooks must be unconditional)
  const { page, pageSize, setPage, setPageSize, paginate, resetPage } = usePagination(25);
  const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(COLUMNS, "clients");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    postalCode: "",
    taxId: "",
    website: "",
    industry: "",
    status: "active" as const,
    notes: "",
    createClientLogin: false,
    clientPassword: "",
  });

  // Fetch clients from backend
  const { data: clientsData = [], isLoading: clientsLoading } = trpc.clients.list.useQuery();
  const { data: projectsData = [] } = trpc.projects.list.useQuery();
  const { data: invoicesData = [] } = trpc.invoices.list.useQuery();
  const utils = trpc.useUtils();
  
  // Delete mutation
  const deleteClientMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      toast.success("Client deleted successfully");
      utils.clients.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete client");
    },
  });

  const bulkDeleteMutation = trpc.clients.bulkDelete.useMutation({
    onError: (error) => {
      toast.error(error.message || "Failed to delete clients");
    },
  });

  const updateClientMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      toast.success("Client updated");
      utils.clients.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update client");
    },
  });
  
  const createClientMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      toast.success("Client added successfully!");
      setIsDialogOpen(false);
      setNewClient({
        companyName: "",
        contactPerson: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        country: "",
        postalCode: "",
        taxId: "",
        website: "",
        industry: "",
        status: "active",
        notes: "",
        createClientLogin: false,
        clientPassword: "",
      });
      utils.clients.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to add client: ${error.message}`);
    },
  });

  // Convert frozen Drizzle objects to plain JS for React dependencies
  const plainClientsData = Array.isArray(clientsData)
    ? clientsData.map((client: any) => JSON.parse(JSON.stringify(client)))
    : [];
  const plainProjectsData = Array.isArray(projectsData)
    ? projectsData.map((project: any) => JSON.parse(JSON.stringify(project)))
    : [];
  const plainInvoicesData = Array.isArray(invoicesData)
    ? invoicesData.map((invoice: any) => JSON.parse(JSON.stringify(invoice)))
    : [];

  // Transform backend data to display format with revenue and project counts
  const clients: ClientDisplay[] = useMemo(() => {
    if (!Array.isArray(plainClientsData)) return [];
    
    return plainClientsData.map((client: any) => {
      const clientProjects = plainProjectsData.filter((p: any) => p.clientId === client.id).length;
      const clientRevenue = plainInvoicesData
        .filter((inv: any) => inv.clientId === client.id)
        .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

      return {
        id: client.id,
        name: client.contactPerson || client.companyName,
        email: client.email || "",
        phone: client.phone || "",
        company: client.companyName,
        address: client.address || "",
        status: (client.status || "active") as "active" | "inactive",
        projects: clientProjects,
        totalRevenue: clientRevenue / 100,
      };
    });
  }, [plainClientsData, plainProjectsData, plainInvoicesData]);

  const filteredClients = clients
    .filter(
      (client) =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let aVal: any = a[filters.sortBy as keyof ClientDisplay];
      let bVal: any = b[filters.sortBy as keyof ClientDisplay];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return filters.sortOrder === "desc" ? -comparison : comparison;
    });

  const pagedClients = paginate(filteredClients);
  const selection = useTableSelection(pagedClients.map((c) => c.id));

  // Reset page when search or filters change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { resetPage(); }, [searchQuery, filters.sortBy, filters.sortOrder, filters.status]);

  const handleAddClient = () => {
    if (!newClient.companyName || !newClient.contactPerson) {
      toast.error("Please fill in required fields (Company Name and Contact Person)");
      return;
    }
    
    const mutation = {
      companyName: newClient.companyName,
      contactPerson: newClient.contactPerson,
      email: newClient.email || undefined,
      phone: newClient.phone || undefined,
      address: newClient.address || undefined,
      city: newClient.city || undefined,
      country: newClient.country || undefined,
      postalCode: newClient.postalCode || undefined,
      taxId: newClient.taxId || undefined,
      website: newClient.website || undefined,
      industry: newClient.industry || undefined,
      status: (newClient.status || "active") as "active" | "inactive" | "prospect" | "archived",
      notes: newClient.notes || undefined,
      createClientLogin: newClient.createClientLogin || undefined,
      clientPassword: newClient.clientPassword || undefined,
    };
    createClientMutation.mutate(mutation);
  };

  const handleViewClient = (clientId: string) => {
    navigate(`/clients/${clientId}`);
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (confirm(`Are you sure you want to delete ${clientName}?`)) {
      deleteClientMutation.mutate(clientId);
    }
  };

  const totalRevenue = clients.reduce((sum, client) => sum + client.totalRevenue, 0);
  const totalProjects = clients.reduce((sum, client) => sum + client.projects, 0);

  // NOW SAFE TO CHECK CONDITIONAL RETURNS (ALL HOOKS ALREADY CALLED)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <ModuleLayout
      title="Clients"
      icon={<Users className="w-6 h-6" />}
      breadcrumbs={[
        { label: "App", href: "/crm-home" },
        { label: "Clients" },
      ]}
      actions={
        <ListPageToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search clients..."
          onCreateClick={() => setIsDialogOpen(true)}
          createLabel="New Client"
          onExportClick={() => {
            if (!clients.length) { toast.warning("No clients to export"); return; }
            exportToCsv("clients", clients.map((c: any) => ({
              Name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
              Company: c.company ?? "",
              Email: c.email ?? "",
              Phone: c.phone ?? "",
              Category: c.category ?? "",
              Status: c.status ?? "",
            })));
            toast.success("Clients exported");
          }}
          onImportClick={() => toast.info("CSV import is available in Settings > Data Management")}
          onPrintClick={() => window.print()}
        />
      }
    >
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Enter the client's information below
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Row 1: Company & Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={newClient.companyName}
                    onChange={(e) => setNewClient({ ...newClient, companyName: e.target.value })}
                    placeholder="Acme Corporation"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contactPerson">Contact Person *</Label>
                  <Input
                    id="contactPerson"
                    value={newClient.contactPerson}
                    onChange={(e) => setNewClient({ ...newClient, contactPerson: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
              </div>

              {/* Row 2: Email & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    placeholder="+254 700 000 000"
                  />
                </div>
              </div>

              {/* Row 3: Website & Industry */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={newClient.website}
                    onChange={(e) => setNewClient({ ...newClient, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={newClient.industry}
                    onChange={(e) => setNewClient({ ...newClient, industry: e.target.value })}
                    placeholder="Technology, Finance, etc."
                  />
                </div>
              </div>

              {/* Row 4: Address & City */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={newClient.address}
                    onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                    placeholder="123 Business Street"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={newClient.city}
                    onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
                    placeholder="Nairobi"
                  />
                </div>
              </div>

              {/* Row 5: Country & Postal Code */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={newClient.country}
                    onChange={(e) => setNewClient({ ...newClient, country: e.target.value })}
                    placeholder="Kenya"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={newClient.postalCode}
                    onChange={(e) => setNewClient({ ...newClient, postalCode: e.target.value })}
                    placeholder="00100"
                  />
                </div>
              </div>

              {/* Row 6: Tax ID & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input
                    id="taxId"
                    value={newClient.taxId}
                    onChange={(e) => setNewClient({ ...newClient, taxId: e.target.value })}
                    placeholder="P00123456789"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={newClient.status}
                    onChange={(e) => setNewClient({ ...newClient, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="prospect">Prospect</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Row 7: Notes */}
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={newClient.notes}
                  onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                  placeholder="Additional notes about this client"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              {/* Row 8: Client Login Creation */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="createClientLogin"
                    checked={newClient.createClientLogin}
                    onChange={(e) => setNewClient({ ...newClient, createClientLogin: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="createClientLogin">Create client login account</Label>
                </div>
                {newClient.createClientLogin && (
                  <div className="grid gap-2">
                    <Label htmlFor="clientPassword">Client Password (leave empty for auto-generated)</Label>
                    <Input
                      id="clientPassword"
                      type="password"
                      value={newClient.clientPassword}
                      onChange={(e) => setNewClient({ ...newClient, clientPassword: e.target.value })}
                      placeholder="Leave empty to auto-generate"
                    />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddClient} disabled={createClientMutation.isPending}>
                {createClientMutation.isPending ? "Adding..." : "Add Client"}
              </Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>

      <div className="space-y-6">
        {/* Summary Stat Cards */}
        <SummaryStatCards
          cards={[
            { label: "Clients", value: clients.length, color: "blue" },
            { label: "Projects", value: totalProjects, color: "green" },
            { label: "Invoices", value: `Ksh ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: "orange" },
            { label: "Payments", value: `Ksh ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: "purple" },
          ]}
        />

        {/* Clients Table */}
        <Card>
          <CardContent className="space-y-3 pt-4">
            {/* Bulk actions bar */}
            {selection.selectedIds.length > 0 && (
              <EnhancedBulkActions
                selectedCount={selection.selectedIds.length}
                onClear={selection.clear}
                actions={[
                  bulkExportAction(selection.selectedSet, pagedClients, [
                    { key: "name", label: "Client" },
                    { key: "email", label: "Email" },
                    { key: "company", label: "Company" },
                    { key: "phone", label: "Phone" },
                    { key: "status", label: "Status" },
                  ], "clients"),
                  bulkCopyIdsAction(selection.selectedSet),
                  bulkEmailAction(navigate, location),
                  bulkDeleteAction(selection.selectedSet, (ids) => {
                    bulkDeleteMutation.mutate(ids, {
                      onSuccess: (data) => {
                        toast.success(`${data.count} client(s) deleted`);
                        utils.clients.list.invalidate();
                        selection.clear();
                      },
                    });
                  }),
                ]}
              />
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  {isVisible("client") && (
                    <TableHead>
                      <span className="text-primary flex items-center gap-1 cursor-pointer">Client <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  )}
                  {isVisible("contact") && (
                    <TableHead>
                      <span className="text-primary flex items-center gap-1 cursor-pointer">Contact <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  )}
                  {isVisible("company") && (
                    <TableHead>
                      <span className="text-primary flex items-center gap-1 cursor-pointer">Company <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  )}
                  {isVisible("phone") && (
                    <TableHead>
                      <span className="text-primary flex items-center gap-1 cursor-pointer">Phone <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  )}
                  {isVisible("address") && (
                    <TableHead>
                      <span className="text-primary flex items-center gap-1 cursor-pointer">Address <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  )}
                  {isVisible("tags") && (
                    <TableHead>
                      <span className="text-primary flex items-center gap-1 cursor-pointer">Tags <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  )}
                  {isVisible("category") && (
                    <TableHead>
                      <span className="text-primary flex items-center gap-1 cursor-pointer">Category <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  )}
                  {isVisible("projects") && (
                    <TableHead>
                      <span className="text-primary flex items-center gap-1 cursor-pointer">Projects <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  )}
                  {isVisible("revenue") && (
                    <TableHead>
                      <span className="text-primary flex items-center gap-1 cursor-pointer">Revenue <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  )}
                  {isVisible("health") && (
                    <TableHead>
                      <span className="text-primary flex items-center gap-1 cursor-pointer">Health <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  )}
                  {isVisible("status") && (
                    <TableHead>
                      <span className="text-primary flex items-center gap-1 cursor-pointer">Status <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  )}
                  {isVisible("accountOwner") && (
                    <TableHead>
                      <span className="text-primary flex items-center gap-1 cursor-pointer">Account Owner <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  )}
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      Actions
                      <TableColumnSettings
                        columns={COLUMNS}
                        visibleColumns={visibleColumns}
                        onToggleColumn={toggleColumn}
                      />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientsLoading ? (
                  <TableRow>
                    <TableCell colSpan={COLUMNS.filter(c => isVisible(c.key)).length + 2} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : pagedClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLUMNS.filter(c => isVisible(c.key)).length + 2} className="text-center py-8 text-muted-foreground">
                      No clients found
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedClients.map((client) => (
                    <TableRow key={client.id} data-selected={selection.selectedSet.has(client.id)} className="data-[selected=true]:bg-primary/5">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selection.selectedSet.has(client.id)}
                          onChange={() => selection.toggle(client.id)}
                          className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                          aria-label={`Select ${client.name}`}
                        />
                      </TableCell>
                      {isVisible("client") && (
                        <TableCell>
                          <button
                            className="font-medium text-primary hover:underline cursor-pointer"
                            onClick={() => handleViewClient(client.id)}
                          >
                            {client.name}
                          </button>
                        </TableCell>
                      )}
                      {isVisible("contact") && (
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {client.email || "N/A"}
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {isVisible("company") && (
                        <TableCell className="truncate">{client.company}</TableCell>
                      )}
                      {isVisible("phone") && (
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {client.phone || "N/A"}
                          </div>
                        </TableCell>
                      )}
                      {isVisible("address") && (
                        <TableCell className="truncate max-w-[200px]">{client.address || "N/A"}</TableCell>
                      )}
                      {isVisible("tags") && (
                        <TableCell>
                          <span className="text-xs text-muted-foreground">—</span>
                        </TableCell>
                      )}
                      {isVisible("category") && (
                        <TableCell>
                          <span className="text-xs text-muted-foreground">—</span>
                        </TableCell>
                      )}
                      {isVisible("projects") && (
                        <TableCell>{client.projects}</TableCell>
                      )}
                      {isVisible("revenue") && (
                        <TableCell>Ksh {client.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      )}
                      {isVisible("health") && (
                        <TableCell>
                          {(() => {
                            const { score, label, color } = computeClientHealth(
                              client.id,
                              plainInvoicesData,
                              plainProjectsData
                            );
                            return (
                              <div className="flex items-center gap-2 min-w-[100px]">
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{ width: `${score}%`, background: color }}
                                  />
                                </div>
                                <span className="text-xs font-medium whitespace-nowrap" style={{ color }}>
                                  {label}
                                </span>
                              </div>
                            );
                          })()}
                        </TableCell>
                      )}
                      {isVisible("status") && (
                        <TableCell>
                          <Badge variant={client.status === "active" ? "default" : "secondary"}>
                            {client.status}
                          </Badge>
                        </TableCell>
                      )}
                      {isVisible("accountOwner") && (
                        <TableCell>
                          <span className="text-xs text-muted-foreground">—</span>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <RowActionsMenu
                          primaryActions={[
                            { label: "Delete", icon: actionIcons.delete, onClick: () => handleDeleteClient(client.id, client.name), variant: "destructive" },
                            { label: "Edit", icon: actionIcons.edit, onClick: () => navigate(`/clients/${client.id}/edit`) },
                            { label: "Email", icon: actionIcons.email, onClick: () => navigate(buildCommunicationComposePath(location, client.email, `Message for ${client.name}`)) },
                            { label: "View", icon: actionIcons.view, onClick: () => handleViewClient(client.id) },
                          ]}
                          menuActions={[
                            { label: "Client URL", icon: actionIcons.copy, onClick: () => { navigator.clipboard.writeText(`${window.location.origin}/clients/${client.id}`); toast.success("URL copied"); } },
                            { label: "Quick Edit", icon: actionIcons.edit, onClick: () => navigate(`/clients/${client.id}/edit`) },
                            { label: "Change Status", icon: <Activity className="h-4 w-4" />, onClick: () => { const newStatus = client.status === "active" ? "inactive" : "active"; updateClientMutation.mutate({ id: client.id, status: newStatus }); }, separator: true },
                            { label: "Change Category", icon: <FolderOpen className="h-4 w-4" />, onClick: () => navigate(`/clients/${client.id}/edit`) },
                            { label: "View Projects", icon: <Building2 className="h-4 w-4" />, onClick: () => navigate(`/clients/${client.id}?tab=projects`), separator: true },
                            { label: "View Invoices", icon: <FileText className="h-4 w-4" />, onClick: () => navigate(`/clients/${client.id}?tab=invoices`) },
                          ]}
                          showStar={true}
                          showDownload={true}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <PaginationControls
              total={filteredClients.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
