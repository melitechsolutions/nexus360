import { useState } from "react";
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
import { DatePicker } from "@/components/DatePicker";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface CreateProjectFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreateProjectForm({ onSuccess, onCancel }: CreateProjectFormProps) {
  const utils = trpc.useUtils();
  const { data: clients = [] } = trpc.clients.list.useQuery({});
  
  const createProjectMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      toast.success("Project created successfully!");
      utils.projects.list.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create project");
    },
  });
  const [formData, setFormData] = useState({
    name: "",
    projectNumber: `PRJ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
    clientId: "",
    description: "",
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    budget: "",
    status: "planning",
    priority: "medium",
    progressPercentage: "0",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.clientId) {
      toast.error("Please fill in all required fields");
      return;
    }

    createProjectMutation.mutate({
      name: formData.name,
      clientId: formData.clientId,
      description: formData.description,
      status: formData.status as any,
      priority: formData.priority as any,
      startDate: formData.startDate.toISOString().split('T')[0],
      endDate: formData.endDate.toISOString().split('T')[0],
      budget: formData.budget ? parseFloat(formData.budget) : undefined,
      progressPercentage: formData.progressPercentage ? parseInt(formData.progressPercentage) : 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Project Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter project name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectNumber">Project Number</Label>
          <Input
            id="projectNumber"
            value={formData.projectNumber}
            onChange={(e) => setFormData({ ...formData, projectNumber: e.target.value })}
            placeholder="Auto-generated"
            disabled
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientId">Client *</Label>
        <Select
          value={formData.clientId}
          onValueChange={(value) => setFormData({ ...formData, clientId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select client" />
          </SelectTrigger>
          <SelectContent>
            {Array.isArray(clients) && clients.map((client: any) => (
              <SelectItem key={client.id} value={client.id}>
                {client.companyName || client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Project description and objectives"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date *</Label>
          <DatePicker
            date={formData.startDate}
            onDateChange={(date) => date && setFormData({ ...formData, startDate: date })}
          />
        </div>

        <div className="space-y-2">
          <Label>End Date *</Label>
          <DatePicker
            date={formData.endDate}
            onDateChange={(date) => date && setFormData({ ...formData, endDate: date })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="budget">Budget (Ksh)</Label>
          <Input
            id="budget"
            type="number"
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) => setFormData({ ...formData, priority: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="progressPercentage">Progress (%)</Label>
          <Input
            id="progressPercentage"
            type="number"
            min="0"
            max="100"
            value={formData.progressPercentage}
            onChange={(e) => setFormData({ ...formData, progressPercentage: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={createProjectMutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={createProjectMutation.isPending}>
          {createProjectMutation.isPending ? "Creating..." : "Create Project"}
        </Button>
      </div>
    </form>
  );
}


