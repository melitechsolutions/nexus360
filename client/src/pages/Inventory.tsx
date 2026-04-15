import React, { useState } from 'react';
import { ModuleLayout } from '@/components/ModuleLayout';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Package,
  Plus,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Edit2,
  Trash2,
  Download,
  Loader2,
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { StatsCard } from "@/components/ui/stats-card";

export default function InventoryManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [adjustmentData, setAdjustmentData] = useState({
    quantity: 0,
    reason: 'adjustment' as 'adjustment' | 'damage' | 'loss' | 'recount' | 'return',
    notes: '',
  });

  // Fetch inventories with products
  const { data: inventories, isLoading: inventoriesLoading, refetch: refetchInventories } =
    trpc.inventory.list.useQuery();

  // Create/Update mutations
  const createInventoryMutation = trpc.inventory.create.useMutation({
    onSuccess: async () => {
      toast.success('Inventory created successfully');
      await refetchInventories();
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const adjustStockMutation = trpc.inventory.adjustStock.useMutation({
    onSuccess: async () => {
      toast.success('Stock adjusted successfully');
      setAdjustmentDialogOpen(false);
      setSelectedProduct(null);
      await refetchInventories();
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  // Filter inventory
  const filteredInventories = inventories?.filter(item =>
    item.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Calculate statistics
  const stats = {
    totalItems: filteredInventories.length,
    lowStockItems: filteredInventories.filter(i => (i.quantity || 0) <= (i.reorderLevel || 0)).length,
    totalValue: filteredInventories.reduce((sum, i) => sum + ((i.quantity || 0) * (i.unitCost || 0)), 0),
    outOfStock: filteredInventories.filter(i => (i.quantity || 0) === 0).length,
  };

  // Get stock status
  const getStockStatus = (quantity: number, reorderLevel: number) => {
    if (quantity === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (quantity <= reorderLevel) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    if (quantity >= reorderLevel * 3) return { label: 'Optimal', color: 'bg-green-100 text-green-800' };
    return { label: 'In Stock', color: 'bg-blue-100 text-blue-800' };
  };

  const handleAdjustStock = async () => {
    if (!selectedProduct || adjustmentData.quantity === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    await adjustStockMutation.mutateAsync({
      productId: selectedProduct,
      quantityChange: adjustmentData.quantity,
      reason: adjustmentData.reason,
      notes: adjustmentData.notes,
    });
  };

  const exportInventory = () => {
    const csv = [
      ['SKU', 'Product', 'Category', 'Quantity', 'Reorder Level', 'Unit Cost', 'Total Value'].join(','),
      ...filteredInventories.map(item =>
        [
          item.sku || '',
          item.productName || '',
          item.category || '',
          item.quantity || 0,
          item.reorderLevel || 0,
          item.unitCost || 0,
          ((item.quantity || 0) * (item.unitCost || 0)).toLocaleString(),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Inventory exported');
  };

  return (
    <ModuleLayout
      title="Inventory & Stocks"
      description="Manage product inventory, stock levels, and reorder points"
      icon={<Package className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Procurement", href: "/lpos" },
        { label: "Inventory" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button onClick={exportInventory} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      }
    >
      <div className="space-y-6">

        {/* Statistics Cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatsCard label="Total Items" value={stats.totalItems} color="border-l-orange-500" />
          <StatsCard label="Low Stock Items" value={stats.lowStockItems} color="border-l-purple-500" />
          <StatsCard label="Out of Stock" value={stats.outOfStock} color="border-l-green-500" />
          <StatsCard label="Total Value" value={<>KES {(stats.totalValue / 100).toLocaleString()}</>} color="border-l-blue-500" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="lowstock">Low Stock Alert</TabsTrigger>
            <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Search and Filter */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by product name or SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      toast.success("Filters reset. Use search and tabs to narrow results.");
                    }}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => { refetchInventories(); toast.success("Inventory refreshed"); }}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Inventory Table */}
            {inventoriesLoading ? (
              <Card>
                <CardContent className="pt-6 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </CardContent>
              </Card>
            ) : filteredInventories.length > 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="hidden md:table-cell">Category</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="hidden lg:table-cell text-right">Reorder Level</TableHead>
                          <TableHead className="hidden md:table-cell text-right">Unit Cost</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInventories.map((item) => {
                          const status = getStockStatus(item.quantity || 0, item.reorderLevel || 0);
                          const utilizationPercent = Math.min(
                            ((item.quantity || 0) / (item.reorderLevel || 1)) * 100,
                            100
                          );

                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                              <TableCell className="font-medium">{item.productName}</TableCell>
                              <TableCell className="hidden md:table-cell">{item.category}</TableCell>
                              <TableCell className="text-right font-semibold">
                                {item.quantity || 0}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell text-right text-gray-500">
                                {item.reorderLevel || 0}
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-right">
                                KES {((item.unitCost || 0) / 100).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge className={status.color}>{status.label}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedProduct(item.id);
                                    setAdjustmentDialogOpen(true);
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                  No inventory items found
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Low Stock Alert Tab */}
          <TabsContent value="lowstock" className="space-y-4">
            {filteredInventories.filter(i => (i.quantity || 0) <= (i.reorderLevel || 0)).length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    Low Stock Items ({stats.lowStockItems})
                  </CardTitle>
                  <CardDescription>Items below reorder level</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredInventories
                      .filter(i => (i.quantity || 0) <= (i.reorderLevel || 0))
                      .map((item) => (
                        <div key={item.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold">{item.productName}</p>
                              <p className="text-sm text-gray-500">{item.sku}</p>
                            </div>
                            <Badge variant="destructive">Low Stock</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 mb-3">
                            <div>
                              <p className="text-xs text-gray-500">Current</p>
                              <p className="font-semibold">{item.quantity || 0} units</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Reorder Level</p>
                              <p className="font-semibold">{item.reorderLevel || 0} units</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">To Order</p>
                              <p className="font-semibold text-blue-600">
                                {Math.max(0, (item.reorderLevel || 0) - (item.quantity || 0))} units
                              </p>
                            </div>
                          </div>
                          <Progress
                            value={((item.quantity || 0) / (item.reorderLevel || 1)) * 100}
                            className="h-2"
                          />
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                  All items are at optimal stock levels
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Stock Movements Tab */}
          <TabsContent value="movements" className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Stock movements are automatically recorded when inventory is adjusted or products are sold
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        {/* Stock Adjustment Dialog */}
        <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Stock</DialogTitle>
              <DialogDescription>
                Adjust the stock quantity for this product
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adjustment-quantity">Quantity Change</Label>
                <Input
                  id="adjustment-quantity"
                  type="number"
                  value={adjustmentData.quantity}
                  onChange={(e) =>
                    setAdjustmentData((prev) => ({
                      ...prev,
                      quantity: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="Enter quantity (negative to reduce)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adjustment-reason">Reason</Label>
                <Select
                  value={adjustmentData.reason}
                  onValueChange={(value) =>
                    setAdjustmentData((prev) => ({
                      ...prev,
                      reason: value as any,
                    }))
                  }
                >
                  <SelectTrigger id="adjustment-reason">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adjustment">Manual Adjustment</SelectItem>
                    <SelectItem value="damage">Damage</SelectItem>
                    <SelectItem value="loss">Loss/Theft</SelectItem>
                    <SelectItem value="recount">Physical Recount</SelectItem>
                    <SelectItem value="return">Customer Return</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adjustment-notes">Notes</Label>
                <Input
                  id="adjustment-notes"
                  placeholder="Add any additional notes..."
                  value={adjustmentData.notes}
                  onChange={(e) =>
                    setAdjustmentData((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjustmentDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdjustStock} disabled={adjustStockMutation.isPending}>
                {adjustStockMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adjusting...
                  </>
                ) : (
                  'Adjust Stock'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleLayout>
  );
}
