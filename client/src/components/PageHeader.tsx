import React, { Fragment } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PageHeaderIcon = React.ReactNode | React.ElementType;

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: PageHeaderIcon;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  className?: string;
}

function renderHeaderIcon(icon: PageHeaderIcon | undefined) {
  if (!icon) {
    return null;
  }

  if (React.isValidElement(icon)) {
    return icon;
  }

  if (typeof icon === "string") {
    return <span className="text-sm font-semibold">{icon}</span>;
  }

  if (typeof icon === "function") {
    const IconComponent = icon;
    return <IconComponent className="w-6 h-6" />;
  }

  if (typeof icon === "object" && icon !== null && "$$typeof" in icon && "render" in icon) {
    const IconComponent = icon as unknown as React.ElementType;
    return <IconComponent className="w-6 h-6" />;
  }

  return null;
}

export function PageHeader({
  title,
  description,
  icon,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 sm:p-8 shadow-2xl">
        {/* Decorative blur circles */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 text-sm mb-4">
              {breadcrumbs.map((item, index) => (
                <Fragment key={`${index}-${item.href || item.label}`}>
                  {index > 0 && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 mx-1" />
                  )}
                  {item.href ? (
                    <Link href={item.href} className="text-slate-400 hover:text-white transition-colors font-medium">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-white font-semibold">{item.label}</span>
                  )}
                </Fragment>
              ))}
            </nav>
          )}

          {/* Header Content */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {icon && (
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white flex-shrink-0">
                  {renderHeaderIcon(icon)}
                </div>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {title}
                </h1>
                {description && (
                  <p className="text-slate-300 mt-1 max-w-2xl text-sm sm:text-base">{description}</p>
                )}
              </div>
            </div>
            {actions && (
              <div className="flex items-center gap-2 flex-shrink-0 [&_button]:border-white/20 [&_button]:text-white [&_button]:hover:bg-white/10">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

