import { useState } from "react";
import { useLocation } from "wouter";
import { useMaterialTailwindController, setOpenSidenav } from "@/contexts/MaterialTailwindContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  Receipt,
  DollarSign,
  Package,
  Briefcase,
  BarChart3,
  UserCog,
  Settings,
  ChevronRight,
  X,
  Sparkles,
  Mail,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  submenu?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    title: "Clients",
    href: "/clients",
    icon: <Users className="w-5 h-5" />,
  },
  {
    title: "Projects",
    href: "/projects",
    icon: <FolderKanban className="w-5 h-5" />,
  },
  {
    title: "Sales",
    href: "#",
    icon: <FileText className="w-5 h-5" />,
    submenu: [
      { title: "Invoices", href: "/invoices", icon: <FileText className="w-4 h-4" /> },
      { title: "Estimates", href: "/estimates", icon: <FileText className="w-4 h-4" /> },
      { title: "Receipts", href: "/receipts", icon: <Receipt className="w-4 h-4" /> },
      { title: "Opportunities", href: "/opportunities", icon: <Briefcase className="w-4 h-4" /> },
    ],
  },
  {
    title: "Accounting",
    href: "#",
    icon: <DollarSign className="w-5 h-5" />,
    submenu: [
      { title: "Payments", href: "/payments", icon: <DollarSign className="w-4 h-4" /> },
      { title: "Expenses", href: "/expenses", icon: <DollarSign className="w-4 h-4" /> },
      { title: "Chart of Accounts", href: "/chart-of-accounts", icon: <BarChart3 className="w-4 h-4" /> },
    ],
  },
  {
    title: "Products & Services",
    href: "#",
    icon: <Package className="w-5 h-5" />,
    submenu: [
      { title: "Products", href: "/products", icon: <Package className="w-4 h-4" /> },
      { title: "Services", href: "/services", icon: <Briefcase className="w-4 h-4" /> },
    ],
  },
  {
    title: "HR",
    href: "#",
    icon: <UserCog className="w-5 h-5" />,
    submenu: [
      { title: "Employees", href: "/employees", icon: <Users className="w-4 h-4" /> },
      { title: "Departments", href: "/departments", icon: <Briefcase className="w-4 h-4" /> },
      { title: "Attendance", href: "/attendance", icon: <BarChart3 className="w-4 h-4" /> },
      { title: "Payroll", href: "/payroll", icon: <DollarSign className="w-4 h-4" /> },
      { title: "Leave", href: "/leave", icon: <BarChart3 className="w-4 h-4" /> },
    ],
  },
  {
    title: "Reports",
    href: "/reports",
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    title: "Financial Dashboard",
    href: "/financial-dashboard",
    icon: <DollarSign className="w-5 h-5" />,
  },
  {
    title: "AI Hub",
    href: "/ai-hub",
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    title: "Communications",
    href: "/communications",
    icon: <Mail className="w-5 h-5" />,
  },
];

export function Sidenav() {
  const [controller, dispatch] = useMaterialTailwindController();
  const { openSidenav, sidenavType } = controller;
  const [location, navigate] = useLocation();
  const [expandedMenu, setExpandedMenu] = useState<string | null>(() => {
    // Load expanded menu from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('expandedMenu') || null;
    }
    return null;
  });

  // Persist expanded menu state
  const handleToggleSubmenu = (title: string) => {
    const newExpanded = expandedMenu === title ? null : title;
    setExpandedMenu(newExpanded);
    if (typeof window !== 'undefined') {
      if (newExpanded) {
        localStorage.setItem('expandedMenu', newExpanded);
      } else {
        localStorage.removeItem('expandedMenu');
      }
    }
  };

  // Check if a route is active
  const isActive = (href: string) => {
    if (href === '#') return false;
    return location === href || location?.startsWith(href + '/');
  };

  // Check if parent menu should be expanded based on current route
  const shouldExpandMenu = (item: NavItem) => {
    if (!item.submenu) return false;
    return item.submenu.some(sub => isActive(sub.href));
  };

  const sidenavClasses = {
    dark: "bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700",
    white: "bg-white border-slate-200 shadow-lg",
    transparent: "bg-transparent",
  };

  const handleNavClick = (href: string) => {
    if (href !== "#") {
      navigate(href);
      setOpenSidenav(dispatch, false);
    }
  };

  return (
    <>
      {openSidenav && (
        <div
          className="fixed inset-0 z-40 bg-black/50 xl:hidden"
          onClick={() => setOpenSidenav(dispatch, false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-72 transition-transform duration-300",
          "border-r",
          sidenavClasses[sidenavType],
          openSidenav ? "translate-x-0" : "-translate-x-full xl:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white",
                  "bg-gradient-to-br from-blue-600 to-blue-700"
                )}
              >
                M
              </div>
              <span
                className={cn(
                  "font-bold text-lg",
                  sidenavType === "dark" ? "text-white" : "text-slate-900"
                )}
              >
                CRM
              </span>
            </div>
            <button
              onClick={() => setOpenSidenav(dispatch, false)}
              className="xl:hidden p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <ScrollArea className="flex-1">
            <nav className="p-4 space-y-2">
              {navItems.map((item) => (
                <div key={item.title}>
                  <button
                    onClick={() => {
                      if (item.submenu) {
                        handleToggleSubmenu(item.title);
                      } else {
                        handleNavClick(item.href);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors",
                      "hover:bg-slate-100 dark:hover:bg-slate-700",
                      isActive(item.href) || shouldExpandMenu(item)
                        ? sidenavType === "dark"
                          ? "bg-blue-600 text-white"
                          : "bg-blue-50 text-blue-700"
                        : sidenavType === "dark"
                        ? "text-slate-300 hover:text-white"
                        : "text-slate-700 hover:text-slate-900"
                    )}
                  >
                    {item.icon}
                    <span className="flex-1 text-left font-medium text-sm">
                      {item.title}
                    </span>
                    {item.submenu && (
                      <ChevronRight
                        className={cn(
                          "w-4 h-4 transition-transform",
                          expandedMenu === item.title && "rotate-90"
                        )}
                      />
                    )}
                    {item.badge && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>

                  {item.submenu && (expandedMenu === item.title || shouldExpandMenu(item)) && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-slate-300 dark:border-slate-600 pl-4">
                      {item.submenu.map((subitem) => (
                        <button
                          key={subitem.title}
                          onClick={() => handleNavClick(subitem.href)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors",
                            "hover:bg-slate-100 dark:hover:bg-slate-700",
                            isActive(subitem.href)
                              ? sidenavType === "dark"
                                ? "bg-blue-600 text-white"
                                : "bg-blue-100 text-blue-700"
                              : sidenavType === "dark"
                              ? "text-slate-400 hover:text-slate-200"
                              : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          {subitem.icon}
                          <span>{subitem.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </ScrollArea>

          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => handleNavClick("/settings")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors",
                "hover:bg-slate-100 dark:hover:bg-slate-700",
                sidenavType === "dark"
                  ? "text-slate-300 hover:text-white"
                  : "text-slate-700 hover:text-slate-900"
              )}
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm font-medium">Settings</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

