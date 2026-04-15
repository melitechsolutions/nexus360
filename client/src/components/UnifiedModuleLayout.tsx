import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/MaterialTailwind";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, ZoomIn, ZoomOut, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemeCustomization } from "@/contexts/ThemeCustomizationContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { BrandCustomizationModal } from "./BrandCustomizationModal";

export interface CardConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  value: string | number;
  subtitle?: string;
  gradient: {
    from: string;
    to: string;
  };
  onClick?: () => void;
  loading?: boolean;
}

export interface SectionConfig {
  id: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  variant?: "default" | "highlighted" | "minimal";
  fullWidth?: boolean;
}

interface UnifiedModuleLayoutProps {
  title: string;
  description?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  logo?: string;
  cards?: CardConfig[];
  sections?: SectionConfig[];
  breadcrumbs?: Array<{ label: string; href?: string }>;
  backLink?: { label: string; href: string };
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  showThemeToggle?: boolean;
  printable?: boolean;
  isDarkMode?: boolean;
  onThemeToggle?: (isDark: boolean) => void;
  brandColor?: string;
  themeControl?: boolean;
  brandControl?: boolean;
}

/**
 * UnifiedModuleLayout - A consolidated, reusable layout component for all CRM modules.
 * Supports dark/light themes, brand customization, responsive design, and print optimization.
 */
export const UnifiedModuleLayout: React.FC<UnifiedModuleLayoutProps> = ({
  title,
  description,
  subtitle,
  icon,
  logo,
  cards = [],
  sections = [],
  breadcrumbs,
  backLink,
  actions,
  children,
  className,
  contentClassName,
  showThemeToggle = false,
  printable = true,
  isDarkMode: initialDarkMode = false,
  onThemeToggle,
  brandColor = "#3b82f6",
  themeControl = false,
  brandControl = false,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(initialDarkMode);
  const [zoom, setZoom] = useState(100);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const { primaryColor, secondaryColor, borderRadius } = useThemeCustomization();
  const { settings } = useSystemSettings();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const handleThemeToggle = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    onThemeToggle?.(newMode);
    localStorage.setItem("theme-mode", newMode ? "dark" : "light");
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 10, 150));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 10, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  const handlePrint = () => {
    window.print();
  };

  // Combine back button with custom actions
  const combinedActions = (
    <div className="flex items-center gap-2">
      {backLink && (
        <Link href={backLink.href}>
          <a>
            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {backLink.label}
            </Button>
          </a>
        </Link>
      )}
      {(showThemeToggle || themeControl) && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleThemeToggle}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? "☀️" : "🌙"}
        </Button>
      )}
      {brandControl && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowBrandModal(true)}
          title="Customize Brand and Theme"
        >
          <Palette className="h-4 w-4 mr-2" />
          Brand
        </Button>
      )}
      {printable && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">{zoom}%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetZoom}
            title="Reset Zoom"
          >
            ⟲
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            title="Print"
          >
            <Printer className="h-4 w-4" />
          </Button>
        </>
      )}
      {actions}
    </div>
  );

  return (
    <DashboardLayout>
      <div
        className={cn(
          "space-y-6",
          isDarkMode ? "dark bg-slate-900 text-white" : "bg-white",
          className
        )}
        style={{
          "--brand-color": primaryColor || brandColor,
          "--secondary-color": secondaryColor || "#6366f1",
          "--border-radius": borderRadius || "0.5rem",
        } as React.CSSProperties}
      >
        {/* Page Header */}
        <PageHeader
          title={title}
          description={description}
          icon={icon}
          breadcrumbs={breadcrumbs}
          actions={combinedActions}
        />

        {/* Main Content with Zoom */}
        <div
          className={cn("", contentClassName)}
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
            transition: "transform 0.2s ease",
          }}
        >
          {/* Dashboard Cards Grid */}
          {cards.length > 0 && (
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {cards.map((card) => (
                <DashboardCard key={card.id} {...card} />
              ))}
            </section>
          )}

          {/* Content Sections */}
          {sections.length > 0 && (
            <div className="space-y-4">
              {sections.map((section) => (
                <ContentSection key={section.id} {...section} />
              ))}
            </div>
          )}

          {/* Custom Children */}
          {children}
        </div>

        {/* Brand Customization Modal */}
        {brandControl && showBrandModal && (
          <BrandCustomizationModal 
            isOpen={showBrandModal}
            onClose={() => setShowBrandModal(false)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

/**
 * Dashboard Card Component
 */
export const DashboardCard: React.FC<CardConfig> = ({
  id,
  title,
  icon,
  value,
  subtitle,
  gradient,
  onClick,
  loading = false,
}) => {
  return (
    <div
      className="rounded-lg p-4 text-white cursor-pointer hover:shadow-lg transition-shadow"
      style={{
        backgroundImage: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
      }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="text-2xl">{icon}</div>
      </div>
      <p className="text-sm font-medium opacity-90">{title}</p>
      {loading ? (
        <div className="h-6 bg-white bg-opacity-20 rounded mt-2 animate-pulse" />
      ) : (
        <>
          <p className="text-2xl font-bold mt-2">{value}</p>
          {subtitle && <p className="text-xs opacity-75 mt-1">{subtitle}</p>}
        </>
      )}
    </div>
  );
};

/**
 * Content Section Component
 */
export const ContentSection: React.FC<SectionConfig> = ({
  id,
  title,
  subtitle,
  children,
  variant = "default",
  fullWidth = false,
}) => {
  return (
    <section
      className={cn(
        "rounded-lg border p-4",
        variant === "highlighted" && "bg-blue-50 border-blue-200",
        variant === "minimal" && "border-0 shadow-none",
        fullWidth && "w-full"
      )}
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
      </div>
      <div>{children}</div>
    </section>
  );
};

/**
 * Print-Optimized Table Component
 */
interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  width?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface PrintTableProps {
  columns: TableColumn[];
  data: any[];
  title?: string;
  striped?: boolean;
}

export const PrintOptimizedTable: React.FC<PrintTableProps> = ({
  columns,
  data,
  title,
  striped = true,
}) => {
  return (
    <div className="space-y-2">
      {title && <h3 className="text-sm font-semibold">{title}</h3>}
      <table className={cn("w-full text-sm", striped && "")}>
        <thead className="bg-gray-100">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="p-2 text-left font-semibold"
                style={{
                  textAlign: col.align || "left",
                  width: col.width,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className={cn(
                "border-t",
                striped && idx % 2 === 0 && "bg-gray-50"
              )}
            >
              {columns.map((col) => (
                <td
                  key={`${idx}-${col.key}`}
                  className="p-2"
                  style={{
                    textAlign: col.align || "left",
                  }}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Metadata Display Component
 */
interface MetadataItem {
  label: string;
  value: string | number | React.ReactNode;
}

interface MetadataDisplayProps {
  items: MetadataItem[];
  columns?: number;
}

export const MetadataDisplay: React.FC<MetadataDisplayProps> = ({
  items,
  columns = 4,
}) => {
  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      }}
    >
      {items.map((item, idx) => (
        <div key={idx} className="space-y-1">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            {item.label}
          </span>
          <span className="text-lg font-semibold">{item.value}</span>
        </div>
      ))}
    </div>
  );
};

export default UnifiedModuleLayout;

