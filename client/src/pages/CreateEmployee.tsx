import { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Users, UserPlus, Plus, Upload, X, Copy, Check, Save, Shield, CreditCard, MapPin, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function CreateEmployee() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  
  // Fetch departments and job groups from backend
  const { data: departmentsData = [], isLoading: departmentsLoading } = trpc.departments.list.useQuery();
  const { data: jobGroupsData = [], isLoading: jobGroupsLoading } = trpc.jobGroups.list.useQuery();
  
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  
  // Password management state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    employeeNumber: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "",
    maritalStatus: "",
    dateOfBirth: "",
    hireDate: new Date().toISOString().split("T")[0],
    probationEndDate: "",
    contractEndDate: "",
    department: "",
    position: "",
    jobGroupId: "",
    salary: "",
    employmentType: "full_time",
    status: "active",
    photoUrl: "",
    // Identity & Government IDs
    nationalId: "",
    taxId: "",
    nhifNumber: "",
    nssfNumber: "",
    // Address & Emergency Contact
    address: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
    emergencyContact: "",
    // Banking
    bankName: "",
    bankBranch: "",
    bankAccountNumber: "",
  });

  const createEmployeeMutation = trpc.employees.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("Employee created successfully!");
      
      // If a password was generated, show it to the admin
      if (data.generatedPassword) {
        setGeneratedPassword(data.generatedPassword);
        setShowPasswordModal(true);
      } else {
        utils.employees.list.invalidate();
        navigate("/employees");
      }
    },
    onError: (error: any) => {
      toast.error(`Failed to create employee: ${error.message}`);
    },
  });

  const handleCopyPassword = async () => {
    if (generatedPassword) {
      try {
        await navigator.clipboard.writeText(generatedPassword);
        setPasswordCopied(true);
        toast.success("Password copied to clipboard!");
        setTimeout(() => setPasswordCopied(false), 2000);
      } catch (err) {
        toast.error("Failed to copy password");
      }
    }
  };

  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setGeneratedPassword(null);
    setPasswordCopied(false);
    utils.employees.list.invalidate();
    navigate("/employees");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeNumber || !formData.firstName || !formData.lastName || !formData.hireDate || !formData.jobGroupId) {
      toast.error("Please fill in all required fields (including Job Group)");
      return;
    }

    if (photoFile) {
      // Convert photo to base64
      const reader = new FileReader();
      reader.onload = () => {
        const photoDataUrl = reader.result as string;
        createEmployeeMutation.mutate({
          employeeNumber: formData.employeeNumber,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          gender: formData.gender || undefined,
          maritalStatus: formData.maritalStatus || undefined,
          dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
          hireDate: new Date(formData.hireDate),
          probationEndDate: formData.probationEndDate ? new Date(formData.probationEndDate) : undefined,
          contractEndDate: formData.contractEndDate ? new Date(formData.contractEndDate) : undefined,
          department: formData.department || undefined,
          position: formData.position || undefined,
          jobGroupId: formData.jobGroupId,
          salary: formData.salary ? Math.round(parseFloat(formData.salary)) : undefined,
          employmentType: formData.employmentType || undefined,
          status: (formData.status as any) || undefined,
          photoUrl: photoDataUrl,
          nationalId: formData.nationalId || undefined,
          taxId: formData.taxId || undefined,
          nhifNumber: formData.nhifNumber || undefined,
          nssfNumber: formData.nssfNumber || undefined,
          address: formData.address || undefined,
          emergencyContactName: formData.emergencyContactName || undefined,
          emergencyContactRelationship: formData.emergencyContactRelationship || undefined,
          emergencyContactPhone: formData.emergencyContactPhone || undefined,
          emergencyContact: formData.emergencyContact || undefined,
          bankName: formData.bankName || undefined,
          bankBranch: formData.bankBranch || undefined,
          bankAccountNumber: formData.bankAccountNumber || undefined,
        } as any);
      };
      reader.readAsDataURL(photoFile);
    } else {
      createEmployeeMutation.mutate({
        employeeNumber: formData.employeeNumber,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        gender: formData.gender || undefined,
        maritalStatus: formData.maritalStatus || undefined,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
        hireDate: new Date(formData.hireDate),
        probationEndDate: formData.probationEndDate ? new Date(formData.probationEndDate) : undefined,
        contractEndDate: formData.contractEndDate ? new Date(formData.contractEndDate) : undefined,
        department: formData.department || undefined,
        position: formData.position || undefined,
        jobGroupId: formData.jobGroupId,
        salary: formData.salary ? Math.round(parseFloat(formData.salary)) : undefined,
        employmentType: formData.employmentType || undefined,
        status: (formData.status as any) || undefined,
        nationalId: formData.nationalId || undefined,
        taxId: formData.taxId || undefined,
        nhifNumber: formData.nhifNumber || undefined,
        nssfNumber: formData.nssfNumber || undefined,
        address: formData.address || undefined,
        emergencyContactName: formData.emergencyContactName || undefined,
        emergencyContactRelationship: formData.emergencyContactRelationship || undefined,
        emergencyContactPhone: formData.emergencyContactPhone || undefined,
        emergencyContact: formData.emergencyContact || undefined,
        bankName: formData.bankName || undefined,
        bankBranch: formData.bankBranch || undefined,
        bankAccountNumber: formData.bankAccountNumber || undefined,
      } as any);
    }
  };

  return (
    <ModuleLayout
      title="Add Employee"
      description="Create a new employee record in your organisation"
      icon={<UserPlus className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "HR", href: "/employees" },
        { label: "Employees", href: "/employees" },
        { label: "Add" },
      ]}
      backLink={{ label: "Employees", href: "/employees" }}
    >
      <div className="space-y-6 max-w-5xl">

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Employment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />Employment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employee Number <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g., EMP-001"
                    value={formData.employeeNumber}
                    onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hire Date <span className="text-destructive">*</span></Label>
                  <Input
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g., John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g., Kamau"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="john@company.co.ke"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="+254 712 345 678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Marital Status</Label>
                  <Select value={formData.maritalStatus} onValueChange={(v) => setFormData({ ...formData, maritalStatus: v })}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Role & Compensation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Save className="h-4 w-4" />Role & Compensation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <div className="flex gap-2">
                    <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {departmentsLoading ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : departmentsData.length === 0 ? (
                          <SelectItem value="none" disabled>No departments</SelectItem>
                        ) : (
                          departmentsData.map((dept: any) => (
                            <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" onClick={() => navigate("/departments/create")} title="Create department">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Position / Job Title</Label>
                  <Input
                    placeholder="e.g., Senior Software Developer"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Job Group <span className="text-destructive">*</span></Label>
                  <Select value={formData.jobGroupId} onValueChange={(v) => setFormData({ ...formData, jobGroupId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select job group" /></SelectTrigger>
                    <SelectContent>
                      {jobGroupsLoading ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : jobGroupsData.length === 0 ? (
                        <SelectItem value="none" disabled>No job groups</SelectItem>
                      ) : (
                        jobGroupsData.map((jg: any) => (
                          <SelectItem key={jg.id} value={jg.id}>{jg.name} ({jg.minimumGrossSalary} – {jg.maximumGrossSalary})</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Gross Salary (KES)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <Select value={formData.employmentType} onValueChange={(v) => setFormData({ ...formData, employmentType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full-time (Permanent)</SelectItem>
                      <SelectItem value="part_time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="contractual">Contractual</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="wage">Wage</SelectItem>
                      <SelectItem value="temporary">Temporary</SelectItem>
                      <SelectItem value="seasonal">Seasonal</SelectItem>
                      <SelectItem value="intern">Intern / Attachment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Employment Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">🟢 Active</SelectItem>
                      <SelectItem value="on_leave">🟡 On Leave</SelectItem>
                      <SelectItem value="suspended">🟠 Suspended</SelectItem>
                      <SelectItem value="terminated">🔴 Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Probation End Date</Label>
                  <Input
                    type="date"
                    value={formData.probationEndDate}
                    onChange={(e) => setFormData({ ...formData, probationEndDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contract End Date</Label>
                  <Input
                    type="date"
                    value={formData.contractEndDate}
                    onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">For contract/temporary employees</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Government IDs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />Identity & Government IDs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>National ID / Passport Number</Label>
                  <Input
                    placeholder="e.g., 12345678"
                    value={formData.nationalId}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>KRA PIN (Tax ID)</Label>
                  <Input
                    placeholder="e.g., A001234567T"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>NHIF Number</Label>
                  <Input
                    placeholder="e.g., 1234567890"
                    value={formData.nhifNumber}
                    onChange={(e) => setFormData({ ...formData, nhifNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>NSSF Number</Label>
                  <Input
                    placeholder="e.g., 12345678"
                    value={formData.nssfNumber}
                    onChange={(e) => setFormData({ ...formData, nssfNumber: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Required for payroll, PAYE, NSSF and NHIF computations.</p>
            </CardContent>
          </Card>

          {/* Section 4: Address & Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />Address & Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Home / Residential Address</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, Estate, Town, County"
                  rows={2}
                />
              </div>
              <Separator />
              <p className="text-sm font-medium">Emergency / Next of Kin</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input
                    placeholder="e.g., Jane Kamau"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Select value={formData.emergencyContactRelationship} onValueChange={(v) => setFormData({ ...formData, emergencyContactRelationship: v })}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="+254 722 000 000"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Banking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />Banking Details (for Salary Disbursement)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Select value={formData.bankName} onValueChange={(v) => setFormData({ ...formData, bankName: v })}>
                    <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KCB Bank">KCB Bank</SelectItem>
                      <SelectItem value="Equity Bank">Equity Bank</SelectItem>
                      <SelectItem value="Co-operative Bank">Co-operative Bank</SelectItem>
                      <SelectItem value="ABSA Bank">ABSA Bank</SelectItem>
                      <SelectItem value="Standard Chartered">Standard Chartered</SelectItem>
                      <SelectItem value="NCBA Bank">NCBA Bank</SelectItem>
                      <SelectItem value="I&M Bank">I&M Bank</SelectItem>
                      <SelectItem value="Diamond Trust Bank">Diamond Trust Bank</SelectItem>
                      <SelectItem value="Stanbic Bank">Stanbic Bank</SelectItem>
                      <SelectItem value="Family Bank">Family Bank</SelectItem>
                      <SelectItem value="M-Pesa">M-Pesa (Safaricom)</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bank Branch</Label>
                  <Input
                    placeholder="e.g., Westlands Branch"
                    value={formData.bankBranch}
                    onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bank Account Number / M-Pesa Number</Label>
                <Input
                  placeholder="e.g., 0123456789 or +254 712 345 678"
                  value={formData.bankAccountNumber}
                  onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Enter bank account number or M-Pesa number for payroll disbursement</p>
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Photo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="h-4 w-4" />Employee Photo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={photoPreview || undefined} />
                  <AvatarFallback>
                    {formData.firstName.charAt(0)}{formData.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2 flex-1">
                    <div className="relative">
                      <Input
                        id="photo"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error("Photo must be less than 5MB");
                              return;
                            }
                            setPhotoFile(file);
                            
                            // Compress photo immediately on selection
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            const img = new Image();
                            
                            img.onload = () => {
                              // Resize to max 300x300
                              const maxWidth = 300;
                              const maxHeight = 300;
                              let width = img.width;
                              let height = img.height;
                              
                              if (width > height) {
                                if (width > maxWidth) {
                                  height *= maxWidth / width;
                                  width = maxWidth;
                                }
                              } else {
                                if (height > maxHeight) {
                                  width *= maxHeight / height;
                                  height = maxHeight;
                                }
                              }
                              
                              canvas.width = width;
                              canvas.height = height;
                              ctx?.drawImage(img, 0, 0, width, height);
                              
                              // Compress to JPEG with quality 0.7
                              const compressedData = canvas.toDataURL('image/jpeg', 0.7);
                              setPhotoPreview(compressedData);
                            };
                            
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              img.src = event.target?.result as string;
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("photo")?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Photo
                      </Button>
                    </div>
                    {photoFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove Photo
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG or GIF – Max 5MB
                    </p>
                  </div>
                </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-between pb-8">
            <Button type="button" variant="outline" onClick={() => navigate("/employees")}>
              <ArrowLeft className="h-4 w-4 mr-2" />Cancel
            </Button>
            <Button type="submit" disabled={createEmployeeMutation.isPending} size="lg">
              <Save className="h-4 w-4 mr-2" />
              {createEmployeeMutation.isPending ? "Saving..." : "Add Employee"}
            </Button>
          </div>
        </form>
      </div>

      {/* Password Display Modal */}
      {showPasswordModal && generatedPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>User Account Created</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                A user account has been created for {formData.firstName} {formData.lastName}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Temporary Password (Share with the employee):
                </Label>
                <div className="flex gap-2 items-center bg-muted p-3 rounded-md">
                  <code className="flex-1 font-mono text-sm break-all select-all">
                    {generatedPassword}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyPassword}
                    className="flex-shrink-0"
                  >
                    {passwordCopied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> The employee will be required to change this password on their first login.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> You can copy this password and send it securely to the employee, or display it for them to note down.
                </p>
              </div>

              <Button
                onClick={handleClosePasswordModal}
                className="w-full"
              >
                Done
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </ModuleLayout>
  );
}

