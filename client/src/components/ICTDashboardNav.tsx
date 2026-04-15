import { useMemo } from "react";
import { useLocation } from "wouter";
import { useRequireRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Settings,
  Shield,
  Network,
  Activity,
  AlertCircle,
  Database,
  Monitor,
  Mail,
  Users,
  Lock,
  Server,
  HardDrive,
  Zap,
  SettingsIcon,
  FileText,
  Eye,
} from "lucide-react";

export interface ICTMenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  section: "system" | "administration" | "monitoring" | "security";
  requiredRoles: string[];
  description?: string;
}

export const ICT_MENU_ITEMS: ICTMenuItem[] = [
  // System Monitoring
  {
    label: "System Health",
    href: "/admin/system-health",
    icon: <Monitor className="h-4 w-4" />,
    section: "monitoring",
    requiredRoles: ["ict_manager", "super_admin", "admin"],
    description: "Monitor system performance and metrics",
  },
  {
    label: "Active Sessions",
    href: "/admin/sessions",
    icon: <Users className="h-4 w-4" />,
    section: "monitoring",
    requiredRoles: ["ict_manager", "super_admin", "admin"],
    description: "View and manage user sessions",
  },
  {
    label: "System Logs",
    href: "/admin/system-logs",
    icon: <Activity className="h-4 w-4" />,
    section: "monitoring",
    requiredRoles: ["ict_manager", "super_admin", "admin"],
    description: "View system activity and events",
  },
  {
    label: "Performance Metrics",
    href: "/admin/performance",
    icon: <BarChart3 className="h-4 w-4" />,
    section: "monitoring",
    requiredRoles: ["ict_manager", "super_admin", "admin"],
    description: "Analyze system performance trends",
  },

  // System Administration
  {
    label: "Email Management",
    href: "/communications",
    icon: <Mail className="h-4 w-4" />,
    section: "administration",
    requiredRoles: ["ict_manager", "super_admin", "admin"],
    description: "Configure and monitor email systems",
  },
  {
    label: "Backup Management",
    href: "/admin/backups",
    icon: <Database className="h-4 w-4" />,
    section: "administration",
    requiredRoles: ["ict_manager", "super_admin", "admin"],
    description: "Manage database backups and recovery",
  },
  {
    label: "Database Management",
    href: "/admin/database",
    icon: <Server className="h-4 w-4" />,
    section: "administration",
    requiredRoles: ["ict_manager", "super_admin"],
    description: "Manage database configuration",
  },
  {
    label: "Integration Management",
    href: "/admin/integrations",
    icon: <Zap className="h-4 w-4" />,
    section: "administration",
    requiredRoles: ["ict_manager", "super_admin", "admin"],
    description: "Configure third-party integrations",
  },
  {
    label: "Cron Jobs",
    href: "/admin/cron-jobs",
    icon: <HardDrive className="h-4 w-4" />,
    section: "administration",
    requiredRoles: ["ict_manager", "super_admin"],
    description: "Manage automated background jobs",
  },

  // Security
  {
    label: "Security & Access",
    href: "/admin/management",
    icon: <Shield className="h-4 w-4" />,
    section: "security",
    requiredRoles: ["ict_manager", "super_admin", "admin"],
    description: "Configure security policies and access control",
  },
  {
    label: "Audit Logs",
    href: "/admin/audit-logs",
    icon: <FileText className="h-4 w-4" />,
    section: "security",
    requiredRoles: ["ict_manager", "super_admin", "admin"],
    description: "View security audit trail",
  },
  {
    label: "Access Permissions",
    href: "/roles",
    icon: <Lock className="h-4 w-4" />,
    section: "security",
    requiredRoles: ["ict_manager", "super_admin", "admin"],
    description: "Manage user roles and permissions",
  },
  {
    label: "API Keys",
    href: "/admin/api-keys",
    icon: <Eye className="h-4 w-4" />,
    section: "security",
    requiredRoles: ["ict_manager", "super_admin"],
    description: "Manage API keys and authentication",
  },

  // System Settings
  {
    label: "System Settings",
    href: "/admin/settings",
    icon: <SettingsIcon className="h-4 w-4" />,
    section: "system",
    requiredRoles: ["super_admin"],
    description: "Configure global system settings",
  },
  {
    label: "Network Configuration",
    href: "/admin/network",
    icon: <Network className="h-4 w-4" />,
    section: "system",
    requiredRoles: ["super_admin"],
    description: "Configure network and connection settings",
  },
];

interface ICTDashboardNavProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ICTDashboardNav({ isOpen = false, onClose }: ICTDashboardNavProps) {
  const { allowed } = useRequireRole(["ict_manager", "super_admin", "admin"]);
  const [location] = useLocation();

  // Filter menu items based on user roles
  const filteredMenuItems = useMemo(() => {
    if (!allowed) return [];

    // Group items by section
    const grouped = {
      monitoring: ICT_MENU_ITEMS.filter(
        (item) => item.section === "monitoring" && item.requiredRoles.some((role) => true)
      ),
      administration: ICT_MENU_ITEMS.filter(
        (item) => item.section === "administration" && item.requiredRoles.some((role) => true)
      ),
      security: ICT_MENU_ITEMS.filter(
        (item) => item.section === "security" && item.requiredRoles.some((role) => true)
      ),
      system: ICT_MENU_ITEMS.filter(
        (item) => item.section === "system" && item.requiredRoles.some((role) => true)
      ),
    };

    return grouped;
  }, [allowed]);

  if (!allowed) {
    return null;
  }

  const sections = [
    {
      name: "Monitoring",
      icon: <Monitor className="h-4 w-4" />,
      key: "monitoring",
    },
    {
      name: "Administration",
      icon: <Settings className="h-4 w-4" />,
      key: "administration",
    },
    {
      name: "Security",
      icon: <Shield className="h-4 w-4" />,
      key: "security",
    },
    {
      name: "System",
      icon: <Server className="h-4 w-4" />,
      key: "system",
    },
  ];

  return (
    <div
      className={cn(
        "w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto",
        "transition-all duration-300",
        isOpen ? "translate-x-0" : "hidden"
      )}
    >
      <div className="p-4 space-y-6">
        {sections.map((section) => {
          const items =
            filteredMenuItems[section.key as keyof typeof filteredMenuItems] || [];

          if (items.length === 0) return null;

          return (
            <div key={section.key} className="space-y-2">
              <div className="flex items-center gap-2 px-2 py-1">
                <span className="text-gray-500 dark:text-gray-400">
                  {section.icon}
                </span>
                <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {section.name}
                </h3>
              </div>

              <nav className="space-y-1">
                {items.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      onClose?.();
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      "group relative",
                      location === item.href
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-200 font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                    title={item.description}
                  >
                    <span className="text-gray-500 dark:text-gray-400 group-hover:text-current">
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>

                    {location === item.href && (
                      <div className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                    )}
                  </a>
                ))}
              </nav>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ICTDashboardNavMobile({ isOpen = false, onClose }: ICTDashboardNavProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-40 bg-black/50 transition-opacity",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-900",
          "transform transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <ICTDashboardNav isOpen={true} onClose={onClose} />
      </div>
    </div>
  );
}
