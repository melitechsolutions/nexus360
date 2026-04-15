import React from "react";
import { LucideIcon, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  badge?: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({
  title,
  description,
  icon: Icon,
  onClick,
  badge,
  disabled = false,
  comingSoon = false,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || comingSoon}
      className={cn(
        "group relative overflow-hidden rounded-lg border-2 border-gray-200 p-6 text-left transition-all duration-300",
        "hover:border-blue-500 hover:shadow-lg dark:border-gray-700 dark:hover:border-blue-400",
        "disabled:opacity-50 disabled:cursor-not-allowed dark:disabled:opacity-40",
        "bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800"
      )}
    >
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform duration-300 dark:bg-blue-950 dark:text-blue-400">
            <Icon size={24} />
          </div>
          {badge && (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
              {badge}
            </span>
          )}
        </div>

        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-300 dark:text-gray-100 dark:group-hover:text-blue-400">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mt-1 dark:text-gray-400">{description}</p>

        {comingSoon && (
          <p className="text-xs font-medium text-orange-600 mt-3 dark:text-orange-400">
            Coming Soon
          </p>
        )}

        <div className="flex items-center gap-2 mt-4 text-blue-600 group-hover:gap-3 transition-all duration-300 dark:text-blue-400">
          <span className="text-xs font-semibold">Open</span>
          <ArrowRight size={16} />
        </div>
      </div>
    </button>
  );
};

export default ModuleCard;
