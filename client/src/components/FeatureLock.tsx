/**
 * Feature Lock UI Components
 * Crown/Diamond emblems for tier-locked features
 */

import { Crown, Gem } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureLockBadgeProps {
  tier: "basic" | "pro" | "enterprise";
  className?: string;
  showLabel?: boolean;
}

export function FeatureLockBadge({ tier, className, showLabel }: FeatureLockBadgeProps) {
  const tierConfig = {
    basic: {
      icon: Gem,
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950",
      borderColor: "border-amber-200 dark:border-amber-800",
      label: "Upgrade",
    },
    pro: {
      icon: Crown,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950",
      borderColor: "border-purple-200 dark:border-purple-800",
      label: "Pro",
    },
    enterprise: {
      icon: Crown,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      borderColor: "border-blue-200 dark:border-blue-800",
      label: "Enterprise",
    },
  };

  const config = tierConfig[tier];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded border",
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <Icon className={cn("w-3 h-3", config.color)} />
      {showLabel && <span className="text-xs font-medium">{config.label}</span>}
    </div>
  );
}

interface FeatureLockedOverlayProps {
  tier: "basic" | "pro" | "enterprise";
  children: React.ReactNode;
  isLocked?: boolean;
}

/**
 * Overlay component for locked features
 * Shows on hover when feature is not in current tier
 */
export function FeatureLockedOverlay({ tier, children, isLocked = true }: FeatureLockedOverlayProps) {
  const tierNames = {
    basic: "Basic Plan",
    pro: "Pro Plan",
    enterprise: "Enterprise Plan",
  };

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative group">
      {children}
      <div className="absolute inset-0 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none group-hover:pointer-events-auto">
        <div className="bg-white dark:bg-slate-950 p-3 rounded shadow-lg text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            {tier === "enterprise" ? (
              <Crown className="w-4 h-4 text-blue-500" />
            ) : (
              <Gem className="w-4 h-4 text-amber-500" />
            )}
            <span className="font-semibold text-sm">{tierNames[tier]}</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Upgrade to access this feature
          </p>
        </div>
      </div>
    </div>
  );
}

interface FeatureLockIndicatorProps {
  requiredTier: "basic" | "pro" | "enterprise";
  currentTier?: string;
  featureName?: string;
}

/**
 * Indicator showing if feature is locked based on tier
 */
export function FeatureLockIndicator({
  requiredTier,
  currentTier,
  featureName,
}: FeatureLockIndicatorProps) {
  const isLocked = !currentTier || isFeatureLocked(currentTier, requiredTier);

  if (!isLocked) return null;

  return (
    <div className="flex items-center gap-2 text-xs">
      <FeatureLockBadge tier={requiredTier} />
      {featureName && <span className="text-slate-600 dark:text-slate-400">{featureName}</span>}
    </div>
  );
}

/**
 * Check if feature is locked based on current tier
 */
export function isFeatureLocked(currentTier: string, requiredTier: string): boolean {
  const tierHierarchy = { free: 0, basic: 1, pro: 2, enterprise: 3 };
  const current = tierHierarchy[currentTier as keyof typeof tierHierarchy] || 0;
  const required = tierHierarchy[requiredTier as keyof typeof tierHierarchy] || 3;
  return current < required;
}

/**
 * Get accessible features for a tier
 */
export const TIER_FEATURES = {
  free: [
    "dashboard",
    "basic_crm",
    "invoices",
    "contacts",
    "5_users",
  ],
  basic: [
    "dashboard",
    "crm",
    "invoices",
    "estimates",
    "contacts",
    "products",
    "services",
    "10_users",
    "basic_reports",
  ],
  pro: [
    "dashboard",
    "crm",
    "invoices",
    "estimates",
    "contacts",
    "products",
    "services",
    "hr_management",
    "payroll",
    "50_users",
    "advanced_reports",
    "automation",
    "bulk_operations",
  ],
  enterprise: [
    "dashboard",
    "crm",
    "invoices",
    "estimates",
    "contacts",
    "products",
    "services",
    "hr_management",
    "payroll",
    "unlimited_users",
    "advanced_reports",
    "automation",
    "bulk_operations",
    "api_access",
    "sso",
    "custom_workflows",
    "dedicated_support",
  ],
};

/**
 * Check if feature is available in tier
 */
export function hasFeature(tier: string, feature: string): boolean {
  const features = TIER_FEATURES[tier as keyof typeof TIER_FEATURES] || [];
  return features.includes(feature);
}
