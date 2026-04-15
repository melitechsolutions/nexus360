import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Download,
  Filter,
  Eye,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export default function LocalPurchaseOrdersPage() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('__all__');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedLPO, setSelectedLPO] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    vendorName: '',
    vendorId: '',
    description: '',
    items: [] as Array<{ description: string; quantity: number; unitPrice: number; amount: number }>,
    totalAmount: 0,
    expectedDelivery: '',
    terms: '',
    status: 'draft' as const,
  });

  // Fetch LPOs
  const { data: lpos = [], isLoading, refetch } = trpc.procurementMgmt.lpoList.useQuery({
    search: searchTerm,
    status: statusFilter === '__all__' ? undefined : statusFilter || undefined,
    limit: 100,
  });

  // Create mutation
  const createMutation = trpc.procurementMgmt.lpoCreate.useMutation({
    onSuccess: () => {
      toast.success('LPO created successfully');
      refetch();
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create LPO: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = trpc.procurementMgmt.lpoUpdate.useMutation({
    onSuccess: () => {
      toast.success('LPO updated successfully');
      refetch();
      setEditingId(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to update LPO: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = trpc.procurementMgmt.lpoDelete.useMutation({
    onSuccess: () => {
      toast.success('LPO deleted successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete LPO: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      vendorName: '',
      vendorId: '',
      description: '',
      items: [],
      totalAmount: 0,
      expectedDelivery: '',
      terms: '',
      status: 'draft',
    });
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 0, unitPrice: 0, amount: 0 }],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      (newItems[index] as any)[field] = value;
      
      // Auto-calculate amount
      if (field === 'quantity' || field === 'unitPrice') {
        newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
      }
      
      // Recalculate total
      const total = newItems.reduce((sum, item) => sum + item.amount, 0);
      
      return {
        ...prev,
        items: newItems,
        totalAmount: total,
      };
    });
  };

  const handleSave = async () => {
    if (!formData.vendorName || formData.items.length === 0) {
      toast.error('Please fill in vendor name and add at least one item');
      return;
    }

    if (editingId) {
      await updateMutation.mutateAsync({
        id: editingId,
        vendorName: formData.vendorName,
        description: formData.description,
        items: formData.items,
        totalAmount: formData.totalAmount,
        status: formData.status,
        expectedDelivery: formData.expectedDelivery,
      });
    } else {
      await createMutation.mutateAsync({
        vendorName: formData.vendorName,
        vendorId: formData.vendorId,
        description: formData.description,
        items: formData.items,
        totalAmount: formData.totalAmount,
        expectedDelivery: formData.expectedDelivery,
        terms: formData.terms,
        status: formData.status,
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100',
      submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredLPOs = lpos;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Local Purchase Orders (LPOs)</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Create and manage local purchase orders
        </p>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search LPOs</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Search by vendor or LPO #"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={() => setCreateDialogOpen(true)} className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                New LPO
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LPOs Table */}
      <Card>
        <CardHeader>
          <CardTitle>LPOs</CardTitle>
          <CardDescription>
            {filteredLPOs.length} records found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredLPOs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LPO #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLPOs.map((lpo: any) => (
                    <TableRow key={lpo.id}>
                      <TableCell className="font-mono font-semibold">
                        {lpo.lpoNumber}
                      </TableCell>
                      <TableCell>{lpo.vendorName}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {lpo.description}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        KES {((lpo.totalAmount || 0) / 100).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(lpo.status)}>
                          {lpo.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLPO(lpo);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {lpo.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(lpo.id);
                              setFormData({
                                vendorName: lpo.vendorName,
                                vendorId: lpo.vendorId || '',
                                description: lpo.description,
                                items: lpo.items || [],
                                totalAmount: lpo.totalAmount,
                                expectedDelivery: lpo.expectedDelivery || '',
                                terms: lpo.terms || '',
                                status: lpo.status,
                              });
                              setCreateDialogOpen(true);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this LPO?')) {
                              deleteMutation.mutate(lpo.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No LPOs found. Create one to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit LPO' : 'Create New LPO'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor Name *</Label>
                <Input
                  id="vendor"
                  value={formData.vendorName}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, vendorName: e.target.value }))
                  }
                  placeholder="Enter vendor name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendorId">Vendor ID</Label>
                <Input
                  id="vendorId"
                  value={formData.vendorId}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, vendorId: e.target.value }))
                  }
                  placeholder="Optional vendor ID"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, description: e.target.value }))
                }
                placeholder="Describe the purchase order"
                rows={2}
              />
            </div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items *</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddItem}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[80px]">Qty</TableHead>
                      <TableHead className="w-[100px]">Unit Price</TableHead>
                      <TableHead className="w-[100px]">Amount</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) =>
                              handleItemChange(idx, 'description', e.target.value)
                            }
                            placeholder="Item description"
                            className="text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="text-xs"
                          />
                        </TableCell>
                        <TableCell className="text-sm">
                          KES {(item.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveItem(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-gray-50 p-3 rounded text-right">
                <span className="font-semibold">Total: KES {(formData.totalAmount).toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery">Expected Delivery</Label>
                <Input
                  id="delivery"
                  type="date"
                  value={formData.expectedDelivery}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, expectedDelivery: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="terms">Terms</Label>
                <Input
                  id="terms"
                  value={formData.terms}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, terms: e.target.value }))
                  }
                  placeholder="e.g., Net 30"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setEditingId(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save LPO
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>LPO Details</DialogTitle>
          </DialogHeader>

          {selectedLPO && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">LPO Number</p>
                  <p className="font-mono font-semibold">{selectedLPO.lpoNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={getStatusColor(selectedLPO.status)}>
                    {selectedLPO.status}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Vendor</p>
                <p className="font-semibold">{selectedLPO.vendorName}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p>{selectedLPO.description}</p>
              </div>

              {selectedLPO.items && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Items</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedLPO.items.map((item: any, idx: number) => (
                        <TableRow key={lineItem.id || `lpo-line-${idx}`}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>KES {(item.unitPrice).toLocaleString()}</TableCell>
                          <TableCell>KES {(item.amount).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="bg-gray-50 p-3 rounded text-right">
                <span className="font-semibold">Total: KES {((selectedLPO.totalAmount || 0) / 100).toLocaleString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
