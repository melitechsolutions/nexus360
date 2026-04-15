import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Users, Loader2, Trash2, Save, Upload, X, Plus } from "lucide-react";

export default function EditEmployee() {
  const params = useParams<{ id: string }>();
  const employeeId = params.id;
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  
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
    nationalId: "",
    taxId: "",
    nhifNumber: "",
    nssfNumber: "",
    address: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
    emergencyContact: "",
    bankName: "",
    bankBranch: "",
    bankAccountNumber: "",
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch employee data, departments, and job groups
  const { data: employee } = trpc.employees.getById.useQuery(employeeId || "", {
    enabled: !!employeeId,
  });
  const { data: departmentsData = [], isLoading: departmentsLoading } = trpc.departments.list.useQuery();
  const { data: jobGroupsData = [], isLoading: jobGroupsLoading } = trpc.jobGroups.list.useQuery();

  // Update form when employee data loads
  useEffect(() => {
    if (employee) {
      const e = employee as any;
      setFormData({
        employeeNumber: e.employeeNumber || "",
        firstName: e.firstName || "",
        lastName: e.lastName || "",
        email: e.email || "",
        phone: e.phone || "",
        gender: e.gender || "",
        maritalStatus: e.maritalStatus || "",
        dateOfBirth: e.dateOfBirth
          ? new Date(e.dateOfBirth).toISOString().split("T")[0]
          : "",
        hireDate: e.hireDate
          ? new Date(e.hireDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        probationEndDate: e.probationEndDate
          ? new Date(e.probationEndDate).toISOString().split("T")[0]
          : "",
        contractEndDate: e.contractEndDate
          ? new Date(e.contractEndDate).toISOString().split("T")[0]
          : "",
        department: e.department || "",
        position: e.position || "",
        jobGroupId: e.jobGroupId || "",
        salary: e.salary ? e.salary.toString() : "",
        employmentType: e.employmentType || "full-time",
        status: e.status || "active",
        photoUrl: e.photoUrl || "",
        nationalId: e.nationalId || "",
        taxId: e.taxId || "",
        nhifNumber: e.nhifNumber || "",
        nssfNumber: e.nssfNumber || "",
        address: e.address || "",
        emergencyContactName: e.emergencyContactName || "",
        emergencyContactRelationship: e.emergencyContactRelationship || "",
        emergencyContactPhone: e.emergencyContactPhone || "",
        emergencyContact: e.emergencyContact || "",
        bankName: e.bankName || "",
        bankBranch: e.bankBranch || "",
        bankAccountNumber: e.bankAccountNumber || "",
      });
      if (e.photoUrl) {
        setPhotoPreview(e.photoUrl);
      }
      setIsLoading(false);
    }
  }, [employee]);

  const updateEmployeeMutation = trpc.employees.update.useMutation({
    onSuccess: () => {
      toast.success("Employee updated successfully!");
      utils.employees.list.invalidate();
      utils.employees.getById.invalidate(employeeId || "");
      navigate("/employees");
    },
    onError: (error: any) => {
      toast.error(`Failed to update employee: ${error.message}`);
    },
  });

  const deleteEmployeeMutation = trpc.employees.delete.useMutation({
    onSuccess: () => {
      toast.success("Employee deleted successfully!");
      utils.employees.list.invalidate();
      navigate("/employees");
    },
    onError: (error: any) => {
      toast.error(`Failed to delete employee: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeNumber || !formData.firstName || !formData.lastName || !formData.hireDate || !formData.jobGroupId) {
      toast.error("Please fill in all required fields (including Job Group)");
      return;
    }

    if (photoFile) {
      // Convert photo to compressed base64
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
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        
        if (photoDataUrl.length > 1000000) {
          toast.error("Photo is too large even after compression. Please use a smaller image.");
          return;
        }
        
        updateEmployeeMutation.mutate({
          id: employeeId || "",
          employeeNumber: formData.employeeNumber,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          gender: formData.gender || undefined,
          maritalStatus: formData.maritalStatus || undefined,
          dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
          hireDate: new Date(formData.hireDate),
          probationEndDate: formData.probationEndDate || undefined,
          contractEndDate: formData.contractEndDate || undefined,
          department: formData.department || undefined,
          position: formData.position || undefined,
          jobGroupId: formData.jobGroupId || undefined,
          salary: formData.salary ? Math.round(parseFloat(formData.salary)) : undefined,
          employmentType: formData.employmentType || undefined,
          status: formData.status || undefined,
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
          photoUrl: photoDataUrl,
        } as any);
      };
      
      img.src = photoPreview || '';
    } else {
      updateEmployeeMutation.mutate({
        id: employeeId || "",
        employeeNumber: formData.employeeNumber,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        gender: formData.gender || undefined,
        maritalStatus: formData.maritalStatus || undefined,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
        hireDate: new Date(formData.hireDate),
        probationEndDate: formData.probationEndDate || undefined,
        contractEndDate: formData.contractEndDate || undefined,
        department: formData.department || undefined,
        position: formData.position || undefined,
        jobGroupId: formData.jobGroupId || undefined,
        salary: formData.salary ? Math.round(parseFloat(formData.salary)) : undefined,
        employmentType: formData.employmentType || undefined,
        status: formData.status || undefined,
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

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this employee? This action cannot be undone.")) {
      deleteEmployeeMutation.mutate(employeeId || "");
    }
  };

  if (isLoading) {
    return (
      <ModuleLayout
        title="Edit Employee"
        description="Update employee details"
        icon={<Users className="w-6 h-6" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "HR", href: "/hr" },
          { label: "Employees", href: "/employees" },
          { label: "Edit Employee" },
        ]}
      >
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Edit Employee"
      description="Update employee details"
      icon={<Users className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "HR", href: "/hr" },
        { label: "Employees", href: "/employees" },
        { label: "Edit Employee" },
      ]}
    >
      <div className="max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Edit Employee</CardTitle>
            <CardDescription>
              Update the employee details below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="employeeNumber">Employee Number *</Label>
                  <Input
                    id="employeeNumber"
                    placeholder="e.g., EMP-001"
                    value={formData.employeeNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, employeeNumber: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hireDate">Hire Date *</Label>
                  <Input
                    id="hireDate"
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) =>
                      setFormData({ ...formData, hireDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+254 712 345 678"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maritalStatus">Marital Status</Label>
                  <Select
                    value={formData.maritalStatus}
                    onValueChange={(value) => setFormData({ ...formData, maritalStatus: value })}
                  >
                    <SelectTrigger id="maritalStatus">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                      <SelectItem value="resigned">Resigned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({ ...formData, dateOfBirth: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <Select
                    value={formData.employmentType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, employmentType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full-time</SelectItem>
                      <SelectItem value="part_time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="contractual">Contractual</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="wage">Wage</SelectItem>
                      <SelectItem value="temporary">Temporary</SelectItem>
                      <SelectItem value="seasonal">Seasonal</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="probationEndDate">Probation End Date</Label>
                  <Input
                    id="probationEndDate"
                    type="date"
                    value={formData.probationEndDate}
                    onChange={(e) => setFormData({ ...formData, probationEndDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contractEndDate">Contract End Date</Label>
                  <Input
                    id="contractEndDate"
                    type="date"
                    value={formData.contractEndDate}
                    onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <div className="flex gap-2">
                    <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                      <SelectTrigger id="department" className="flex-1">
                        <SelectValue placeholder="Select a department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departmentsLoading ? (
                          <SelectItem value="__loading__" disabled>
                            Loading departments...
                          </SelectItem>
                        ) : departmentsData.length === 0 ? (
                          <SelectItem value="__empty__" disabled>
                            No departments available
                          </SelectItem>
                        ) : (
                          departmentsData.map((dept: any) => (
                            <SelectItem key={dept.id} value={dept.name}>
                              {dept.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => navigate("/departments/create")}
                      title="Create new department"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    placeholder="e.g., Sales Manager"
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="jobGroupId">Job Group *</Label>
                  <Select value={formData.jobGroupId} onValueChange={(value) => setFormData({ ...formData, jobGroupId: value })}>
                    <SelectTrigger id="jobGroupId">
                      <SelectValue placeholder="Select a job group" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobGroupsLoading ? (
                        <SelectItem value="__loading__" disabled>
                          Loading job groups...
                        </SelectItem>
                      ) : jobGroupsData.length === 0 ? (
                        <SelectItem value="__empty__" disabled>
                          No job groups available
                        </SelectItem>
                      ) : (
                        jobGroupsData.map((jg: any) => (
                          <SelectItem key={jg.id} value={jg.id}>
                            {jg.name} ({jg.minimumGrossSalary} - {jg.maximumGrossSalary})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary">Salary (Ksh)</Label>
                  <Input
                    id="salary"
                    type="number"
                    placeholder="0.00"
                    value={formData.salary}
                    onChange={(e) =>
                      setFormData({ ...formData, salary: e.target.value })
                    }
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              {/* Identity & Government IDs */}
              <div className="pt-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Identity & Government IDs</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nationalId">National ID</Label>
                    <Input
                      id="nationalId"
                      value={formData.nationalId}
                      onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                      placeholder="National ID number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID / KRA PIN</Label>
                    <Input
                      id="taxId"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      placeholder="A123456789X"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="nhifNumber">NHIF Number</Label>
                    <Input
                      id="nhifNumber"
                      value={formData.nhifNumber}
                      onChange={(e) => setFormData({ ...formData, nhifNumber: e.target.value })}
                      placeholder="NHIF number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nssfNumber">NSSF Number</Label>
                    <Input
                      id="nssfNumber"
                      value={formData.nssfNumber}
                      onChange={(e) => setFormData({ ...formData, nssfNumber: e.target.value })}
                      placeholder="NSSF number"
                    />
                  </div>
                </div>
              </div>

              {/* Address & Emergency Contact */}
              <div className="pt-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Address & Emergency Contact</h3>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Residential address"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                    <Input
                      id="emergencyContactName"
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                    <Input
                      id="emergencyContactRelationship"
                      value={formData.emergencyContactRelationship}
                      onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
                      placeholder="e.g., Spouse, Parent"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactPhone">Emergency Phone</Label>
                    <Input
                      id="emergencyContactPhone"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                      placeholder="+254 700 000 000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">Emergency Notes</Label>
                    <Input
                      id="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                      placeholder="Additional emergency info"
                    />
                  </div>
                </div>
              </div>

              {/* Banking */}
              <div className="pt-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Banking Details</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="Bank name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankBranch">Bank Branch</Label>
                    <Input
                      id="bankBranch"
                      value={formData.bankBranch}
                      onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                      placeholder="Branch name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountNumber">Account Number</Label>
                    <Input
                      id="bankAccountNumber"
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                      placeholder="Account number"
                    />
                  </div>
                </div>
              </div>

              {/* Photo Upload Section */}
              <div className="space-y-3">
                <Label>Employee Photo</Label>
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
                        Change Photo
                      </Button>
                    </div>
                    {photoFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(formData.photoUrl || null);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove New Photo
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteEmployeeMutation.isPending}
                >
                  {deleteEmployeeMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete Employee
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/employees")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateEmployeeMutation.isPending}
                  >
                    {updateEmployeeMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Update Employee
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
