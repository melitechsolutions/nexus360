import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleLayout } from "@/components/ModuleLayout";
import { FormField, FormTextInput, FormTextarea, FormSelect } from "@/components/FormField";
import { Plus, Loader2, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CreateSupplierPage() {
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    paymentMethods: [] as string[],
    categories: [] as string[],
    certifications: [] as string[],
    qualificationStatus: "pending" as const,
    qualificationDate: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = trpc.suppliers.create.useMutation({
    onSuccess: (data) => {
      toast.success("Supplier created successfully");
      navigate(`/suppliers/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create supplier");
      setIsSubmitting(false);
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
      await createMutation.mutateAsync({
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
        paymentMethods: formData.paymentMethods.length > 0 ? formData.paymentMethods : undefined,
        categories: formData.categories.length > 0 ? formData.categories : undefined,
        certifications: formData.certifications.length > 0 ? formData.certifications : undefined,
        qualificationStatus: formData.qualificationStatus,
        qualificationDate: formData.qualificationDate || undefined,
        notes: formData.notes || undefined,
      });
    } catch (error) {
      console.error("Error creating supplier:", error);
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

  return (
    <ModuleLayout
      title="Add Supplier"
      description="Create a new supplier in the system"
      icon={<Plus className="w-5 h-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Suppliers", href: "/suppliers" }, { label: "Create" }]}
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
                  <FormSelect
                    value={formData.contactTitle}
                    onValueChange={(value) => handleInputChange("contactTitle", value)}
                  >
                    <option value="">Select title...</option>
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Ms">Ms</option>
                    <option value="Dr">Dr</option>
                    <option value="Eng">Eng</option>
                    <option value="Prof">Prof</option>
                  </FormSelect>
                </FormField>
              </div>

              <FormField label="Website" error={errors.website}>
                <FormTextInput
                  placeholder="https://example.com"
                  value={formData.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                />
              </FormField>

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
              <CardTitle>Supplier Status & Classification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <FormField label="Payment Methods" error={errors.paymentMethods}>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {["bank_transfer", "cheque", "mpesa", "cash", "credit_card", "letter_of_credit"].map((method) => (
                      <Badge
                        key={method}
                        variant={formData.paymentMethods.includes(method) ? "default" : "outline"}
                        className="cursor-pointer capitalize"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            paymentMethods: prev.paymentMethods.includes(method)
                              ? prev.paymentMethods.filter(m => m !== method)
                              : [...prev.paymentMethods, method]
                          }));
                        }}
                      >
                        {method.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              </FormField>

              <FormField label="Supply Categories" error={errors.categories}>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {["office_supplies", "it_equipment", "furniture", "stationery", "cleaning", "security", "catering", "transport", "construction", "electrical", "plumbing", "consulting", "legal", "marketing", "printing"].map((cat) => (
                      <Badge
                        key={cat}
                        variant={formData.categories.includes(cat) ? "default" : "outline"}
                        className="cursor-pointer capitalize"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            categories: prev.categories.includes(cat)
                              ? prev.categories.filter(c => c !== cat)
                              : [...prev.categories, cat]
                          }));
                        }}
                      >
                        {cat.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              </FormField>

              <FormField label="Certifications" error={errors.certifications}>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {["ISO_9001", "ISO_14001", "ISO_45001", "AGPO", "NCA", "KEBS", "NEMA", "tax_compliant"].map((cert) => (
                      <Badge
                        key={cert}
                        variant={formData.certifications.includes(cert) ? "default" : "outline"}
                        className="cursor-pointer capitalize"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            certifications: prev.certifications.includes(cert)
                              ? prev.certifications.filter(c => c !== cert)
                              : [...prev.certifications, cert]
                          }));
                        }}
                      >
                        {cert.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              </FormField>
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField label="Notes" error={errors.notes}>
                <FormTextarea
                  placeholder="Additional notes about this supplier..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  rows={4}
                />
              </FormField>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-6 pb-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/suppliers")}
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
              {isSubmitting ? "Creating..." : "Create Supplier"}
            </Button>
          </div>
        </form>
      </div>
    </ModuleLayout>
  );
}
