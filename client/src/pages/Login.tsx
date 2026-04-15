import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Lock, Mail, Zap, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getDashboardUrl } from "@/lib/permissions";

/**
 * Login component with proper authentication flow
 * 
 * Features:
 * - Stores auth token in localStorage for Docker/HTTP environments
 * - Redirects to role-based dashboard after successful login
 * - Handles authentication errors gracefully
 * - Persists login state across page reloads
 */
export default function Login() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ email: "", password: "" });
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user) return;
    const orgSlug = (user as any).organizationSlug;
    if (user.organizationId && orgSlug) {
      window.location.replace(`/org/${orgSlug}/dashboard`);
    } else {
      window.location.replace(getDashboardUrl(user.role));
    }
  }, [isAuthenticated, authLoading, user]);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      const userRole = data.user.role;
      const organizationId = data.user.organizationId;
      const organizationSlug = data.user.organizationSlug;
      
      // Store token in localStorage for fallback when cookies fail
      if (data.token) {
        localStorage.setItem("auth-token", data.token);
      }
      
      // Store user data in localStorage
      localStorage.setItem("auth-user", JSON.stringify(data.user));
      
      toast.success("Login successful!");
      
      // Check if user needs to change password on first login
      if (data.user.requiresPasswordChange) {
        localStorage.setItem("requiresPasswordChange", "true");
        window.location.replace("/change-password");
        return;
      }
      
      // If user belongs to an organization, route to org-scoped dashboard
      if (organizationId && organizationSlug) {
        window.location.replace(`/org/${organizationSlug}/dashboard`);
        return;
      }
      
      // Otherwise, redirect based on role to Melitech global dashboard
      let dest = "/crm/home";
      switch (userRole) {
        case "super_admin": dest = "/crm/super-admin"; break;
        case "admin": dest = "/crm/admin"; break;
        case "hr": dest = "/crm/hr"; break;
        case "accountant": dest = "/crm/accountant"; break;
        case "project_manager": dest = "/crm/project-manager"; break;
        case "procurement_manager": dest = "/crm/procurement"; break;
        case "ict_manager": dest = "/crm/ict"; break;
        case "sales_manager": dest = "/crm/sales"; break;
        case "staff": dest = "/crm/staff"; break;
        case "client": dest = "/crm/client-portal"; break;
      }
      window.location.replace(dest);
    },
    onError: (error) => {
      setError(error.message || "Login failed. Please check your credentials.");
      toast.error(error.message || "Login failed");
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    loginMutation.mutate({
      email: formData.email,
      password: formData.password,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      {/* Top bar */}
      <div className="p-4 sm:p-6">
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); setLocation("/"); }}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </a>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-gray-200">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <a
                href="/"
                onClick={(e) => { e.preventDefault(); setLocation("/"); }}
                className="flex items-center gap-2.5 no-underline"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900 tracking-tight">
                  Nexus<span className="text-indigo-600">360</span>
                </span>
              </a>
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
              <CardDescription>Sign in to your account to continue</CardDescription>
            </div>
          </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 pr-10"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <div className="flex items-center justify-between w-full">
              <a
                href="/forgot-password"
                onClick={(e) => { e.preventDefault(); setLocation("/forgot-password"); }}
                className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Forgot password?
              </a>
              <span className="text-xs text-muted-foreground">
                No account?{" "}
                <a
                  href="/signup"
                  onClick={(e) => { e.preventDefault(); setLocation("/signup"); }}
                  className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                >
                  Sign up
                </a>
              </span>
            </div>
          </CardFooter>
        </form>
      </Card>
      </div>
    </div>
  );
}
