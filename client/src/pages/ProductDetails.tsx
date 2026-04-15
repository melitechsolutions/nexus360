import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, Package } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import { RichTextDisplay } from "@/components/RichTextEditor";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import mutateAsync from "@/lib/mutationHelpers";

export default function ProductDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch product from backend
  const { data: productData, isLoading } = trpc.products.getById.useQuery(id || "");
  const utils = trpc.useUtils();
  
  const deleteProductMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted successfully");
      utils.products.list.invalidate();
      navigate("/products");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete product");
    },
  });

  const product = productData ? {
    id: productData.id || id || "1",
    name: (productData as any).name || "Unknown Product",
    sku: (productData as any).sku || `SKU-${id}`,
    category: (productData as any).category || "General",
    price: ((productData as any).price || 0) / 100,
    cost: ((productData as any).cost || 0) / 100,
    stock: (productData as any).stockQuantity || 0,
    status: (productData as any).status || "active",
    description: (productData as any).description || "",
  } : null;

  const handleEdit = () => {
    navigate(`/products/${id}/edit`);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await mutateAsync(deleteProductMutation, id || "");
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) {
    return (
      <ModuleLayout title="Product Details" icon={<Package className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Products", href: "/products"}, {label: "Details"}]} backLink={{label: "Products", href: "/products"}}>
        <div className="flex items-center justify-center h-64">
          <p>Loading product...</p>
        </div>
      </ModuleLayout>
    );
  }

  if (!product) {
    return (
      <ModuleLayout title="Product Details" icon={<Package className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Products", href: "/products"}, {label: "Details"}]} backLink={{label: "Products", href: "/products"}}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p>Product not found</p>
          <Button onClick={() => navigate("/products")}>Back to Products</Button>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout title="Product Details" description={product.sku} icon={<Package className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Products", href: "/products"}, {label: "Details"}]} backLink={{label: "Products", href: "/products"}}>
      <div className="space-y-6">
        <div className="flex gap-2">
          <Button onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Name</label>
                <p className="text-muted-foreground">{product.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Badge>{product.status}</Badge>
              </div>
              <div>
                <label className="text-sm font-medium">Price</label>
                <p className="text-muted-foreground">Ksh {(product.price || 0).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Stock</label>
                <p className="text-muted-foreground">{product.stock} units</p>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="mt-4 pt-4 border-t">
                <label className="text-sm font-medium">Description</label>
                <div className="mt-1">
                  <RichTextDisplay html={product.description} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
      />
    </ModuleLayout>
  );
}
