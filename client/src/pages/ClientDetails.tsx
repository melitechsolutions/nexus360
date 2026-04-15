import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
// DeleteConfirmationModal removed; using browser confirm via actions
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { handleDelete as actionsHandleDelete } from "@/lib/actions";
import {
  ArrowLeft,
  Save,
  Upload,
  Building2,
  User,
  Users,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  FileText,
  DollarSign,
  Shield,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Edit,
  Trash2,
  Star,
  ExternalLink,
  Globe,
  Tag,
} from "lucide-react";
import { logDelete } from "@/lib/activityLog";
import { RichTextDisplay } from "@/components/RichTextEditor";
import { trpc } from "@/lib/trpc";
import mutateAsync from "@/lib/mutationHelpers";
import { computeHealthScore } from "@/lib/healthScore";
import { useFavorite } from "@/hooks/useFavorite";

export default function ClientDetails() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [clientType, setClientType] = useState<"individual" | "corporate">("corporate");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch client data from backend
  const { data: clientData, isLoading } = trpc.clients.getById.useQuery(params.id as string, {
    enabled: !!params.id,
  });

  // Fetch invoices and projects for health score
  const { data: clientInvoices = [] } = trpc.invoices.byClient.useQuery(
    { clientId: params.id as string },
    { enabled: !!params.id }
  );
  const { data: clientProjects = [] } = trpc.projects.byClient.useQuery(
    { clientId: params.id as string },
    { enabled: !!params.id }
  );

  const utils = trpc.useUtils();
  
  // Delete mutation - moved to component level
  const deleteClientMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      const clientName = clientType === "corporate" ? corporateInfo.companyLegalName : `${personalInfo.firstName} ${personalInfo.lastName}`;
      logDelete("Clients", params.id as string, clientName);
      // toast will be shown by actions.handleDelete wrapper
      setIsDeleteOpen(false);
      setLocation("/clients");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete client");
    },
    onSettled: () => {
      setIsDeleting(false);
    },
  });

  // Personal/Individual Information
  const [personalInfo, setPersonalInfo] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    nationality: "Kenyan",
    idType: "national_id",
    idNumber: "",
    idIssueDate: "",
    idExpiryDate: "",
    kraPin: "",
    maritalStatus: "",
    occupation: "",
    employer: "",
    employmentStatus: "",
  });

  // Corporate Information
  const [corporateInfo, setCorporateInfo] = useState({
    companyLegalName: "",
    tradingName: "",
    registrationNumber: "",
    incorporationDate: "",
    incorporationCountry: "Kenya",
    businessType: "Limited Company",
    industry: "",
    numberOfEmployees: "",
    annualRevenue: "",
    kraPin: "",
    vatNumber: "",
  });

  // Contact Information
  const [contactInfo, setContactInfo] = useState({
    primaryPhone: "",
    secondaryPhone: "",
    email: "",
    website: "",
    physicalAddress: "",
    city: "",
    county: "",
    postalCode: "",
    mailingAddress: "",
    preferredContact: "email",
  });

  const clientName = clientType === "corporate" ? corporateInfo.companyLegalName : `${personalInfo.firstName} ${personalInfo.lastName}`;
  const { isStarred, toggleStar } = useFavorite("client", params.id as string, clientName);

  // Load client data when component mounts or clientData changes
  useEffect(() => {
    if (clientData) {
      setCorporateInfo({
        companyLegalName: clientData.companyName || "",
        tradingName: "",
        registrationNumber: clientData.taxId || "",
        incorporationDate: "",
        incorporationCountry: clientData.country || "Kenya",
        businessType: "Limited Company",
        industry: clientData.industry || "",
        numberOfEmployees: "",
        annualRevenue: "",
        kraPin: clientData.taxId || "",
        vatNumber: "",
      });
      setContactInfo({
        primaryPhone: clientData.phone || "",
        secondaryPhone: "",
        email: clientData.email || "",
        website: clientData.website || "",
        physicalAddress: clientData.address || "",
        city: clientData.city || "",
        county: "",
        postalCode: clientData.postalCode || "",
        mailingAddress: "",
        preferredContact: "email",
      });
    }
  }, [clientData]);

  // Key Personnel (for corporate)
  const [personnel, setPersonnel] = useState([
    {
      name: "",
      idNumber: "",
      position: "",
      shareholding: "",
    },
  ]);

  // Financial Information
  const [financialInfo, setFinancialInfo] = useState({
    bankName: "",
    bankBranch: "",
    accountNumber: "",
    accountType: "Current",
    paymentTerms: "Net 30",
    creditLimit: "",
  });

  // Risk Assessment
  const [riskInfo, setRiskInfo] = useState({
    sourceOfFunds: "",
    businessPurpose: "",
    expectedVolume: "High",
    expectedFrequency: "Monthly",
    pepStatus: "No",
    riskRating: "Low",
  });

  const handleSave = async () => {
    const clientId = params.id;
    if (!clientId) {
      toast.error("Client ID not found");
      return;
    }

    try {
      const updateMutation = trpc.clients.update.useMutation();
      const clientName = clientType === "corporate" ? corporateInfo.companyLegalName : `${personalInfo.firstName} ${personalInfo.lastName}`;
      
      // Prepare update data
      const updateData = {
        id: clientId,
        companyName: clientType === "corporate" ? corporateInfo.companyLegalName : clientName,
        contactPerson: clientType === "individual" ? personalInfo.firstName : "Contact",
        email: contactInfo.email,
        phone: contactInfo.primaryPhone,
        address: contactInfo.physicalAddress,
        directors: JSON.stringify(personnel),
      };
      
      await mutateAsync(updateMutation, updateData);
      toast.success("Client information saved successfully!");
    } catch (error) {
      toast.error("Failed to save client information");
    }
  };

  const handleEdit = () => {
    setLocation(`/clients/${params.id}/edit`);
  };

  const onDelete = () => {
    const clientId = params.id;
    if (!clientId) {
      toast.error("Client ID not found");
      return;
    }
    setIsDeleting(true);
    actionsHandleDelete(clientId, "client", () => mutateAsync(deleteClientMutation, clientId));
  };

  return (
    <ModuleLayout title="Client Details" icon={<Users className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Clients", href: "/clients"}, {label: "Details"}]} backLink={{label: "Clients", href: "/clients"}}>
      <div className="space-y-4">
        {/* Action bar */}
        <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleStar}><Star className={`h-4 w-4 ${isStarred ? "fill-amber-400 text-amber-400" : ""}`} /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (contactInfo.email) window.location.href = `mailto:${contactInfo.email}`; else toast.error("No email address"); }}><Mail className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleEdit}><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setIsDeleteOpen(true)}><Trash2 className="h-4 w-4" /></Button>
        </div>

        {/* Split Layout: Left Sidebar + Right Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT SIDEBAR — Client Summary Panel */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            <Card>
              <CardContent className="p-5 space-y-4">
                {/* Client Name & Badge */}
                <div className="space-y-2">
                  <h2 className="text-xl font-bold">
                    {clientType === "corporate" ? corporateInfo.companyLegalName : `${personalInfo.firstName} ${personalInfo.lastName}`}
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{clientType === "corporate" ? "Corporate" : "Individual"}</Badge>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                </div>

                <Separator />

                {/* Key Fields */}
                <div className="space-y-3 text-sm">
                  {contactInfo.primaryPhone && (
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span>{contactInfo.primaryPhone}</span>
                    </div>
                  )}
                  {contactInfo.email && (
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span className="break-all">{contactInfo.email}</span>
                    </div>
                  )}
                  {contactInfo.physicalAddress && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span>{contactInfo.physicalAddress}{contactInfo.city ? `, ${contactInfo.city}` : ""}</span>
                    </div>
                  )}
                  {contactInfo.website && (
                    <div className="flex items-start gap-2">
                      <Globe className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span>{contactInfo.website}</span>
                    </div>
                  )}
                  {corporateInfo.industry && (
                    <div className="flex items-start gap-2">
                      <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span>{corporateInfo.industry}</span>
                    </div>
                  )}
                  {corporateInfo.kraPin && (
                    <div className="flex items-start gap-2">
                      <Tag className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span>KRA: {corporateInfo.kraPin}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Financial Summary */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Financials</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 rounded-md bg-muted/50">
                      <p className="text-muted-foreground text-xs">Invoices</p>
                      <p className="font-semibold">{clientInvoices.length}</p>
                    </div>
                    <div className="p-2 rounded-md bg-muted/50">
                      <p className="text-muted-foreground text-xs">Projects</p>
                      <p className="font-semibold">{clientProjects.length}</p>
                    </div>
                    <div className="p-2 rounded-md bg-muted/50">
                      <p className="text-muted-foreground text-xs">Bank</p>
                      <p className="font-semibold">{financialInfo.bankName || "—"}</p>
                    </div>
                    <div className="p-2 rounded-md bg-muted/50">
                      <p className="text-muted-foreground text-xs">Terms</p>
                      <p className="font-semibold">{financialInfo.paymentTerms || "—"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Health Score Sidebar Card */}
            {(clientInvoices.length > 0 || clientProjects.length > 0) && (() => {
              const health = computeHealthScore(clientInvoices, clientProjects);
              return (
                <Card>
                  <CardContent className="p-5 space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Health Score</h3>
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 60 60">
                          <circle cx="30" cy="30" r="24" strokeWidth="6" fill="none" stroke="#e5e7eb" />
                          <circle cx="30" cy="30" r="24" strokeWidth="6" fill="none"
                            stroke={health.color}
                            strokeDasharray={`${2 * Math.PI * 24}`}
                            strokeDashoffset={`${2 * Math.PI * 24 * (1 - health.score / 100)}`}
                            strokeLinecap="round" />
                        </svg>
                        <span className="text-lg font-bold z-10">{health.score}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: health.color }}>{health.label}</p>
                        <p className="text-xs text-muted-foreground">Client Health</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {health.breakdown.map((item) => (
                        <div key={item.label} className="flex items-center gap-2 text-xs">
                          <span className="w-16 text-muted-foreground shrink-0">{item.label}</span>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${item.value}%`, background: item.color }} />
                          </div>
                          <span className="w-6 text-right text-muted-foreground">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>

          {/* RIGHT CONTENT — Tabbed Detail Area */}
          <div className="flex-1 min-w-0">
          <Tabs defaultValue="details" className="space-y-4">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
              <TabsTrigger value="contact" className="text-xs">Contact</TabsTrigger>
              <TabsTrigger value="personnel" className="text-xs">Personnel</TabsTrigger>
              <TabsTrigger value="financial" className="text-xs">Financial</TabsTrigger>
              <TabsTrigger value="risk" className="text-xs">Risk & Compliance</TabsTrigger>
              <TabsTrigger value="projects" className="text-xs">Projects</TabsTrigger>
              <TabsTrigger value="invoices" className="text-xs">Invoices</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
            </TabsList>

          {/* Details Tab (was Basic Info) */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Client Type</CardTitle>
                    <CardDescription>Select whether this is an individual or corporate client</CardDescription>
                  </div>
                  <Select value={clientType} onValueChange={(v: any) => setClientType(v)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
            </Card>

            {clientType === "corporate" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Corporate Information
                  </CardTitle>
                  <CardDescription>Company registration and business details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="companyLegalName">Company Legal Name *</Label>
                      <Input
                        id="companyLegalName"
                        value={corporateInfo.companyLegalName}
                        onChange={(e) => setCorporateInfo({ ...corporateInfo, companyLegalName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tradingName">Trading Name</Label>
                      <Input
                        id="tradingName"
                        value={corporateInfo.tradingName}
                        onChange={(e) => setCorporateInfo({ ...corporateInfo, tradingName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registrationNumber">Registration Number *</Label>
                      <Input
                        id="registrationNumber"
                        value={corporateInfo.registrationNumber}
                        onChange={(e) => setCorporateInfo({ ...corporateInfo, registrationNumber: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="incorporationDate">Date of Incorporation</Label>
                      <Input
                        id="incorporationDate"
                        type="date"
                        value={corporateInfo.incorporationDate}
                        onChange={(e) => setCorporateInfo({ ...corporateInfo, incorporationDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="incorporationCountry">Country of Incorporation</Label>
                      <Input
                        id="incorporationCountry"
                        value={corporateInfo.incorporationCountry}
                        onChange={(e) => setCorporateInfo({ ...corporateInfo, incorporationCountry: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessType">Business Type</Label>
                      <Select value={corporateInfo.businessType} onValueChange={(v) => setCorporateInfo({ ...corporateInfo, businessType: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Limited Company">Limited Company</SelectItem>
                          <SelectItem value="Partnership">Partnership</SelectItem>
                          <SelectItem value="Sole Proprietor">Sole Proprietor</SelectItem>
                          <SelectItem value="NGO">NGO</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry/Sector</Label>
                      <Input
                        id="industry"
                        value={corporateInfo.industry}
                        onChange={(e) => setCorporateInfo({ ...corporateInfo, industry: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numberOfEmployees">Number of Employees</Label>
                      <Select value={corporateInfo.numberOfEmployees} onValueChange={(v) => setCorporateInfo({ ...corporateInfo, numberOfEmployees: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10</SelectItem>
                          <SelectItem value="11-50">11-50</SelectItem>
                          <SelectItem value="50-100">50-100</SelectItem>
                          <SelectItem value="100-500">100-500</SelectItem>
                          <SelectItem value="500+">500+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annualRevenue">Annual Revenue Range</Label>
                      <Select value={corporateInfo.annualRevenue} onValueChange={(v) => setCorporateInfo({ ...corporateInfo, annualRevenue: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<1M">&lt; 1M</SelectItem>
                          <SelectItem value="1M-10M">1M - 10M</SelectItem>
                          <SelectItem value="10M-50M">10M - 50M</SelectItem>
                          <SelectItem value="50M-100M">50M - 100M</SelectItem>
                          <SelectItem value="100M+">100M+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="kraPin">KRA PIN *</Label>
                      <Input
                        id="kraPin"
                        value={corporateInfo.kraPin}
                        onChange={(e) => setCorporateInfo({ ...corporateInfo, kraPin: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vatNumber">VAT Registration Number</Label>
                      <Input
                        id="vatNumber"
                        value={corporateInfo.vatNumber}
                        onChange={(e) => setCorporateInfo({ ...corporateInfo, vatNumber: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Individual client details and identification</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={personalInfo.firstName}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="middleName">Middle Name</Label>
                      <Input
                        id="middleName"
                        value={personalInfo.middleName}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, middleName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={personalInfo.lastName}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={personalInfo.dateOfBirth}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select value={personalInfo.gender} onValueChange={(v) => setPersonalInfo({ ...personalInfo, gender: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nationality">Nationality</Label>
                      <Input
                        id="nationality"
                        value={personalInfo.nationality}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, nationality: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="idType">ID Type</Label>
                      <Select value={personalInfo.idType} onValueChange={(v) => setPersonalInfo({ ...personalInfo, idType: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="national_id">National ID</SelectItem>
                          <SelectItem value="passport">Passport</SelectItem>
                          <SelectItem value="drivers_license">Driver's License</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="idNumber">ID Number *</Label>
                      <Input
                        id="idNumber"
                        value={personalInfo.idNumber}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, idNumber: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="kraPin">KRA PIN</Label>
                      <Input
                        id="kraPin"
                        value={personalInfo.kraPin}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, kraPin: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </TabsContent>

          {/* Contact Information Tab */}
          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contact Information
                </CardTitle>
                <CardDescription>Phone, email, and address details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="primaryPhone">Primary Phone *</Label>
                    <Input
                      id="primaryPhone"
                      value={contactInfo.primaryPhone}
                      onChange={(e) => setContactInfo({ ...contactInfo, primaryPhone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryPhone">Secondary Phone</Label>
                    <Input
                      id="secondaryPhone"
                      value={contactInfo.secondaryPhone}
                      onChange={(e) => setContactInfo({ ...contactInfo, secondaryPhone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={contactInfo.email}
                      onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={contactInfo.website}
                      onChange={(e) => setContactInfo({ ...contactInfo, website: e.target.value })}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="physicalAddress">Physical Address *</Label>
                    <Textarea
                      id="physicalAddress"
                      value={contactInfo.physicalAddress}
                      onChange={(e) => setContactInfo({ ...contactInfo, physicalAddress: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mailingAddress">Mailing Address (if different)</Label>
                    <Textarea
                      id="mailingAddress"
                      value={contactInfo.mailingAddress}
                      onChange={(e) => setContactInfo({ ...contactInfo, mailingAddress: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={contactInfo.city}
                      onChange={(e) => setContactInfo({ ...contactInfo, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="county">County</Label>
                    <Input
                      id="county"
                      value={contactInfo.county}
                      onChange={(e) => setContactInfo({ ...contactInfo, county: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={contactInfo.postalCode}
                      onChange={(e) => setContactInfo({ ...contactInfo, postalCode: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preferredContact">Preferred Contact Method</Label>
                    <Select value={contactInfo.preferredContact} onValueChange={(v) => setContactInfo({ ...contactInfo, preferredContact: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </TabsContent>

          {/* Key Personnel Tab */}
          <TabsContent value="personnel" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Key Personnel
                    </CardTitle>
                    <CardDescription>
                      Directors, partners, and beneficial owners
                    </CardDescription>
                  </div>
                  <Button onClick={() => setPersonnel([...personnel, { name: "", idNumber: "", position: "", shareholding: "" }])}>
                    <User className="mr-2 h-4 w-4" />
                    Add Person
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {personnel.map((person, index) => (
                    <Card key={person.name || person.idNumber || `person-${index}`}>
                      <CardContent className="pt-6">
                        <div className="grid gap-4 md:grid-cols-4">
                          <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input
                              value={person.name}
                              onChange={(e) => {
                                const updated = [...personnel];
                                updated[index].name = e.target.value;
                                setPersonnel(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>ID Number</Label>
                            <Input
                              value={person.idNumber}
                              onChange={(e) => {
                                const updated = [...personnel];
                                updated[index].idNumber = e.target.value;
                                setPersonnel(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Position</Label>
                            <Input
                              value={person.position}
                              onChange={(e) => {
                                const updated = [...personnel];
                                updated[index].position = e.target.value;
                                setPersonnel(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Shareholding</Label>
                            <Input
                              value={person.shareholding}
                              onChange={(e) => {
                                const updated = [...personnel];
                                updated[index].shareholding = e.target.value;
                                setPersonnel(updated);
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              const updated = personnel.filter((_, i) => i !== index);
                              setPersonnel(updated);
                              toast.success("Personnel record removed");
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Information Tab */}
          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Information
                </CardTitle>
                <CardDescription>Banking details and payment terms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={financialInfo.bankName}
                      onChange={(e) => setFinancialInfo({ ...financialInfo, bankName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankBranch">Bank Branch</Label>
                    <Input
                      id="bankBranch"
                      value={financialInfo.bankBranch}
                      onChange={(e) => setFinancialInfo({ ...financialInfo, bankBranch: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      value={financialInfo.accountNumber}
                      onChange={(e) => setFinancialInfo({ ...financialInfo, accountNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountType">Account Type</Label>
                    <Select value={financialInfo.accountType} onValueChange={(v) => setFinancialInfo({ ...financialInfo, accountType: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Current">Current</SelectItem>
                        <SelectItem value="Savings">Savings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">Payment Terms</Label>
                    <Select value={financialInfo.paymentTerms} onValueChange={(v) => setFinancialInfo({ ...financialInfo, paymentTerms: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Net 7">Net 7 Days</SelectItem>
                        <SelectItem value="Net 14">Net 14 Days</SelectItem>
                        <SelectItem value="Net 30">Net 30 Days</SelectItem>
                        <SelectItem value="Net 60">Net 60 Days</SelectItem>
                        <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="creditLimit">Credit Limit (KES)</Label>
                    <Input
                      id="creditLimit"
                      type="number"
                      value={financialInfo.creditLimit}
                      onChange={(e) => setFinancialInfo({ ...financialInfo, creditLimit: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </TabsContent>

          {/* Risk & Compliance Tab */}
          <TabsContent value="risk" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Risk Assessment & Compliance
                </CardTitle>
                <CardDescription>KYC and AML compliance information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sourceOfFunds">Source of Funds/Income</Label>
                    <Input
                      id="sourceOfFunds"
                      value={riskInfo.sourceOfFunds}
                      onChange={(e) => setRiskInfo({ ...riskInfo, sourceOfFunds: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessPurpose">Purpose of Business Relationship</Label>
                    <Input
                      id="businessPurpose"
                      value={riskInfo.businessPurpose}
                      onChange={(e) => setRiskInfo({ ...riskInfo, businessPurpose: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expectedVolume">Expected Transaction Volume</Label>
                    <Select value={riskInfo.expectedVolume} onValueChange={(v) => setRiskInfo({ ...riskInfo, expectedVolume: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expectedFrequency">Expected Transaction Frequency</Label>
                    <Select value={riskInfo.expectedFrequency} onValueChange={(v) => setRiskInfo({ ...riskInfo, expectedFrequency: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                        <SelectItem value="Annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pepStatus">Politically Exposed Person (PEP)</Label>
                    <Select value={riskInfo.pepStatus} onValueChange={(v) => setRiskInfo({ ...riskInfo, pepStatus: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="riskRating">Risk Rating</Label>
                    <Select value={riskInfo.riskRating} onValueChange={(v) => setRiskInfo({ ...riskInfo, riskRating: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Last KYC Review</p>
                        <p className="text-sm text-muted-foreground">January 15, 2024</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Completed
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Next KYC Review Due</p>
                        <p className="text-sm text-muted-foreground">January 15, 2025</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Scheduled</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Required Documents
                </CardTitle>
                <CardDescription>Upload and manage client documentation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    "Certificate of Incorporation",
                    "CR12 (Certificate of Registration)",
                    "KRA PIN Certificate",
                    "Tax Compliance Certificate",
                    "Bank Statement (Last 3 months)",
                    "Trade License",
                    "ID/Passport Copies (Directors)",
                    "Proof of Address",
                  ].map((doc) => (
                    <div key={doc} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc}</p>
                          <p className="text-xs text-muted-foreground">Not uploaded</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Upload className="mr-2 h-3 w-3" />
                        Upload
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Projects ({clientProjects.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {clientProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No projects found for this client.</p>
                ) : (
                  <div className="space-y-3">
                    {(clientProjects as any[]).map((project: any) => (
                      <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => setLocation(`/projects/${project.id}`)}>
                        <div>
                          <p className="font-medium">{project.name || project.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {project.status && <Badge variant="outline" className="mr-2 text-xs">{project.status}</Badge>}
                            {project.startDate && `Started ${new Date(project.startDate).toLocaleDateString()}`}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Invoices ({clientInvoices.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {clientInvoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No invoices found for this client.</p>
                ) : (
                  <div className="space-y-3">
                    {(clientInvoices as any[]).map((inv: any) => (
                      <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => setLocation(`/invoices/${inv.id}`)}>
                        <div>
                          <p className="font-medium">{inv.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            <Badge variant={inv.status === "paid" ? "default" : "outline"} className="mr-2 text-xs">{inv.status}</Badge>
                            Due {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{(inv.total || 0).toLocaleString()}</p>
                          <ExternalLink className="h-3 w-3 text-muted-foreground inline" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
          </div>{/* end right content */}
        </div>{/* end split layout */}
      </div>

      {/* Deletion now uses actions.handleDelete wrapper which prompts and calls the TRPC handler */}
    </ModuleLayout>
  );
}

