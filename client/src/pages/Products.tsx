import { useState } from "react";
import { useLocation } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import DashboardLayout from "@/components/DashboardLayout";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/export-utils";
import { ProductSearchFilter, type ProductFilters } from "@/components/SearchAndFilter";
import { trpc } from "@/lib/trpc";
import {
  Package,
  Plus,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  BarChart3,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";
import { ListPageToolbar } from "@/components/list-page/ListPageToolbar";
import { RowActionsMenu, actionIcons } from "@/components/list-page/RowActionsMenu";
import { TableColumnSettings, useColumnVisibility, type ColumnConfig } from "@/components/list-page/TableColumnSettings";
import { EnhancedBulkActions, bulkExportAction, bulkCopyIdsAction, bulkDeleteAction, bulkEmailAction } from "@/components/list-page/EnhancedBulkActions";
import { Checkbox } from "@/components/ui/checkbox";

export default function Products() {
  // CALL ALL HOOKS UNCONDITIONALLY AT TOP LEVEL
  const { allowed, isLoading } = useRequireFeature("products:view");
  
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ProductFilters>({
    status: "all",
    sortBy: "name",
    sortOrder: "asc",
  });
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  const productColumns: ColumnConfig[] = [
    { key: "sku", label: "SKU" },
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    { key: "price", label: "Price" },
    { key: "stock", label: "Stock" },
    { key: "unit", label: "Unit" },
    { key: "status", label: "Status" },
  ];
  const { visibleColumns, toggleColumn, isVisible, pageSize, updatePageSize, reset } = useColumnVisibility(productColumns, "products");

  // Fetch products from backend
  const { data: products = [], isLoading: isLoadingProducts } = trpc.products.list.useQuery();
  const utils = trpc.useUtils();
  
  // Delete mutation
  const deleteProductMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted successfully");
      utils.products.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete product");
    },
  });

  const bulkDeleteProductsMutation = trpc.products.bulkDelete.useMutation({
    onSuccess: () => {
      toast.success("Products deleted successfully");
      utils.products.list.invalidate();
      setSelectedProducts(new Set());
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete products");
    },
  });

  const updateProductMutation = trpc.products.update.useMutation({
    onSuccess: () => { utils.products.list.invalidate(); },
    onError: (error) => { toast.error(error.message || "Failed to update product"); },
  });

  const filteredProducts = products
    .filter(
      (product: any) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a: any, b: any) => {
      let aVal: any = a[filters.sortBy as keyof typeof a];
      let bVal: any = b[filters.sortBy as keyof typeof b];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return filters.sortOrder === "desc" ? -comparison : comparison;
    });

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (confirm(`Are you sure you want to delete product "${productName}"?`)) {
      deleteProductMutation.mutate(productId);
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllProducts = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map((p: any) => p.id)));
    }
  };

  return (
    <ModuleLayout
      title="Products"
      description="Manage your inventory and product catalog"
      icon={<Package className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Products & Services", href: "/products" },
        { label: "Products" },
      ]}
      actions={
        <Button onClick={() => navigate("/products/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Toolbar */}
        <ListPageToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search products..."
          onCreateClick={() => navigate("/products/create")}
          createLabel="Add Product"
          onExportClick={() => downloadCSV(filteredProducts.map((p: any) => ({ SKU: p.sku || "", Name: p.name, Category: p.category || "", Price: p.price, Stock: p.stockQuantity || 0, Status: p.isActive ? "Active" : "Inactive" })), "products")}
          onImportClick={() => { toast.info("Navigate to import page"); navigate("/products/import"); }}
          onPrintClick={() => window.print()}
        />

        {/* Bulk Actions Bar */}
        <EnhancedBulkActions
          selectedCount={selectedProducts.size}
          onClear={() => setSelectedProducts(new Set())}
          actions={[
            { id: "activate", label: "Activate", icon: <CheckCircle2 className="h-3.5 w-3.5" />, onClick: async () => { let count = 0; for (const id of selectedProducts) { try { await updateProductMutation.mutateAsync({ id, status: 'active' }); count++; } catch {} } toast.success(`Activated ${count} products`); setSelectedProducts(new Set()); } },
            { id: "deactivate", label: "Deactivate", icon: <XCircle className="h-3.5 w-3.5" />, onClick: async () => { let count = 0; for (const id of selectedProducts) { try { await updateProductMutation.mutateAsync({ id, status: 'inactive' }); count++; } catch {} } toast.success(`Deactivated ${count} products`); setSelectedProducts(new Set()); } },
            bulkExportAction(selectedProducts, products, productColumns, "products"),
            bulkCopyIdsAction(selectedProducts),
            bulkDeleteAction(selectedProducts, (ids) => bulkDeleteProductsMutation.mutate(ids)),
          ]}
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard label="Total Products" value={products.length} icon={<Package className="h-5 w-5" />} color="border-l-orange-500" />
          <StatsCard
            label="Active"
            value={products.filter((p: any) => p.isActive !== 0).length}
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="border-l-green-500"
          />
          <StatsCard
            label="Low Stock"
            value={products.filter((p: any) => (p.stockQuantity || 0) <= (p.minStockLevel || 0)).length}
            icon={<AlertTriangle className="h-5 w-5" />}
            color="border-l-orange-500"
          />
          <StatsCard
            label="Inactive"
            value={products.filter((p: any) => p.isActive === 0).length}
            icon={<XCircle className="h-5 w-5" />}
            color="border-l-red-500"
          />
        </div>

        {/* Products Table */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm text-muted-foreground">{filteredProducts.length} products</span>
              <TableColumnSettings columns={productColumns} visibleColumns={visibleColumns} onToggleColumn={toggleColumn} onReset={reset} pageSize={pageSize} onPageSizeChange={updatePageSize} />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0} onCheckedChange={toggleSelectAllProducts} /></TableHead>
                  {isVisible("sku") && <TableHead>SKU</TableHead>}
                  {isVisible("name") && <TableHead>Name</TableHead>}
                  {isVisible("category") && <TableHead className="hidden md:table-cell">Category</TableHead>}
                  {isVisible("price") && <TableHead>Price</TableHead>}
                  {isVisible("stock") && <TableHead>Stock</TableHead>}
                  {isVisible("status") && <TableHead className="hidden md:table-cell">Status</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading products...
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No products found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.sku || "N/A"}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell className="hidden md:table-cell">{product.category || "Uncategorized"}</TableCell>
                      <TableCell>Ksh {(Number(product.unitPrice) / 100).toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={(product.stockQuantity || 0) <= (product.minStockLevel || 0) ? "text-red-600 font-medium" : ""}>
                          {product.stockQuantity} {product.unit || "pcs"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {product.isActive !== 0 ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => navigate(`/products/${product.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => navigate(`/products/${product.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteProduct(product.id, product.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
