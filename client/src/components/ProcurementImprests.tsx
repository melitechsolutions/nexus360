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
  Eye,
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  DollarSign,
} from 'lucide-react';

export default function ProcurementImprestsPage() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('__all__');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedImprest, setSelectedImprest] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    purpose: '',
    amount: 0,
    justification: '',
    expectedReturnDate: '',
    status: 'requested' as const,
  });

  // Fetch imprests
  const { data: imprests = [], isLoading, refetch } = trpc.procurementMgmt.imprestList.useQuery({
    search: searchTerm,
    status: statusFilter === '__all__' ? undefined : statusFilter || undefined,
    limit: 100,
  });

  // Create mutation
  const createMutation = trpc.procurementMgmt.imprestCreate.useMutation({
    onSuccess: () => {
      toast.success('Imprest request created successfully');
      refetch();
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create imprest: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = trpc.procurementMgmt.imprestUpdate.useMutation({
    onSuccess: () => {
      toast.success('Imprest updated successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update imprest: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      employeeId: '',
      employeeName: '',
      purpose: '',
      amount: 0,
      justification: '',
      expectedReturnDate: '',
      status: 'requested',
    });
  };

  const handleSave = async () => {
    if (!formData.employeeName || formData.amount <= 0 || !formData.purpose) {
      toast.error('Please fill in all required fields');
      return;
    }

    await createMutation.mutateAsync({
      employeeId: formData.employeeId,
      employeeName: formData.employeeName,
      purpose: formData.purpose,
      amount: formData.amount,
      justification: formData.justification,
      expectedReturnDate: formData.expectedReturnDate,
      status: formData.status,
    });
  };

  const handleStatusChange = async (imprestId: string, newStatus: string) => {
    await updateMutation.mutateAsync({
      id: imprestId,
      status: newStatus as any,
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      requested: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
      approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
      issued: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
      surrendered: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Calculate statistics
  const stats = {
    total: imprests.length,
    totalAmount: imprests.reduce((sum, i) => sum + (i.amount || 0), 0),
    requestedCount: imprests.filter(i => i.status === 'requested').length,
    approvedCount: imprests.filter(i => i.status === 'approved').length,
    issuedCount: imprests.filter(i => i.status === 'issued').length,
    surrenderedCount: imprests.filter(i => i.status === 'surrendered').length,
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Imprests</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Request, manage, and track employee imprests
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Imprests</p>
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-1">
                KES {(stats.totalAmount / 100).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Requested</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.requestedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-3xl font-bold text-blue-600">{stats.approvedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Issued</p>
              <p className="text-3xl font-bold text-green-600">{stats.issuedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Surrendered</p>
              <p className="text-3xl font-bold text-purple-600">{stats.surrenderedCount}</p>
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
              <Label htmlFor="search">Search Imprests</Label>
              <Input
                id="search"
                placeholder="Search by employee name or number"
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
                  <SelectItem value="requested">Requested</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="surrendered">Surrendered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={() => setCreateDialogOpen(true)} className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                New Imprest
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Imprests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Imprest Requests</CardTitle>
          <CardDescription>
            {imprests.length} records found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : imprests.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imprest #</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imprests.map((imprest: any) => (
                    <TableRow key={imprest.id}>
                      <TableCell className="font-mono font-semibold">
                        {imprest.imprestNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{imprest.employeeName}</p>
                          <p className="text-xs text-gray-500">{imprest.employeeId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {imprest.purpose}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        KES {((imprest.amount || 0) / 100).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(imprest.status)}>
                          {imprest.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedImprest(imprest);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {imprest.status === 'requested' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(imprest.id, 'approved')}
                              disabled={updateMutation.isPending}
                              className="text-green-600"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(imprest.id, 'rejected')}
                              disabled={updateMutation.isPending}
                              className="text-red-600"
                            >
                              <AlertCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}

                        {imprest.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(imprest.id, 'issued')}
                            disabled={updateMutation.isPending}
                            className="text-green-600"
                          >
                            <DollarSign className="w-4 h-4" />
                          </Button>
                        )}

                        {imprest.status === 'issued' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(imprest.id, 'surrendered')}
                            disabled={updateMutation.isPending}
                            className="text-purple-600"
                          >
                            <TrendingDown className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No imprests found. Create one to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request New Imprest</DialogTitle>
            <DialogDescription>
              Submit an imprest request to your department
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employeeName">Employee Name *</Label>
              <Input
                id="employeeName"
                value={formData.employeeName}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, employeeName: e.target.value }))
                }
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                value={formData.employeeId}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, employeeId: e.target.value }))
                }
                placeholder="Employee ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose *</Label>
              <Input
                id="purpose"
                value={formData.purpose}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, purpose: e.target.value }))
                }
                placeholder="What is the imprest for?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (KES) *</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                }
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="justification">Justification</Label>
              <Textarea
                id="justification"
                value={formData.justification}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, justification: e.target.value }))
                }
                placeholder="Why do you need this imprest?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="returnDate">Expected Return Date</Label>
              <Input
                id="returnDate"
                type="date"
                value={formData.expectedReturnDate}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, expectedReturnDate: e.target.value }))
                }
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The imprest amount must be settled/surrendered within the specified period
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Submit Request
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
            <DialogTitle>Imprest Details</DialogTitle>
          </DialogHeader>

          {selectedImprest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Imprest Number</p>
                  <p className="font-mono font-semibold">{selectedImprest.imprestNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={getStatusColor(selectedImprest.status)}>
                    {selectedImprest.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Employee</p>
                  <p className="font-semibold">{selectedImprest.employeeName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-semibold">KES {((selectedImprest.amount || 0) / 100).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Purpose</p>
                <p className="font-medium">{selectedImprest.purpose}</p>
              </div>

              {selectedImprest.justification && (
                <div>
                  <p className="text-sm text-gray-500">Justification</p>
                  <p>{selectedImprest.justification}</p>
                </div>
              )}

              {selectedImprest.expectedReturnDate && (
                <div>
                  <p className="text-sm text-gray-500">Expected Return Date</p>
                  <p className="font-medium">
                    {new Date(selectedImprest.expectedReturnDate).toLocaleDateString()}
                  </p>
                </div>
              )}

              {selectedImprest.createdAt && (
                <div>
                  <p className="text-sm text-gray-500">Requested On</p>
                  <p className="font-medium">
                    {new Date(selectedImprest.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
