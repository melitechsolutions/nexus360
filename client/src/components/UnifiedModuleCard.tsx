/**
 * UnifiedModuleCard - Reusable component for consistent card design across the app
 * 
 * Applies the same styling from DashboardHome to all module cards:
 * - Gradient backgrounds
 * - Hover animations and translations
 * - Shadow effects
 * - Rounded corners
 * - Dark mode support
 */

import React from "react";
import { cn } from "@/lib/utils";
import { ArrowRight, Plus, Loader2 } from "lucide-react";

interface UnifiedModuleCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: string;
  stats?: Array<{
    label: string;
    value: string | number;
  }>;
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
  onCreateAction?: () => void;
  color?: string; // Gradient color (e.g., "from-blue-100 to-blue-50 dark:from-blue-950 dark:to-blue-900")
  isLoading?: boolean;
  children?: React.ReactNode;
  className?: string;
  stats?: Array<{
    label: string;
    value: string | number;
  }>;
}

export function UnifiedModuleCard({
  title,
  description,
  icon,
  badge,
  stats,
  actionHref,
  actionLabel = "View",
  onAction,
  onCreateAction,
  color = "from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-800",
  isLoading = false,
  children,
  className,
}: UnifiedModuleCardProps) {
  const handleActionClick = () => {
    if (onAction) {
      onAction();
    } else if (actionHref) {
      window.location.href = actionHref;
    }
  };

  return (
    <button
      onClick={handleActionClick}
      disabled={isLoading}
      className={cn(
        "group relative overflow-hidden rounded-xl border transition-all duration-300",
        "bg-gradient-to-br border-slate-200 dark:border-slate-700",
        "p-4 sm:p-5 md:p-6 text-left",
        "hover:shadow-xl hover:-translate-y-1.5 dark:hover:border-slate-600",
        "hover:border-slate-300 active:scale-95",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "backdrop-blur-sm dark:bg-slate-800/70",
        `bg-gradient-to-br ${color}`,
        className
      )}
    >
      {/* Decorative gradient background */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all duration-500"></div>
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all duration-500"></div>

      {/* Content */}
      <div className="relative z-10 space-y-3 sm:space-y-4">
        {/* Header with icon and badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            {icon && (
              <div className="inline-flex p-2 sm:p-2.5 rounded-lg bg-white/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 shadow-sm group-hover:bg-white/70 dark:group-hover:bg-slate-600/70 transition-all duration-300">
                {icon}
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-100 transition-colors">
                {title}
              </h3>
              {description && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>
          {badge && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 whitespace-nowrap">
              {badge}
            </span>
          )}
        </div>

        {/* Stats */}
        {stats && stats.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white/40 dark:bg-slate-700/40 rounded-lg p-2 sm:p-2.5">
                <p className="text-xs text-slate-600 dark:text-slate-400">{stat.label}</p>
                <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Custom children */}
        {children && <div className="space-y-2">{children}</div>}

        {/* Action buttons */}
        {(actionHref || onAction || onCreateAction) && (
          <div className="flex items-center gap-2 pt-1">
            {onCreateAction && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateAction();
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 transition-all duration-200"
              >
                <Plus className="w-3 h-3" />
                Create
              </button>
            )}
            <div className="flex-1"></div>
            {(actionHref || onAction) && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                {actionLabel}
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Animated bottom border */}
      <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500 bg-gradient-to-r from-transparent via-slate-400 dark:via-slate-600 to-transparent"></div>
    </button>
  );
}

/**
 * UnifiedCardGrid - Container for organizing UnifiedModuleCard components
 */
interface UnifiedCardGridProps {
  children: React.ReactNode;
  className?: string;
}

export function UnifiedCardGrid({ children, className }: UnifiedCardGridProps) {
  return (
    <div className={cn("grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {children}
    </div>
  );
}
