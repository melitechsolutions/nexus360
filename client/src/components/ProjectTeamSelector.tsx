import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Users, Loader2, AlertCircle, Plus, X } from "lucide-react";

interface ProjectTeamSelectorProps {
  projectId: string;
  onMemberAdded?: () => void;
  onMemberRemoved?: () => void;
}

const PROJECT_TEAM_ROLES = [
  { id: 'project_manager', label: 'Project Manager' },
  { id: 'team_lead', label: 'Team Lead' },
  { id: 'developer', label: 'Developer' },
  { id: 'designer', label: 'Designer' },
  { id: 'qa', label: 'QA Engineer' },
  { id: 'devops', label: 'DevOps Engineer' },
  { id: 'business_analyst', label: 'Business Analyst' },
  { id: 'product_owner', label: 'Product Owner' },
  { id: 'scrum_master', label: 'Scrum Master' },
  { id: 'tech_lead', label: 'Technical Lead' },
  { id: 'other', label: 'Other' },
];

export function ProjectTeamSelector({ projectId, onMemberAdded, onMemberRemoved }: ProjectTeamSelectorProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    role: "developer",
    hoursAllocated: 40,
    startDate: "",
    endDate: "",
  });

  const { data: employees = [], isLoading: employeesLoading } = trpc.employees.list.useQuery();
  const { data: teamMembers = [], isLoading: teamLoading, refetch: refetchTeam } = trpc.projects.teamMembers.list.useQuery({ projectId });

  const addMemberMutation = trpc.projects.teamMembers.create.useMutation({
    onSuccess: () => {
      toast.success("Team member added successfully");
      refetchTeam();
      setFormData({
        employeeId: "",
        role: "developer",
        hoursAllocated: 40,
        startDate: "",
        endDate: "",
      });
      setShowForm(false);
      onMemberAdded?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add team member");
    },
  });

  const removeMemberMutation = trpc.projects.teamMembers.delete.useMutation({
    onSuccess: () => {
      toast.success("Team member removed successfully");
      refetchTeam();
      onMemberRemoved?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove team member");
    },
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeId) {
      toast.error("Please select an employee");
      return;
    }

    addMemberMutation.mutate({
      projectId,
      employeeId: formData.employeeId,
      role: formData.role,
      hoursAllocated: formData.hoursAllocated || undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
    });
  };

  const handleRemoveMember = (memberId: string) => {
    if (confirm("Are you sure you want to remove this team member?")) {
      removeMemberMutation.mutate({ id: memberId });
    }
  };

  // Get employees that are not already on the team
  const availableEmployees = useMemo(() => {
    const assignedIds = new Set(teamMembers.map((m: any) => m.employeeId));
    return employees.filter((emp: any) => !assignedIds.has(emp.id));
  }, [employees, teamMembers]);

  if (teamLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Project Team
          </CardTitle>
          <CardDescription>
            {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''} assigned
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No team members assigned yet. Add team members to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {member.employeeName || `Employee ${member.employeeId}`}
                    </div>
                    <div className="text-sm text-gray-600">
                      {member.role ? PROJECT_TEAM_ROLES.find(r => r.id === member.role)?.label || member.role : 'Team Member'}
                      {member.hoursAllocated && ` • ${member.hoursAllocated} hrs/week`}
                    </div>
                    {member.startDate && (
                      <div className="text-xs text-gray-500">
                        {new Date(member.startDate).toLocaleDateString()} 
                        {member.endDate && ` - ${new Date(member.endDate).toLocaleDateString()}`}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={removeMemberMutation.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Team Member Form */}
      {showForm && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base">Add Team Member</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Employee Selection */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="employeeId">Select Employee *</Label>
                  <Select value={formData.employeeId} onValueChange={(value) => setFormData({ ...formData, employeeId: value })}>
                    <SelectTrigger id="employeeId">
                      <SelectValue placeholder="Choose an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEmployees.length === 0 ? (
                        <div className="p-2 text-sm text-gray-600 text-center">
                          All employees are already on the team
                        </div>
                      ) : (
                        availableEmployees.map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName} {emp.position && `(${emp.position})`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TEAM_ROLES.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Hours Allocated */}
                <div className="space-y-2">
                  <Label htmlFor="hoursAllocated">Hours per Week</Label>
                  <Input
                    id="hoursAllocated"
                    type="number"
                    min="0"
                    max="168"
                    value={formData.hoursAllocated}
                    onChange={(e) => setFormData({ ...formData, hoursAllocated: parseFloat(e.target.value) || 0 })}
                    placeholder="40"
                  />
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      employeeId: "",
                      role: "developer",
                      hoursAllocated: 40,
                      startDate: "",
                      endDate: "",
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addMemberMutation.isPending || !formData.employeeId}
                >
                  {addMemberMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Member
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <Button
          onClick={() => setShowForm(true)}
          className="w-full"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>
      )}
    </div>
  );
}
