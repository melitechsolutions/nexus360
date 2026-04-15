/**
 * Workflow Builder Page
 * Visual workflow automation and process design interface
 */

import React, { useState } from 'react';
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Play, Pause, History, Download, StopCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

const WorkflowBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState('workflows');
  const [showModal, setShowModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [newWorkflow, setNewWorkflow] = useState({ name: '', description: '' });

  const utils = trpc.useUtils();
  const workflowsQuery = trpc.workflows.list.useQuery({ limit: 50, offset: 0 });
  const templatesQuery = trpc.workflows.getTemplates.useQuery();

  const createMutation = trpc.workflows.create.useMutation({
    onSuccess: () => {
      utils.workflows.list.invalidate();
      setShowModal(false);
      setNewWorkflow({ name: '', description: '' });
      toast.success('Workflow created');
    },
    onError: () => toast.error('Failed to create workflow'),
  });

  const deleteMutation = trpc.workflows.delete.useMutation({
    onSuccess: () => {
      utils.workflows.list.invalidate();
      setSelectedWorkflow(null);
      toast.success('Workflow deleted');
    },
    onError: () => toast.error('Failed to delete workflow'),
  });

  const toggleMutation = trpc.workflows.toggleStatus.useMutation({
    onSuccess: () => {
      utils.workflows.list.invalidate();
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const workflows = JSON.parse(JSON.stringify(workflowsQuery.data?.workflows ?? []));
  const templates = JSON.parse(JSON.stringify(templatesQuery.data?.templates ?? []));

  const getStatusVariant = (status: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: 'secondary', active: 'default', inactive: 'outline', paused: 'destructive',
    };
    return map[status] || 'secondary';
  };

  const handleCreate = () => {
    if (!newWorkflow.name.trim()) { toast.error('Name is required'); return; }
    createMutation.mutate({
      name: newWorkflow.name,
      description: newWorkflow.description,
      triggerType: 'manual',
      triggerCondition: {},
      actions: [{ actionType: 'send_notification', actionName: 'Default Action', actionTarget: 'user', actionData: {}, sequence: 1 }],
      isRecurring: false,
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">Workflow Automation</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="workflows"><Play className="w-4 h-4 mr-2" />My Workflows</TabsTrigger>
            <TabsTrigger value="templates"><History className="w-4 h-4 mr-2" />Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="workflows">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Workflows</h2>
              <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-2" />New Workflow</Button>
            </div>

            {workflowsQuery.isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : workflows.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">No workflows yet. Create one to get started.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {workflows.map((wf: any) => (
                  <Card key={wf.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedWorkflow(wf)}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{wf.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{wf.description}</p>
                        </div>
                        <Badge variant={getStatusVariant(wf.status)}>{wf.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 mb-4 text-center text-sm border-t border-b py-3">
                        <div>
                          <div className="font-bold text-lg">{wf.triggerType || '-'}</div>
                          <div className="text-muted-foreground">Trigger</div>
                        </div>
                        <div>
                          <div className="font-bold text-lg">{wf.isRecurring ? 'Yes' : 'No'}</div>
                          <div className="text-muted-foreground">Recurring</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
                        <span>Created {wf.createdAt ? new Date(wf.createdAt).toLocaleDateString() : '-'}</span>
                      </div>
                      <div className="flex justify-end space-x-2">
                        {wf.status === 'active' ? (
                          <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); toggleMutation.mutate({ id: wf.id, status: 'inactive' }); }}>
                            <StopCircle className="w-4 h-4 mr-1" />Pause
                          </Button>
                        ) : (
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); toggleMutation.mutate({ id: wf.id, status: 'active' }); }}>
                            <Play className="w-4 h-4 mr-1" />Activate
                          </Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(wf.id); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates">
            <h2 className="text-2xl font-bold mb-6">Workflow Templates</h2>
            {templatesQuery.isLoading ? (
              <p className="text-muted-foreground">Loading templates...</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {templates.map((t: any) => (
                  <Card key={t.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{t.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{t.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 mb-4">
                        <Badge variant="secondary">{t.triggerType}</Badge>
                        <span className="text-sm text-muted-foreground">{t.actions?.length || 0} actions</span>
                      </div>
                      <Button variant="outline" onClick={() => {
                        setNewWorkflow({ name: `Copy of ${t.name}`, description: t.description });
                        setShowModal(true);
                      }}>
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Dialog */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Workflow</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Workflow Name *</label>
                <Input placeholder="e.g., Invoice Approval" value={newWorkflow.name} onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <RichTextEditor value={newWorkflow.description} onChange={(html) => setNewWorkflow({ ...newWorkflow, description: html })} minHeight="100px" placeholder="What does this workflow do?" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={!!selectedWorkflow} onOpenChange={(open) => !open && setSelectedWorkflow(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{selectedWorkflow?.name}</DialogTitle></DialogHeader>
            {selectedWorkflow && (
              <div className="space-y-4">
                <p className="text-muted-foreground">{selectedWorkflow.description}</p>
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                  <div><div className="text-sm text-muted-foreground">Status</div><Badge variant={getStatusVariant(selectedWorkflow.status)}>{selectedWorkflow.status}</Badge></div>
                  <div><div className="text-sm text-muted-foreground">Trigger</div><div className="font-bold">{selectedWorkflow.triggerType}</div></div>
                  <div><div className="text-sm text-muted-foreground">Recurring</div><div className="font-bold">{selectedWorkflow.isRecurring ? 'Yes' : 'No'}</div></div>
                  <div><div className="text-sm text-muted-foreground">Created</div><div className="font-bold">{selectedWorkflow.createdAt ? new Date(selectedWorkflow.createdAt).toLocaleDateString() : '-'}</div></div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default WorkflowBuilder;
