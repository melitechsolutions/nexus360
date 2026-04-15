import React from "react";
import { cn } from "@/lib/utils";

export interface FormToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

export const FormToggle: React.FC<FormToggleProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  id,
}) => {
  return (
    <div className="flex items-start justify-between py-4 px-4 border-b border-gray-200 last:border-b-0 dark:border-gray-700">
      <div className="flex-1">
        <label
          htmlFor={id}
          className={cn(
            "text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">{description}</p>
        )}
      </div>

      {/* Toggle Switch */}
      <button
        id={id}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        role="switch"
        aria-checked={checked}
        className={cn(
          "relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 ml-4 flex-shrink-0",
          checked
            ? "bg-blue-600 dark:bg-blue-500"
            : "bg-gray-300 dark:bg-gray-600",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        )}
      >
        <span
          className={cn(
            "inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300",
            checked ? "translate-x-9" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
};

export default FormToggle;
