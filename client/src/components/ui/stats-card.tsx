import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface StatsCardProps {
  label: string;
  value: string | number | React.ReactNode;
  description?: string | React.ReactNode;
  icon?: React.ReactNode;
  /** Left border color class, e.g. "border-l-blue-500" */
  color?: string;
  /** Optional gradient bg for the icon container, e.g. "bg-gradient-to-br from-blue-500 to-blue-600" */
  iconBg?: string;
  onClick?: () => void;
  className?: string;
  loading?: boolean;
}

export function StatsCard({
  label,
  value,
  description,
  icon,
  color = "border-l-blue-500",
  iconBg,
  onClick,
  className,
  loading,
}: StatsCardProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-xl border-l-4 p-4 sm:p-5 text-left transition-all duration-300",
        "bg-white dark:bg-slate-800/60 border-t border-r border-b border-slate-200 dark:border-slate-700",
        "hover:shadow-lg hover:-translate-y-0.5",
        onClick && "cursor-pointer active:scale-[0.98]",
        color,
        className
      )}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.07] transition-opacity duration-300 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 pointer-events-none" />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1.5 flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>
          {loading ? (
            <div className="flex items-center gap-2 h-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 truncate">
              {value}
            </p>
          )}
          {description && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
        {icon && (
          iconBg ? (
            <div className={cn("ml-3 p-2.5 rounded-lg text-white shadow-lg flex-shrink-0", iconBg)}>
              {icon}
            </div>
          ) : (
            <div className="ml-3 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition-colors flex-shrink-0">
              {icon}
            </div>
          )
        )}
      </div>
    </Comp>
  );
}
