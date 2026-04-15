/**
 * Mobile App Foundation - React Native / React Web with Responsive Design
 * Provides mobile-optimized UI components and responsive layouts
 */

import React, { useState, useEffect } from "react";
import { Menu, X, ChevronRight, Bell, Search, Home, Settings } from "lucide-react";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
}

/**
 * Mobile-first responsive layout component
 */
export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  sidebar,
  header,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Header */}
      {isMobile && (
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              CRM
            </h1>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Mobile Search */}
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </header>
      )}

      {/* Desktop Header */}
      {!isMobile && header}

      <div className="flex">
        {/* Mobile Sidebar (Overlay) */}
        {isMobile && isMobileMenuOpen && (
          <div className="fixed inset-0 z-30 flex">
            <div
              className="flex-1 bg-black/50"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="w-64 bg-white dark:bg-gray-800 overflow-y-auto">
              {sidebar}
            </div>
          </div>
        )}

        {/* Desktop Sidebar */}
        {!isMobile && (
          <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen sticky top-0 overflow-y-auto">
            {sidebar}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around">
          {[
            { icon: Home, label: "Home", active: true },
            { icon: Bell, label: "Alerts", active: false },
            { icon: Search, label: "Search", active: false },
            { icon: Settings, label: "Settings", active: false },
          ].map((item) => (
            <button
              key={item.label}
              className={`flex-1 flex flex-col items-center justify-center py-3 ${
                item.active
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Add padding for mobile bottom nav */}
      {isMobile && <div className="h-16" />}
    </div>
  );
};

/**
 * Mobile Card Component - Optimized touch target sizes
 */
export const MobileCard: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onTap?: () => void;
  actionLabel?: string;
}> = ({ title, subtitle, children, onTap, actionLabel }) => (
  <div
    onClick={onTap}
    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4 touch-friendly"
  >
    <div className="flex items-start justify-between">
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {onTap && (
        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1" />
      )}
    </div>
    <div className="mt-3">{children}</div>
    {actionLabel && onTap && (
      <button className="mt-3 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm min-h-[44px]">
        {actionLabel}
      </button>
    )}
  </div>
);

/**
 * Mobile List Component - Optimized for touch
 */
export const MobileList: React.FC<{
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    badge?: string | number;
  }>;
  onItemTap?: (id: string) => void;
}> = ({ items, onItemTap }) => (
  <div className="divide-y divide-gray-200 dark:divide-gray-700">
    {items.map((item) => (
      <button
        key={item.id}
        onClick={() => onItemTap?.(item.id)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[56px]"
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          {item.icon && (
            <div className="flex-shrink-0 text-blue-600 dark:text-blue-400">
              {item.icon}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {item.title}
            </p>
            {item.subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {item.subtitle}
              </p>
            )}
          </div>
        </div>
        {item.badge && (
          <span className="ml-2 inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            {item.badge}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0" />
      </button>
    ))}
  </div>
);

/**
 * Mobile Form Input - Touch-friendly
 */
export const MobileFormInput: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
  }
> = ({ label, error, ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      {label}
    </label>
    <input
      {...props}
      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
    />
    {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
  </div>
);

/**
 * Mobile Button - Touch-optimized
 */
export const MobileButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "outline";
    fullWidth?: boolean;
    size?: "sm" | "md" | "lg";
  }
> = ({ variant = "primary", fullWidth = true, size = "md", children, className, ...props }) => {
  const baseClass = "font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500";
  const sizeClass = {
    sm: "px-3 py-2 text-sm min-h-[40px]",
    md: "px-4 py-3 text-base min-h-[44px]",
    lg: "px-6 py-4 text-lg min-h-[48px]",
  }[size];

  const variantClass = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800",
  }[variant];

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      {...props}
      className={`${baseClass} ${sizeClass} ${variantClass} ${widthClass} ${className}`}
    >
      {children}
    </button>
  );
};

/**
 * Mobile Modal/Sheet - Bottom sheet for actions
 */
export const MobileSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom">
        {/* Handle Bar */}
        <div className="flex justify-center pt-2 pb-4">
          <div className="h-1 w-12 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-6 pb-8">{children}</div>
      </div>
    </div>
  );
};

export default ResponsiveLayout;
