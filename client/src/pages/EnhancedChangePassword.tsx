/**
 * Enhanced Password Change Component
 * Password policy enforcement, strength validation, and secure credential management
 * 
 * Features:
 * - Password strength requirements
 * - Password history validation (no reuse)
 * - Password expiry enforcement
 * - Force change on first login
 * - MFA optional verification
 * - Session management after change
 */

import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Eye,
  EyeOff,
  Lock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";

interface PasswordRequirements {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  specialChar: boolean;
  notInHistory: boolean;
}

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireNumbers: boolean;
  requireSpecialChar: boolean;
  expiryDays: number;
  historyCount: number;
}

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialChar: true,
  expiryDays: 90,
  historyCount: 5,
};

export default function EnhancedPasswordChange() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy>(DEFAULT_POLICY);

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Fetch password policy
  const { data: policyData } = trpc.settings.getPasswordPolicy.useQuery();

  useEffect(() => {
    if (policyData) {
      setPasswordPolicy(policyData);
    }

    // Check if this is a forced password change
    const requiresPasswordChange = localStorage.getItem("requiresPasswordChange");
    setIsFirstLogin(requiresPasswordChange === "true");
  }, [policyData]);

  // Calculate password strength
  const passwordRequirements: PasswordRequirements = useMemo(() => {
    const pwd = formData.newPassword;
    return {
      minLength: pwd.length >= passwordPolicy.minLength,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      numbers: /[0-9]/.test(pwd),
      specialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
      notInHistory: true, // Validated server-side
    };
  }, [formData.newPassword, passwordPolicy]);

  const passwordStrength = useMemo(() => {
    const met = Object.values(passwordRequirements).filter(Boolean).length;
    const total = Object.keys(passwordRequirements).length;
    return (met / total) * 100;
  }, [passwordRequirements]);

  const isPasswordValid = useMemo(() => {
    return (
      passwordRequirements.minLength &&
      (passwordPolicy.requireUppercase ? passwordRequirements.uppercase : true) &&
      (passwordPolicy.requireNumbers ? passwordRequirements.numbers : true) &&
      (passwordPolicy.requireSpecialChar ? passwordRequirements.specialChar : true) &&
      passwordRequirements.lowercase &&
      passwordRequirements.notInHistory
    );
  }, [passwordRequirements, passwordPolicy]);

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully!");
      localStorage.removeItem("requiresPasswordChange");

      // Redirect based on role
      const user = JSON.parse(localStorage.getItem("auth-user") || "{}");
      const dashboards: Record<string, string> = {
        super_admin: "/super-admin",
        admin: "/admin",
        accountant: "/accounting",
        hr: "/hr",
        staff: "/staff",
        client: "/client-portal",
      };

      setLocation(dashboards[user.role] || "/dashboard");
    },
    onError: (error) => {
      setError(error.message || "Failed to change password");
      toast.error(error.message || "Failed to change password");
      setLoading(false);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.currentPassword) {
      setError("Current password is required");
      return;
    }

    if (!formData.newPassword) {
      setError("New password is required");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (!isPasswordValid) {
      setError("Password does not meet complexity requirements");
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError("New password must be different from current password");
      return;
    }

    setLoading(true);

    try {
      changePasswordMutation.mutate({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
    } catch (err) {
      // Error handled by mutation
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 33) return "bg-red-500";
    if (passwordStrength < 66) return "bg-orange-500";
    if (passwordStrength < 100) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength < 33) return "Weak";
    if (passwordStrength < 66) return "Fair";
    if (passwordStrength < 100) return "Good";
    return "Strong";
  };

  if (isFirstLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-2xl shadow-2xl">
          <CardHeader className="space-y-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="text-3xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-8 h-8" />
              Password Change Required
            </CardTitle>
            <CardDescription className="text-blue-100">
              Please set a strong password before accessing the application
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Alert className="bg-blue-50 border-blue-200">
              <Info className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                This is your first login. For security reasons, you must create a strong password that meets the requirements below.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="font-semibold">
                  Current Password *
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Enter your current password"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-3">
                <Label htmlFor="newPassword" className="font-semibold">
                  New Password *
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={formData.newPassword}
                    onChange={handleChange}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Password Strength */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Password Strength:</span>
                    <span className={`text-sm font-semibold ${
                      passwordStrength < 33 ? "text-red-600" :
                      passwordStrength < 66 ? "text-orange-600" :
                      passwordStrength < 100 ? "text-yellow-600" :
                      "text-green-600"
                    }`}>
                      {getPasswordStrengthLabel()}
                    </span>
                  </div>
                  <Progress value={passwordStrength} className="h-2" />
                </div>

                {/* Requirements Checklist */}
                <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm font-semibold text-gray-700">Password Requirements:</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      {passwordRequirements.minLength ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-gray-400" />
                      )}
                      <span className={passwordRequirements.minLength ? "text-green-700" : "text-gray-600"}>
                        At least {passwordPolicy.minLength} characters
                      </span>
                    </div>

                    {passwordPolicy.requireUppercase && (
                      <div className="flex items-center gap-2 text-sm">
                        {passwordRequirements.uppercase ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-gray-400" />
                        )}
                        <span className={passwordRequirements.uppercase ? "text-green-700" : "text-gray-600"}>
                          At least one uppercase letter (A-Z)
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      {passwordRequirements.lowercase ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-gray-400" />
                      )}
                      <span className={passwordRequirements.lowercase ? "text-green-700" : "text-gray-600"}>
                        At least one lowercase letter (a-z)
                      </span>
                    </div>

                    {passwordPolicy.requireNumbers && (
                      <div className="flex items-center gap-2 text-sm">
                        {passwordRequirements.numbers ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-gray-400" />
                        )}
                        <span className={passwordRequirements.numbers ? "text-green-700" : "text-gray-600"}>
                          At least one number (0-9)
                        </span>
                      </div>
                    )}

                    {passwordPolicy.requireSpecialChar && (
                      <div className="flex items-center gap-2 text-sm">
                        {passwordRequirements.specialChar ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-gray-400" />
                        )}
                        <span className={passwordRequirements.specialChar ? "text-green-700" : "text-gray-600"}>
                          At least one special character (!@#$%^&*)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-semibold">
                  Confirm Password *
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Passwords do not match
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !isPasswordValid || formData.newPassword !== formData.confirmPassword}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-12 text-lg font-semibold"
                size="lg"
              >
                {loading ? (
                  <>
                    <Lock className="w-4 h-4 mr-2 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Set Password & Continue
                  </>
                )}
              </Button>
            </form>

            {/* Password Policy Info */}
            <Alert className="bg-gray-50 border-gray-200">
              <Info className="w-4 h-4" />
              <AlertDescription className="text-sm text-gray-700">
                <p className="font-semibold mb-2">Security Info:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Your password will expire in {passwordPolicy.expiryDays} days</li>
                  <li>Cannot reuse last {passwordPolicy.historyCount} passwords</li>
                  <li>Never share your password with anyone</li>
                  <li>Use a unique password not used elsewhere</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Regular password change (not first login)
  return (
    <ModuleLayout
      title="Change Password"
      description="Update your account password to keep your account secure"
      icon={<Lock className="w-5 h-5" />}
      backLink={{ label: "Account", href: "/account" }}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Account", href: "/account" },
        { label: "Change Password" },
      ]}
    >
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-6 h-6" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your account password to keep your account secure
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Enter your current password"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-3">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={formData.newPassword}
                    onChange={handleChange}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Strength:</span>
                    <span className={`text-sm font-semibold ${
                      passwordStrength < 33 ? "text-red-600" :
                      passwordStrength < 66 ? "text-orange-600" :
                      passwordStrength < 100 ? "text-yellow-600" :
                      "text-green-600"
                    }`}>
                      {getPasswordStrengthLabel()}
                    </span>
                  </div>
                  <Progress value={passwordStrength} className="h-2" />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !isPasswordValid}
                className="w-full"
              >
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
