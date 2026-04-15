import React from "react";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/MaterialTailwind";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModuleLayoutProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  backLink?: { label: string; href: string }; // New prop for unified back button
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function ModuleLayout({
  title,
  description,
  icon,
  breadcrumbs,
  backLink,
  actions,
  children,
  className,
  contentClassName,
}: ModuleLayoutProps) {
  // Combine back button with custom actions
  const combinedActions = (
    <div className="flex items-center gap-2">
      {backLink && (
        <Link href={backLink.href}>
          <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {backLink.label}
          </Button>
        </Link>
      )}
      {actions}
    </div>
  );

  return (
    <DashboardLayout>
      <div className={cn("space-y-6", className)}>
        {/* Page Header */}
        <PageHeader
          title={title}
          description={description}
          icon={icon}
          breadcrumbs={breadcrumbs}
          actions={combinedActions}
        />

        {/* Page Content */}
        <div className={cn("", contentClassName)}>
          {children}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ModuleLayout;

