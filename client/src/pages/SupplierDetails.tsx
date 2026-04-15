import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { CitySelect } from "@/components/LocationSelects";
import { ArrowLeft, Loader2, Star, Save, Edit, Mail, Phone, MapPin, Globe, Truck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useFavorite } from "@/hooks/useFavorite";

export default function SupplierDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const { isStarred, toggleStar } = useFavorite("supplier", id || "");

  const { data: supplier, isLoading, refetch } = trpc.suppliers.getById.useQuery(id);

  const [formData, setFormData] = useState({
    companyName: supplier?.companyName || "",
    contactPerson: supplier?.contactPerson || "",
    email: supplier?.email || "",
    phone: supplier?.phone || "",
    alternatePhone: supplier?.alternatePhone || "",
    address: supplier?.address || "",
    city: supplier?.city || "",
    postalCode: supplier?.postalCode || "",
    website: supplier?.website || "",
    paymentTerms: supplier?.paymentTerms || "",
    notes: supplier?.notes || "",
    qualityRating: supplier?.qualityRating || 0,
    deliveryRating: supplier?.deliveryRating || 0,
    priceCompetitiveness: supplier?.priceCompetitiveness || 0,
  });

  const updateMutation = trpc.suppliers.update.useMutation({
    onSuccess: () => {
      toast.success("Supplier updated successfully");
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update supplier");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: id!,
      companyName: formData.companyName,
      contactPerson: String(formData.contactPerson),
      email: String(formData.email),
      phone: formData.phone ? String(formData.phone) : undefined,
      paymentTerms: formData.paymentTerms ? String(formData.paymentTerms) : undefined,
      notes: formData.notes ? String(formData.notes) : undefined,
      qualityRating: Number(formData.qualityRating),
      deliveryRating: Number(formData.deliveryRating),
      priceCompetitiveness: Number(formData.priceCompetitiveness),
    });
  };

  const numericFields = new Set(["qualityRating", "deliveryRating", "priceCompetitiveness"]);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: numericFields.has(name)
        ? value === "" ? 0 : isNaN(Number(value)) ? prev[name as keyof typeof prev] : Number(value)
        : value,
    }));
  };

  if (isLoading) {
    return (
      <ModuleLayout title="Supplier Details" icon={<Truck className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Suppliers", href: "/suppliers"}, {label: "Details"}]} backLink={{label: "Suppliers", href: "/suppliers"}}>
        <div className="flex justify-center items-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ModuleLayout>
    );
  }

  if (!supplier) {
    return (
      <ModuleLayout title="Supplier Details" icon={<Truck className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Suppliers", href: "/suppliers"}, {label: "Details"}]} backLink={{label: "Suppliers", href: "/suppliers"}}>
        <div className="text-center py-12">Supplier not found</div>
      </ModuleLayout>
    );
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 80) return "text-green-600";
    if (rating >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      pre_qualified: "bg-blue-100 text-blue-800",
      qualified: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      inactive: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <ModuleLayout title="Supplier Details" icon={<Truck className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Suppliers", href: "/suppliers"}, {label: "Details"}]} backLink={{label: "Suppliers", href: "/suppliers"}}>
      <div className="space-y-4">
        {/* Action bar */}
        <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={toggleStar}><Star className={`h-4 w-4 ${isStarred ? "fill-amber-400 text-amber-400" : ""}`} /></Button>
            <Button variant="ghost" size="icon" onClick={() => { if (supplier.email) window.location.href = `mailto:${supplier.email}`; }}><Mail className="h-4 w-4" /></Button>
            {!isEditing ? (
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}><Edit className="h-4 w-4" /></Button>
            ) : null}
        </div>

        {/* Split Layout */}
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="w-[320px] min-w-[320px] space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h2 className="text-xl font-bold">{supplier.companyName}</h2>
                  <p className="text-sm text-muted-foreground">#{supplier.supplierNumber}</p>
                </div>
                <Badge className={getStatusBadgeColor(supplier.qualificationStatus)}>
                  {supplier.qualificationStatus.replace("_", " ")}
                </Badge>
                <Separator />
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{supplier.phone || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{supplier.email || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Address</p>
                      <p className="font-medium">{supplier.address || "—"}{supplier.city ? `, ${supplier.city}` : ""}</p>
                    </div>
                  </div>
                  {supplier.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Website</p>
                        <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600">{supplier.website}</a>
                      </div>
                    </div>
                  )}
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Ratings</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-muted-foreground">Quality</p>
                      <p className={`font-bold ${getRatingColor(supplier.qualityRating)}`}>{supplier.qualityRating}/100</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-muted-foreground">Delivery</p>
                      <p className={`font-bold ${getRatingColor(supplier.deliveryRating)}`}>{supplier.deliveryRating}/100</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-muted-foreground">Price</p>
                      <p className={`font-bold ${getRatingColor(supplier.priceCompetitiveness)}`}>{supplier.priceCompetitiveness}/100</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-muted-foreground">Overall</p>
                      <p className={`font-bold ${getRatingColor(supplier.averageRating)}`}>{supplier.averageRating}/100</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Content */}
          <div className="flex-1 min-w-0">
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="bank">Bank Details</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

          {/* Details Tab */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Supplier Number</p>
                    <p className="font-semibold mt-1">{supplier.supplierNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={`mt-1 ${getStatusBadgeColor(supplier.qualificationStatus)}`}>
                      {supplier.qualificationStatus.replace("_", " ")}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tax ID</p>
                    <p className="font-semibold mt-1">{supplier.taxId || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="font-semibold mt-1">{supplier.totalOrders}</p>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name</Label>
                        <Input
                          id="companyName"
                          name="companyName"
                          value={formData.companyName}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          name="website"
                          value={formData.website}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground">Website</p>
                    <p className="font-semibold mt-1">
                      {supplier.website ? (
                        <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                          {supplier.website}
                        </a>
                      ) : (
                        "-"
                      )}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactPerson">Contact Person</Label>
                        <Input
                          id="contactPerson"
                          name="contactPerson"
                          value={formData.contactPerson}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="alternatePhone">Alternate Phone</Label>
                        <Input
                          id="alternatePhone"
                          name="alternatePhone"
                          value={formData.alternatePhone}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <CitySelect
                          value={formData.city || ""}
                          onChange={(value) => setFormData((prev) => ({ ...prev, city: value }))}
                          label=""
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input
                          id="postalCode"
                          name="postalCode"
                          value={formData.postalCode}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Contact Person</p>
                        <p className="font-semibold mt-1">{supplier.contactPerson || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <a href={`mailto:${supplier.email}`} className="font-semibold mt-1 text-blue-600">
                          {supplier.email || "-"}
                        </a>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-semibold mt-1">{supplier.phone || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Alternate Phone</p>
                        <p className="font-semibold mt-1">{supplier.alternatePhone || "-"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-semibold mt-1">{supplier.address || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">City</p>
                        <p className="font-semibold mt-1">{supplier.city || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Postal Code</p>
                        <p className="font-semibold mt-1">{supplier.postalCode || "-"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bank Tab */}
          <TabsContent value="bank">
            <Card>
              <CardHeader>
                <CardTitle>Bank Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Bank Name</p>
                      <p className="font-semibold mt-1">{supplier.bankName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Branch</p>
                      <p className="font-semibold mt-1">{supplier.bankBranch || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Number</p>
                      <p className="font-semibold mt-1">{supplier.accountNumber || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Name</p>
                      <p className="font-semibold mt-1">{supplier.accountName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Terms</p>
                      <p className="font-semibold mt-1">{formData.paymentTerms || "-"}</p>
                    </div>
                  </div>
                  {isEditing && (
                    <div className="space-y-2">
                      <Label htmlFor="paymentTerms">Payment Terms</Label>
                      <Input
                        id="paymentTerms"
                        name="paymentTerms"
                        value={formData.paymentTerms}
                        onChange={handleInputChange}
                        placeholder="e.g., Net 30"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>Ratings & Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isEditing && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="qualityRating">Quality Rating (0-100)</Label>
                        <Input
                          id="qualityRating"
                          name="qualityRating"
                          type="number"
                          min="0"
                          max="100"
                          value={formData.qualityRating}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deliveryRating">Delivery Rating (0-100)</Label>
                        <Input
                          id="deliveryRating"
                          name="deliveryRating"
                          type="number"
                          min="0"
                          max="100"
                          value={formData.deliveryRating}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="priceCompetitiveness">Price Competitiveness (0-100)</Label>
                        <Input
                          id="priceCompetitiveness"
                          name="priceCompetitiveness"
                          type="number"
                          min="0"
                          max="100"
                          value={formData.priceCompetitiveness}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">{isEditing ? "Edit Notes" : "Notes"}</Label>
                  {isEditing ? (
                    <RichTextEditor
                      value={formData.notes}
                      onChange={(html) => setFormData(prev => ({ ...prev, notes: html }))}
                      placeholder="Add internal notes about this supplier..."
                      minHeight="100px"
                    />
                  ) : (
                    <p className="text-sm mt-1">{supplier.notes || "-"}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        {isEditing && (
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
