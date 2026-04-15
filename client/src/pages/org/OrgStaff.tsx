import React, { useState } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { OrgLayout } from "@/components/OrgLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { UserPlus, Trash2, ShieldOff, Users, CheckCircle2, XCircle } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "accountant", label: "Accountant" },
  { value: "hr", label: "HR" },
  { value: "staff", label: "Staff" },
  { value: "sales_manager", label: "Sales Manager" },
  { value: "project_manager", label: "Project Manager" },
  { value: "ict_manager", label: "ICT Manager" },
  { value: "procurement_manager", label: "Procurement Manager" },
] as const;

type RoleValue = typeof ROLE_OPTIONS[number]["value"];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "border-purple-500/30 bg-purple-500/10 text-purple-600",
  admin: "border-blue-500/30 bg-blue-500/10 text-blue-600",
  manager: "border-cyan-500/30 bg-cyan-500/10 text-cyan-600",
  accountant: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  hr: "border-green-500/30 bg-green-500/10 text-green-600",
  staff: "border-gray-500/30 bg-gray-500/10 text-gray-600",
  project_manager: "border-indigo-500/30 bg-indigo-500/10 text-indigo-600",
  sales_manager: "border-orange-500/30 bg-orange-500/10 text-orange-600",
  ict_manager: "border-teal-500/30 bg-teal-500/10 text-teal-600",
  procurement_manager: "border-rose-500/30 bg-rose-500/10 text-rose-600",
};

interface InviteForm {
  name: string;
  email: string;
  password: string;
  role: RoleValue;
}

export default function OrgStaff() {
  const { user } = useAuth();
  const [showInvite, setShowInvite] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState<InviteForm>({ name: "", email: "", password: "", role: "staff" });

  const { data, isLoading, refetch } = trpc.multiTenancy.getMyOrgUsers.useQuery(undefined, {
    enabled: !!user?.organizationId && user.role === "super_admin",
  });

  const inviteMutation = trpc.multiTenancy.inviteOrgUser.useMutation({
    onSuccess: () => {
      toast.success("User added", { description: `${form.name} has been added to your organization.` });
      setShowInvite(false);
      setForm({ name: "", email: "", password: "", role: "staff" });
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const removeMutation = trpc.multiTenancy.removeOrgUser.useMutation({
    onSuccess: () => {
      toast.success("User removed", { description: `${removeTarget?.name} has been removed from your organization.` });
      setRemoveTarget(null);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleInvite = () => {
    if (!form.name || !form.email || !form.password) {
      toast.error("Please fill in all required fields.");
      return;
    }
    inviteMutation.mutate(form);
  };

  // Access guard
  if (user?.role !== "super_admin") {
    return (
      <OrgLayout title="Staff Management">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShieldOff className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground max-w-sm">
            Only organization administrators can manage staff.
          </p>
        </div>
      </OrgLayout>
    );
  }

  const staff = data?.users ?? [];

  return (
    <OrgLayout
      title="Staff Management"
      description={`${staff.length} member${staff.length !== 1 ? "s" : ""} in your organization`}
    >
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {isLoading ? "Loading…" : `${staff.length} total member${staff.length !== 1 ? "s" : ""}`}
          </div>
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Staff Member
          </Button>
        </div>

        {/* Staff table */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : staff.length === 0 ? (
          <div className="rounded-xl border border-dashed py-16 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">No staff members yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Add your first staff member to get started.</p>
            <Button className="mt-4" size="sm" onClick={() => setShowInvite(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Staff Member
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member: any) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="text-muted-foreground">{member.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={ROLE_COLORS[member.role] ?? ""}
                      >
                        {member.role?.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-500">
                          <XCircle className="h-3.5 w-3.5" /> Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {member.id !== user?.id && member.role !== "super_admin" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500"
                          onClick={() => setRemoveTarget({ id: member.id, name: member.name })}
                          title="Remove from organization"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Invite dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="inv-name">Full Name *</Label>
              <Input
                id="inv-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-email">Email Address *</Label>
              <Input
                id="inv-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-password">Initial Password *</Label>
              <Input
                id="inv-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-role">Role *</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v as RoleValue }))}
              >
                <SelectTrigger id="inv-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? "Adding…" : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{removeTarget?.name}</strong> from your organization. They will lose
              access immediately. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => removeTarget && removeMutation.mutate({ userId: removeTarget.id })}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OrgLayout>
  );
}
