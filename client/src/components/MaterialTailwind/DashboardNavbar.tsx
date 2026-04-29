import React from "react";
import { useLocation } from "wouter";
import { useMaterialTailwindController, setOpenSidenav, setOpenRightSidebar } from "@/contexts/MaterialTailwindContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Menu,
  Search,
  Bell,
  Settings,
  LogOut,
  User,
  ChevronRight,
  Sun,
  Moon,
  Zap,
  X,
} from "lucide-react";

export function DashboardNavbar() {
  const [controller, dispatch] = useMaterialTailwindController();
  const { openSidenav, fixedNavbar } = controller;
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, setLocationPath] = useLocation();
  const [pathname] = useLocation();

  const breadcrumbs = pathname.split("/").filter(Boolean);
  const currentPage = breadcrumbs[breadcrumbs.length - 1]?.replace(/-/g, " ") || "Dashboard";

  return (
    <>
      {/* 
        HAMBURGER MENU BUTTON - Fixed Position
        =====================================
        This button is positioned fixed to ensure it's always accessible
        regardless of the sidenav state (open/closed).
        
        Z-INDEX HIERARCHY:
        - z-[60]: Hamburger button (highest - always clickable)
        - z-50: Sidenav sidebar
        - z-40: Sidenav overlay/backdrop
        
        TO MODIFY Z-INDEX:
        Change the z-[60] value below. Higher number = appears on top.
        Tailwind z-index values: z-0, z-10, z-20, z-30, z-40, z-50, or z-[custom]
      */}
      <button
        onClick={() => setOpenSidenav(dispatch, !openSidenav)}
        className={cn(
          "fixed top-4 left-4 z-[60] xl:hidden",
          "p-2.5 rounded-lg shadow-lg transition-all duration-300",
          "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
          "hover:bg-slate-100 dark:hover:bg-slate-700",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          // Move button to the right when sidenav is open to avoid overlap
          openSidenav ? "left-[280px]" : "left-4"
        )}
        aria-label={openSidenav ? "Close sidebar" : "Open sidebar"}
      >
        {openSidenav ? (
          <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        ) : (
          <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        )}
      </button>

      {/* Main Navbar */}
      <nav
        className={cn(
          "sticky top-0 z-30 border-b transition-all",
          fixedNavbar
            ? "bg-white dark:bg-slate-900 shadow-md border-slate-200 dark:border-slate-700"
            : "bg-transparent border-slate-200/50 dark:border-slate-700/50"
        )}
      >
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left Section - Breadcrumbs */}
          <div className="flex items-center gap-4">
            {/* Spacer for hamburger button on mobile */}
            <div className="w-12 xl:hidden" />

            <div className="hidden md:block">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <ChevronRight className="w-4 h-4" />}
                    <span className="capitalize">{crumb.replace(/-/g, " ")}</span>
                  </React.Fragment>
                ))}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white capitalize mt-1">
                {currentPage}
              </h1>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="hidden md:block relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search..."
                className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-white"
              />
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600" />
              )}
            </button>

            {/* Notifications */}
            <button className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} />
                    <AvatarFallback className="dark:bg-slate-700 dark:text-white">{user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium text-slate-900 dark:text-white">
                    {user?.name || "User"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 dark:bg-slate-800 dark:border-slate-700">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="font-semibold dark:text-white">{user?.name || "User"}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">{user?.email || "No email"}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="dark:bg-slate-700" />
                <DropdownMenuItem 
                  className="cursor-pointer text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  onClick={() => setLocationPath("/profile")}
                >
                  <User className="w-4 h-4 mr-2" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  onClick={() => setLocationPath("/settings")}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="dark:bg-slate-700" />
                <DropdownMenuItem 
                  className="cursor-pointer text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-700"
                  onClick={() => logout()}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Right Sidebar Toggle (Quick Actions) */}
            <button
              onClick={() => setOpenRightSidebar(dispatch, true)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Quick Actions"
            >
              <Zap className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
