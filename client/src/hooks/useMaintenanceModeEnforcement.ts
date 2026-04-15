import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMaintenanceMode } from "./useMaintenanceMode";
import { getDashboardUrl } from "@/lib/permissions";

export function useMaintenanceModeEnforcement() {
  const { user } = useAuth();
  const { maintenanceMode } = useMaintenanceMode();
  const [location, navigate] = useLocation();
  const prevMaintenance = useRef<boolean | null>(null);

  const canBypass = user?.role === "super_admin" || user?.role === "ict_manager";
  const isRestrictedByMaintenance = maintenanceMode && !canBypass;

  // Redirect to dashboard when maintenance is disabled
  useEffect(() => {
    if (prevMaintenance.current === true && maintenanceMode === false && user) {
      // For org users, redirect to their org dashboard
      const orgMatch = location.match(/^\/org\/([^/]+)/);
      if (orgMatch) {
        navigate(`/org/${orgMatch[1]}/dashboard`);
      } else {
        navigate(getDashboardUrl(user.role));
      }
    }
    prevMaintenance.current = maintenanceMode;
  }, [maintenanceMode, user, navigate, location]);

  return { maintenanceMode, canBypass, isRestrictedByMaintenance };
}
