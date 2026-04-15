import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleLayout } from "@/components/ModuleLayout";
import { FormField, FormTextInput, FormTextarea, FormSelect } from "@/components/FormField";
import { Pencil, Loader2, Trash2, ArrowLeft } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function EditSupplierPage() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/suppliers/:id/edit");
  const supplierId = params?.id;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    contactTitle: "",
    email: "",
    phone: "",
    alternatePhone: "",
    address: "",
    city: "",
    country: "",
    postalCode: "",
    taxId: "",
    registrationNumber: "",
    website: "",
    bankName: "",
    bankBranch: "",
    accountNumber: "",
    accountName: "",
    paymentTerms: "",
    qualificationStatus: "pending" as const,
    qualificationDate: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Query to get supplier data
  const { data: supplier, isLoading } = trpc.suppliers.getById.useQuery(
    supplierId || "",
    { enabled: !!supplierId }
  );

  // Update form when supplier data loaded
  useEffect(() => {
    if (supplier) {
      const s = supplier as any;
      setFormData({
        companyName: s.companyName || "",
        contactPerson: s.contactPerson || "",
        contactTitle: s.contactTitle || "",
        email: s.email || "",
        phone: s.phone || "",
        alternatePhone: s.alternatePhone || "",
        address: s.address || "",
        city: s.city || "",
        country: s.country || "",
        postalCode: s.postalCode || "",
        taxId: s.taxId || "",
        registrationNumber: s.registrationNumber || "",
        website: s.website || "",
        bankName: s.bankName || "",
        bankBranch: s.bankBranch || "",
        accountNumber: s.accountNumber || "",
        accountName: s.accountName || "",
        paymentTerms: s.paymentTerms || "",
        qualificationStatus: s.qualificationStatus || "pending",
        qualificationDate: s.qualificationDate || "",
        notes: s.notes || "",
      });
    }
  }, [supplier]);

  const updateMutation = trpc.suppliers.update.useMutation({
    onSuccess: () => {
      toast.success("Supplier updated successfully");
      navigate(`/suppliers/${supplierId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update supplier");
      setIsSubmitting(false);
    },
  });

  const deleteMutation = trpc.suppliers.delete.useMutation({
    onSuccess: () => {
      toast.success("Supplier deleted successfully");
      navigate("/suppliers");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete supplier");
      setIsDeleting(false);
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = "Company name is required";
    }
    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix validation errors");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateMutation.mutateAsync({
        id: supplierId || "",
        companyName: formData.companyName,
        contactPerson: formData.contactPerson || undefined,
        contactTitle: formData.contactTitle || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        alternatePhone: formData.alternatePhone || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        country: formData.country || undefined,
        postalCode: formData.postalCode || undefined,
        taxId: formData.taxId || undefined,
        registrationNumber: formData.registrationNumber || undefined,
        website: formData.website || undefined,
        bankName: formData.bankName || undefined,
        bankBranch: formData.bankBranch || undefined,
        accountNumber: formData.accountNumber || undefined,
        accountName: formData.accountName || undefined,
        paymentTerms: formData.paymentTerms || undefined,
        qualificationStatus: formData.qualificationStatus,
        qualificationDate: formData.qualificationDate || undefined,
        notes: formData.notes || undefined,
      });
    } catch (error) {
      console.error("Error updating supplier:", error);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync({ id: supplierId || "" });
    } catch (error) {
      console.error("Error deleting supplier:", error);
    }
  };

  const handleInputChange = (
    field: string,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <ModuleLayout
      title="Edit Supplier"
      description={`Update ${formData.companyName || "supplier"} information`}
      icon={<Pencil className="w-5 h-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Suppliers", href: "/suppliers" }, { label: "Edit" }]}
      backLink={{ label: "Suppliers", href: "/suppliers" }}
    >
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Company Name" required error={errors.companyName}>
                <FormTextInput
                  placeholder="Enter company name"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange("companyName", e.target.value)}
                />
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Contact Person" error={errors.contactPerson}>
                  <FormTextInput
                    placeholder="Full name"
                    value={formData.contactPerson}
                    onChange={(e) => handleInputChange("contactPerson", e.target.value)}
                  />
                </FormField>

                <FormField label="Contact Title" error={errors.contactTitle}>
                  <FormTextInput
                    placeholder="e.g., Sales Manager"
                    value={formData.contactTitle}
                    onChange={(e) => handleInputChange("contactTitle", e.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Website" error={errors.website}>
                  <FormTextInput
                    placeholder="https://example.com"
                    value={formData.website}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                  />
                </FormField>
              </div>

              <FormField label="Address" error={errors.address}>
                <FormTextarea
                  placeholder="Street address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                />
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="City" error={errors.city}>
                  <FormTextInput
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                  />
                </FormField>

                <FormField label="Country" error={errors.country}>
                  <FormTextInput
                    placeholder="Country"
                    value={formData.country}
                    onChange={(e) => handleInputChange("country", e.target.value)}
                  />
                </FormField>

                <FormField label="Postal Code" error={errors.postalCode}>
                  <FormTextInput
                    placeholder="Postal code"
                    value={formData.postalCode}
                    onChange={(e) => handleInputChange("postalCode", e.target.value)}
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information Section */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Email" error={errors.email}>
                  <FormTextInput
                    type="email"
                    placeholder="supplier@company.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                  />
                </FormField>

                <FormField label="Phone" error={errors.phone}>
                  <FormTextInput
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                  />
                </FormField>
              </div>

              <FormField label="Alternate Phone" error={errors.alternatePhone}>
                <FormTextInput
                  placeholder="+1 (555) 987-6543"
                  value={formData.alternatePhone}
                  onChange={(e) => handleInputChange("alternatePhone", e.target.value)}
                />
              </FormField>
            </CardContent>
          </Card>

          {/* Tax & Banking Information Section */}
          <Card>
            <CardHeader>
              <CardTitle>Tax & Banking Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Tax ID" error={errors.taxId}>
                  <FormTextInput
                    placeholder="Tax ID number"
                    value={formData.taxId}
                    onChange={(e) => handleInputChange("taxId", e.target.value)}
                  />
                </FormField>

                <FormField label="Registration Number" error={errors.registrationNumber}>
                  <FormTextInput
                    placeholder="Company registration number"
                    value={formData.registrationNumber}
                    onChange={(e) => handleInputChange("registrationNumber", e.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Bank Name" error={errors.bankName}>
                  <FormTextInput
                    placeholder="Bank name"
                    value={formData.bankName}
                    onChange={(e) => handleInputChange("bankName", e.target.value)}
                  />
                </FormField>

                <FormField label="Bank Branch" error={errors.bankBranch}>
                  <FormTextInput
                    placeholder="Branch name/code"
                    value={formData.bankBranch}
                    onChange={(e) => handleInputChange("bankBranch", e.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Account Number" error={errors.accountNumber}>
                  <FormTextInput
                    placeholder="Bank account number"
                    value={formData.accountNumber}
                    onChange={(e) => handleInputChange("accountNumber", e.target.value)}
                  />
                </FormField>

                <FormField label="Account Name" error={errors.accountName}>
                  <FormTextInput
                    placeholder="Account holder name"
                    value={formData.accountName}
                    onChange={(e) => handleInputChange("accountName", e.target.value)}
                  />
                </FormField>
              </div>

              <FormField label="Payment Terms" error={errors.paymentTerms}>
                <FormTextInput
                  placeholder="e.g., Net 30 days"
                  value={formData.paymentTerms}
                  onChange={(e) => handleInputChange("paymentTerms", e.target.value)}
                />
              </FormField>
            </CardContent>
          </Card>

          {/* Status Section */}
          <Card>
            <CardHeader>
              <CardTitle>Supplier Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <FormField label="Qualification Status" error={errors.qualificationStatus}>
                  <FormSelect
                    value={formData.qualificationStatus}
                    onValueChange={(value) =>
                      handleInputChange("qualificationStatus", value)
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="pre_qualified">Pre-Qualified</option>
                    <option value="qualified">Qualified</option>
                    <option value="rejected">Rejected</option>
                    <option value="inactive">Inactive</option>
                  </FormSelect>
                </FormField>

                <FormField label="Qualification Date" error={errors.qualificationDate}>
                  <FormTextInput
                    type="date"
                    value={formData.qualificationDate}
                    onChange={(e) => handleInputChange("qualificationDate", e.target.value)}
                  />
                </FormField>

                <FormField label="Notes" error={errors.notes}>
                  <FormTextarea
                    placeholder="Additional notes about the supplier"
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    rows={4}
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex gap-3 justify-between pt-6 pb-8">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isSubmitting || isDeleting}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Supplier
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this supplier? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex gap-2 justify-end">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Delete
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/suppliers/${supplierId}`)}
                disabled={isSubmitting}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[150px]"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </ModuleLayout>
  );
}
