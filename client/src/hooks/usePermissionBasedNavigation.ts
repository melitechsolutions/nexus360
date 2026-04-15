import { useAuth } from "@/_core/hooks/useAuth";
import { usePermissions } from "@/_core/hooks/usePermissions";
import { canAccessFeature } from "@/lib/permissions";

interface NavItem {
  title: string;
  href?: string;
  icon: any;
  badge?: number;
  children?: NavItem[];
  roles?: string[];
  feature?: string;
}

export function usePermissionBasedNavigation() {
  const { user } = useAuth();
  const { hasPermission: hasDbPermission, loading: permissionsLoading } = usePermissions(user?.id);

  const hasPermission = (permission: string) => {
    // Super admin and ict_manager have all permissions
    if (user?.role === "super_admin" || user?.role === "ict_manager") return true;
    // Check static role-based permissions first
    if (canAccessFeature(user?.role || "", permission)) return true;
    // Fall back to DB-stored per-user permissions
    return hasDbPermission(permission);
  };

  const getFilteredNav = (items: NavItem[]): NavItem[] => {
    return items.filter((item) => {
      // Role-based filtering
      if (item.roles && item.roles.length > 0) {
        if (!item.roles.includes(user?.role || "")) return false;
      }
      // Feature-based filtering using role check
      if (item.feature) {
        return canAccessFeature(user?.role || "", item.feature);
      }
      return true;
    }).map((item) => {
      if (item.children) {
        return { ...item, children: getFilteredNav(item.children) };
      }
      return item;
    });
  };

  return { getFilteredNav, hasPermission, permissionsLoading };
}
