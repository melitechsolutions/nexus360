import React, { useState } from "react";
import { toast } from "sonner";
import { trpc } from "../lib/trpc";
import {
  Plus,
  Edit2,
  Trash2,
  Play,
  MoreVertical,
  ChevronDown,
  Check,
  AlertCircle,
  Clock,
  CheckCircle,
  Zap,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import ModuleLayout from "@/components/ModuleLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";

// ============================================
// TYPES
// ============================================

interface WorkflowAction {
  actionType:
    | "send_email"
    | "create_task"
    | "update_status"
    | "send_notification"
    | "create_follow_up"
    | "add_invoice"
    | "update_field"
    | "create_reminder";
  actionName: string;
  actionTarget?: string;
  actionData: Record<string, any>;
  delayMinutes?: number;
  sequence?: number;
}

interface WorkflowFormData {
  name: string;
  description?: string;
  triggerType:
    | "invoice_created"
    | "invoice_paid"
    | "invoice_overdue"
    | "payment_received"
    | "opportunity_moved"
    | "task_completed"
    | "project_milestone_reached"
    | "reminder_time"
    | "";
  actions: WorkflowAction[];
  isRecurring: boolean;
}

// ============================================
// WORKFLOW BUILDER COMPONENT
// ============================================

export default function WorkflowAutomation() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showExecuteDialog, setShowExecuteDialog] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [showExecutionHistory, setShowExecutionHistory] = useState(false);
  const [useTemplate, setUseTemplate] = useState<string>("");

  const { data: workflows, refetch: refetchWorkflows } =
    trpc.workflows.list.useQuery({
      search: "",
      status: "active",
    });

  const { data: templates } = trpc.workflows.getTemplates.useQuery();

  const { mutate: createWorkflow, isPending: isCreating } =
    trpc.workflows.create.useMutation({
      onSuccess: () => {
        setShowCreateDialog(false);
        refetchWorkflows();
      },
    });

  const { mutate: updateWorkflow, isPending: isUpdating } =
    trpc.workflows.update.useMutation({
      onSuccess: () => {
        setShowEditDialog(false);
        refetchWorkflows();
      },
    });

  const { mutate: deleteWorkflow, isPending: isDeleting } =
    trpc.workflows.delete.useMutation({
      onSuccess: () => {
        setShowDeleteDialog(false);
        refetchWorkflows();
      },
    });

  const { mutate: executeWorkflow, isPending: isExecuting } =
    trpc.workflows.executeManually.useMutation({
      onSuccess: () => {
        setShowExecuteDialog(false);
      },
    });

  const { data: executionHistory } =
    trpc.workflows.getExecutionHistory.useQuery(
      { workflowId: selectedWorkflow?.id || "" },
      { enabled: showExecutionHistory && !!selectedWorkflow }
    );

  const [formData, setFormData] = useState<WorkflowFormData>({
    name: "",
    description: "",
    triggerType: "",
    actions: [],
    isRecurring: false,
  });

  const triggerTypes = [
    { value: "invoice_created", label: "Invoice Created" },
    { value: "invoice_paid", label: "Invoice Paid" },
    { value: "invoice_overdue", label: "Invoice Overdue" },
    { value: "payment_received", label: "Payment Received" },
    { value: "opportunity_moved", label: "Opportunity Moved" },
    { value: "task_completed", label: "Task Completed" },
    { value: "project_milestone_reached", label: "Project Milestone Reached" },
    { value: "reminder_time", label: "Reminder Time" },
  ];

  const actionTypes = [
    { value: "send_email", label: "Send Email" },
    { value: "create_task", label: "Create Task" },
    { value: "update_status", label: "Update Status" },
    { value: "send_notification", label: "Send Notification" },
    { value: "create_follow_up", label: "Create Follow-up" },
    { value: "add_invoice", label: "Add Invoice" },
    { value: "update_field", label: "Update Field" },
    { value: "create_reminder", label: "Create Reminder" },
  ];

  const handleAddAction = () => {
    setFormData((prev) => ({
      ...prev,
      actions: [
        ...prev.actions,
        {
          actionType: "send_email",
          actionName: "",
          actionData: {},
          sequence: prev.actions.length + 1,
        },
      ],
    }));
  };

  const handleRemoveAction = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateAction = (index: number, updates: Partial<WorkflowAction>) => {
    setFormData((prev) => ({
      ...prev,
      actions: prev.actions.map((action, i) =>
        i === index ? { ...action, ...updates } : action
      ),
    }));
  };

  const handleCreateWorkflow = () => {
    if (!formData.name.trim() || !formData.triggerType) {
      toast.error("Workflow name and trigger type are required");
      return;
    }

    createWorkflow({
      name: formData.name,
      description: formData.description,
      triggerType: formData.triggerType as any,
      actions: formData.actions,
      isRecurring: formData.isRecurring,
    });

    // Reset form
    setFormData({
      name: "",
      description: "",
      triggerType: "",
      actions: [],
      isRecurring: false,
    });
  };

  const handleLoadTemplate = (template: any) => {
    setFormData({
      name: template.name,
      description: template.description,
      triggerType: template.triggerType,
      actions: template.actions,
      isRecurring: false,
    });
    setUseTemplate(template.id);
  };

  return (
    <ModuleLayout
      title="Workflow Automation"
      description="Create and manage automated business processes"
      icon={<Zap className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Automation" },
      ]}
    >
      <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workflow Automation</h1>
          <p className="text-gray-600 mt-2">
            Create automated workflows to streamline business processes
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
          <Plus size={20} />
          New Workflow
        </Button>
      </div>

      {/* Tabs for Workflows, Templates, and Analytics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xl font-bold">{workflows?.workflows.length || 0}</div>
          <div className="text-sm text-gray-600">Active Workflows</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{templates?.templates.length || 0}</div>
          <div className="text-sm text-gray-600">Available Templates</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">Ready</div>
          <div className="text-sm text-gray-600">System Status</div>
        </Card>
      </div>

      {/* Templates Section */}
      {templates && templates.templates.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Quick Start Templates</h2>
          <div className="grid grid-cols-3 gap-4">
            {templates.templates.map((template: any) => (
              <Card key={template.id} className="p-4 hover:shadow-lg transition-shadow">
                <h3 className="font-semibold mb-2">{template.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                <Badge className="mb-4">{template.triggerType}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleLoadTemplate(template)}
                  className="w-full"
                >
                  Use Template
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Workflows List */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Your Workflows</h2>
        {workflows?.workflows && workflows.workflows.length > 0 ? (
          <div className="space-y-4">
            {workflows.workflows.map((workflow: any) => (
              <Card key={workflow.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{workflow.name}</h3>
                      <Badge
                        variant={workflow.status === "active" ? "default" : "secondary"}
                      >
                        {workflow.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock size={16} className="text-gray-400" />
                        <span>{workflow.triggerType}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle size={16} className="text-gray-400" />
                        <span>{workflow.actionTypes?.length || 0} actions</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedWorkflow(workflow);
                        setShowExecuteDialog(true);
                      }}
                    >
                      <Play size={16} className="mr-1" />
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedWorkflow(workflow);
                        setShowEditDialog(true);
                      }}
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        setSelectedWorkflow(workflow);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-gray-600">No workflows created yet. Start by creating a new workflow or using a template.</p>
          </Card>
        )}
      </div>

      {/* Create/Edit Workflow Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
        setShowCreateDialog(open && !showEditDialog);
        setShowEditDialog(open && showEditDialog);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showEditDialog ? "Edit Workflow" : "Create New Workflow"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Workflow Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Workflow Name</label>
                <Input
                  placeholder="e.g., Auto Follow-up on Overdue Invoices"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  placeholder="Describe what this workflow does..."
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Trigger Event</label>
                <Select
                  value={formData.triggerType}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, triggerType: value as any }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger event..." />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formData.isRecurring}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, isRecurring: e.target.checked }))
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="recurring" className="text-sm">
                  This is a recurring workflow
                </label>
              </div>
            </div>

            {/* Actions Configuration */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Workflow Actions</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddAction}
                >
                  <Plus size={16} className="mr-1" />
                  Add Action
                </Button>
              </div>

              <div className="space-y-4">
                {formData.actions.map((action, index) => (
                  <Card key={action.id || `action-${index}`} className="p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-sm font-medium">Action {index + 1}</div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveAction(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Action Type</label>
                        <Select
                          value={action.actionType}
                          onValueChange={(value) =>
                            handleUpdateAction(index, { actionType: value as any })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {actionTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Action Name</label>
                        <Input
                          placeholder="e.g., Send Overdue Reminder"
                          value={action.actionName}
                          onChange={(e) =>
                            handleUpdateAction(index, { actionName: e.target.value })
                          }
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Target (Optional)</label>
                          <Input
                            placeholder="e.g., client, finance, operations"
                            value={action.actionTarget || ""}
                            onChange={(e) =>
                              handleUpdateAction(index, {
                                actionTarget: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Delay (minutes)</label>
                          <Input
                            type="number"
                            min="0"
                            value={action.delayMinutes || 0}
                            onChange={(e) =>
                              handleUpdateAction(index, {
                                delayMinutes: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {formData.actions.length === 0 && (
                <Card className="p-8 text-center bg-gray-50">
                  <p className="text-gray-600 mb-4">No actions added yet</p>
                  <Button variant="outline" onClick={handleAddAction}>
                    Add First Action
                  </Button>
                </Card>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setShowEditDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateWorkflow}
              disabled={isCreating || isUpdating}
            >
              {isCreating || isUpdating ? "Saving..." : "Save Workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Workflow?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{selectedWorkflow?.name || "workflow"}"? This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-4 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedWorkflow) {
                  deleteWorkflow(selectedWorkflow.id);
                }
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Execute/Test Workflow Dialog */}
      <Dialog open={showExecuteDialog} onOpenChange={setShowExecuteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Workflow: {selectedWorkflow?.name || "Workflow"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Entity Type</label>
              <Select defaultValue="invoice">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="opportunity">Opportunity</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Entity ID</label>
              <Input placeholder="Enter entity ID to test with..." />
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex gap-2">
                <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  Testing will execute the workflow with the specified entity. All actions will run as configured.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExecuteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (selectedWorkflow?.id) {
                executeWorkflow({ workflowId: selectedWorkflow.id });
              }
            }} disabled={isExecuting}>
              {isExecuting ? "Testing..." : "Run Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </ModuleLayout>
  );
}
