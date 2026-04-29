import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  Plus,
  Trash2,
  Edit,
  Calendar,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import mutateAsync from "@/lib/mutationHelpers";
import { format } from "date-fns";

interface TeamMember {
  id: string;
  projectId: string;
  employeeId: string;
  role?: string;
  hoursAllocated?: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt?: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  position?: string;
  department?: string;
}

interface StaffAssignmentProps {
  projectId: string;
  readonly?: boolean;
}

export default function StaffAssignment({ projectId, readonly = false }: StaffAssignmentProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState({
    employeeId: "",
    role: "",
    hoursAllocated: "",
    startDate: "",
    endDate: "",
  });

  const { data: teamMembers = [], isLoading: isLoadingTeam, refetch: refetchTeam } = trpc.projects.teamMembers.list.useQuery(
    { projectId }
  );

  const { data: employees = [], isLoading: isLoadingEmployees } = trpc.employees.list.useQuery({});

  const createMutation = trpc.projects.teamMembers.create.useMutation({
    onSuccess: () => {
      toast.success("Team member added successfully");
      setIsDialogOpen(false);
      resetForm();
      refetchTeam();
    },
    onError: (error) => {
      toast.error(`Failed to add team member: ${error.message}`);
    },
  });

  const updateMutation = trpc.projects.teamMembers.update.useMutation({
    onSuccess: () => {
      toast.success("Team member updated successfully");
      setIsEditDialogOpen(false);
      setSelectedMember(null);
      refetchTeam();
    },
    onError: (error) => {
      toast.error(`Failed to update team member: ${error.message}`);
    },
  });

  const deleteMutation = trpc.projects.teamMembers.delete.useMutation({
    onSuccess: () => {
      toast.success("Team member removed successfully");
      setIsDeleteOpen(false);
      setSelectedMember(null);
      refetchTeam();
    },
    onError: (error) => {
      toast.error(`Failed to remove team member: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      employeeId: "",
      role: "",
      hoursAllocated: "",
      startDate: "",
      endDate: "",
    });
  };

  const handleAddMember = async () => {
    if (!formData.employeeId) {
      toast.error("Please select an employee");
      return;
    }

    try {
      await mutateAsync(createMutation, {
        projectId,
        employeeId: formData.employeeId,
        role: formData.role || undefined,
        hoursAllocated: formData.hoursAllocated ? parseInt(formData.hoursAllocated) : undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
      });
    } catch (error) {
      console.error("Error adding team member:", error);
    }
  };

  const handleUpdateMember = async () => {
    if (!selectedMember) return;

    try {
      await mutateAsync(updateMutation, {
        id: selectedMember.id,
        role: formData.role || undefined,
        hoursAllocated: formData.hoursAllocated ? parseInt(formData.hoursAllocated) : undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
      });
    } catch (error) {
      console.error("Error updating team member:", error);
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;

    try {
      await mutateAsync(deleteMutation, {
        id: selectedMember.id,
      });
    } catch (error) {
      console.error("Error deleting team member:", error);
    }
  };

  const openEditDialog = (member: TeamMember) => {
    setSelectedMember(member);
    const employee = employees.find(e => e.id === member.employeeId);
    setFormData({
      employeeId: member.employeeId,
      role: member.role || "",
      hoursAllocated: member.hoursAllocated?.toString() || "",
      startDate: member.startDate ? new Date(member.startDate).toISOString().split('T')[0] : "",
      endDate: member.endDate ? new Date(member.endDate).toISOString().split('T')[0] : "",
    });
    setIsEditDialogOpen(true);
  };

  const getEmployeeFullName = (employeeId: string): string => {
    const employee = employees.find(e => e.id === employeeId) as any;
    if (employee) {
      return `${employee.firstName} ${employee.lastName}`;
    }
    return "Unknown Employee";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <div>
              <CardTitle>Project Team</CardTitle>
              <CardDescription>Manage team members assigned to this project</CardDescription>
            </div>
          </div>
          {!readonly && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                  <DialogDescription>
                    Assign an employee to this project with their role and allocation details
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Employee</label>
                    <Select value={formData.employeeId} onValueChange={(value) => setFormData({ ...formData, employeeId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee: any) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {`${employee.firstName} ${employee.lastName}`} ({employee.position || "No position"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Role on Project</label>
                    <Input
                      placeholder="e.g., Lead Developer, Designer"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Hours Allocated</label>
                      <Input
                        type="number"
                        placeholder="e.g., 40"
                        value={formData.hoursAllocated}
                        onChange={(e) => setFormData({ ...formData, hoursAllocated: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Start Date</label>
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">End Date (Optional)</label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddMember} disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Adding..." : "Add Member"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingTeam ? (
          <div className="text-center py-8 text-muted-foreground">Loading team members...</div>
        ) : teamMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No team members assigned yet
          </div>
        ) : (
          <div className="space-y-3">
            {teamMembers
              .filter((member: TeamMember) => member.isActive)
              .map((member: TeamMember) => (
                <div
                  key={member.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{getEmployeeFullName(member.employeeId)}</h4>
                      {member.role && <Badge variant="secondary">{member.role}</Badge>}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                      {member.hoursAllocated && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {member.hoursAllocated} hours
                        </div>
                      )}
                      {member.startDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(member.startDate), "MMM dd, yyyy")}
                          {member.endDate && ` - ${format(new Date(member.endDate), "MMM dd, yyyy")}`}
                        </div>
                      )}
                    </div>
                  </div>
                  {!readonly && (
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(member)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setSelectedMember(member);
                          setIsDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>Update the team member's role and allocation details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Employee</label>
              <Input
                disabled
                value={selectedMember ? getEmployeeFullName(selectedMember.employeeId) : ""}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Role on Project</label>
              <Input
                placeholder="e.g., Lead Developer, Designer"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Hours Allocated</label>
                <Input
                  type="number"
                  placeholder="e.g., 40"
                  value={formData.hoursAllocated}
                  onChange={(e) => setFormData({ ...formData, hoursAllocated: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">End Date (Optional)</label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateMember} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove {selectedMember ? getEmployeeFullName(selectedMember.employeeId) : "this employee"} from this project? This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDeleteMember}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
