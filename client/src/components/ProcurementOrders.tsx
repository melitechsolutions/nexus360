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
  TrendingUp,
} from 'lucide-react';

export default function ProcurementOrdersPage() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('__all__');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    supplierId: '',
    supplierName: '',
    description: '',
    items: [] as Array<{ description: string; quantity: number; unitPrice: number; amount: number }>,
    totalAmount: 0,
    deliveryAddress: '',
    expectedDelivery: '',
    paymentTerms: '',
    status: 'draft' as const,
  });

  // Fetch orders
  const { data: orders = [], isLoading, refetch } = trpc.procurementMgmt.orderList.useQuery({
    search: searchTerm,
    status: statusFilter === '__all__' ? undefined : statusFilter || undefined,
    limit: 100,
  });

  // Create mutation
  const createMutation = trpc.procurementMgmt.orderCreate.useMutation({
    onSuccess: () => {
      toast.success('Purchase order created successfully');
      refetch();
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create order: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = trpc.procurementMgmt.orderUpdate.useMutation({
    onSuccess: () => {
      toast.success('Purchase order updated successfully');
      refetch();
      setEditingId(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to update order: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = trpc.procurementMgmt.orderDelete.useMutation({
    onSuccess: () => {
      toast.success('Purchase order deleted successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete order: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      supplierId: '',
      supplierName: '',
      description: '',
      items: [],
      totalAmount: 0,
      deliveryAddress: '',
      expectedDelivery: '',
      paymentTerms: '',
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
      
      if (field === 'quantity' || field === 'unitPrice') {
        newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
      }
      
      const total = newItems.reduce((sum, item) => sum + item.amount, 0);
      
      return {
        ...prev,
        items: newItems,
        totalAmount: total,
      };
    });
  };

  const handleSave = async () => {
    if (!formData.supplierName || formData.items.length === 0) {
      toast.error('Please fill in supplier name and add at least one item');
      return;
    }

    if (editingId) {
      await updateMutation.mutateAsync({
        id: editingId,
        supplierName: formData.supplierName,
        description: formData.description,
        items: formData.items,
        totalAmount: formData.totalAmount,
        status: formData.status,
        expectedDelivery: formData.expectedDelivery,
      });
    } else {
      await createMutation.mutateAsync({
        supplierId: formData.supplierId,
        supplierName: formData.supplierName,
        description: formData.description,
        items: formData.items,
        totalAmount: formData.totalAmount,
        deliveryAddress: formData.deliveryAddress,
        expectedDelivery: formData.expectedDelivery,
        paymentTerms: formData.paymentTerms,
        status: formData.status,
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100',
      sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      confirmed: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
      invoiced: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Calculate statistics
  const stats = {
    total: orders.length,
    totalValue: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    deliveredCount: orders.filter(o => o.status === 'delivered').length,
    pendingCount: orders.filter(o => ['draft', 'sent'].includes(o.status)).length,
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Purchase Orders</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Create and manage purchase orders with suppliers
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="text-2xl font-bold">KES {(stats.totalValue / 100).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-3xl font-bold text-blue-600">{stats.pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Delivered</p>
              <p className="text-3xl font-bold text-green-600">{stats.deliveredCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Orders</Label>
              <Input
                id="search"
                placeholder="Search by supplier or order #"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="invoiced">Invoiced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={() => setCreateDialogOpen(true)} className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                New Order
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
          <CardDescription>
            {orders.length} records found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : orders.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-semibold">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>{order.supplierName}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {order.description}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        KES {((order.totalAmount || 0) / 100).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedOrder(order);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {order.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(order.id);
                              setFormData({
                                supplierId: order.supplierId || '',
                                supplierName: order.supplierName,
                                description: order.description,
                                items: order.items || [],
                                totalAmount: order.totalAmount,
                                deliveryAddress: order.deliveryAddress || '',
                                expectedDelivery: order.expectedDelivery || '',
                                paymentTerms: order.paymentTerms || '',
                                status: order.status,
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
                            if (confirm('Are you sure you want to delete this order?')) {
                              deleteMutation.mutate(order.id);
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
              No purchase orders found. Create one to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Purchase Order' : 'Create New Purchase Order'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier Name *</Label>
                <Input
                  id="supplier"
                  value={formData.supplierName}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, supplierName: e.target.value }))
                  }
                  placeholder="Enter supplier name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplierId">Supplier ID</Label>
                <Input
                  id="supplierId"
                  value={formData.supplierId}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, supplierId: e.target.value }))
                  }
                  placeholder="Optional supplier ID"
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
                placeholder="Describe the purchase"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryAddress">Delivery Address</Label>
              <Textarea
                id="deliveryAddress"
                value={formData.deliveryAddress}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))
                }
                placeholder="Full delivery address"
                rows={2}
              />
            </div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items *</Label>
                <Button size="sm" variant="outline" onClick={handleAddItem}>
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
                        <TableCell className="text-sm font-semibold">
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
                <Label htmlFor="terms">Payment Terms</Label>
                <Input
                  id="terms"
                  value={formData.paymentTerms}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))
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
                  Save Order
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
            <DialogTitle>Purchase Order Details</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p className="font-mono font-semibold">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={getStatusColor(selectedOrder.status)}>
                    {selectedOrder.status}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Supplier</p>
                <p className="font-semibold">{selectedOrder.supplierName}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p>{selectedOrder.description}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Delivery Address</p>
                <p className="font-semibold whitespace-pre-wrap">{selectedOrder.deliveryAddress}</p>
              </div>

              {selectedOrder.items && (
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
                      {selectedOrder.items.map((item: any, idx: number) => (
                        <TableRow key={lineItem.id || `line-${idx}`}>
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
                <span className="font-semibold">Total: KES {((selectedOrder.totalAmount || 0) / 100).toLocaleString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
