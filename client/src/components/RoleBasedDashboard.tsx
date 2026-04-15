import { useAuthWithPersistence } from "@/_core/hooks/useAuthWithPersistence";
import { useLocation } from "wouter";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

/**
 * RoleBasedDashboard component that routes users to their appropriate dashboard
 * based on their role and handles authentication state persistence
 * 
 * This component:
 * 1. Checks authentication status from cookies or localStorage
 * 2. Waits for user data to load
 * 3. Routes to role-specific dashboard
 * 4. Persists login state across page reloads
 */
export function RoleBasedDashboard() {
  const { user, loading, isAuthenticated } = useAuthWithPersistence();
  const [, setLocation] = useLocation();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Prevent infinite loops by tracking if we've already redirected
    if (hasRedirected.current) {
      return;
    }

    // Wait for hydration to complete before making routing decisions
    if (loading) {
      return;
    }

    // If not authenticated, redirect to login and prevent further redirects
    if (!isAuthenticated) {
      hasRedirected.current = true;
      setLocation("/login");
      return;
    }

    // If authenticated but no user data yet, wait for it
    if (!user) {
      return;
    }

    // Route based on user role
    const role = user.role;

    // Mark that we're about to redirect
    hasRedirected.current = true;

    // Route to role-specific dashboard
    switch (role) {
      case "super_admin":
        setLocation("/crm/super-admin");
        break;
      case "admin":
        setLocation("/crm/admin");
        break;
      case "hr":
        setLocation("/crm/hr");
        break;
      case "accountant":
        setLocation("/crm/accountant");
        break;
      case "project_manager":
        setLocation("/crm/project-manager");
        break;
      case "staff":
        setLocation("/crm/staff");
        break;
      case "client":
        setLocation("/crm/client-portal");
        break;
      case "user":
      default:
        // Default user dashboard - stay on current page or show a general dashboard
        setLocation("/");
        break;
    }
  }, [loading, isAuthenticated, user, setLocation]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, return null (useEffect will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // For default user role, render a generic dashboard
  // This can be replaced with a specific default dashboard component
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Welcome to Your Dashboard</h1>
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}

export default RoleBasedDashboard;
