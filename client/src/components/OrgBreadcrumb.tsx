import React from "react";
import { Link } from "wouter";
import { ChevronRight, Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbEntry {
  label: string;
  href?: string;
}

interface OrgBreadcrumbProps {
  slug: string;
  items: BreadcrumbEntry[];
  className?: string;
}

/**
 * Reusable breadcrumb for org pages.
 * Always prepends "Dashboard" → /org/:slug/dashboard
 * The last item is the current page (no link).
 */
export default function OrgBreadcrumb({ slug, items, className }: OrgBreadcrumbProps) {
  const allItems: BreadcrumbEntry[] = [
    { label: "Dashboard", href: `/org/${slug}/dashboard` },
    ...items,
  ];

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          return (
            <React.Fragment key={index}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage className="text-white/80">{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href} className="text-white/50 hover:text-white/80 transition-colors text-sm">
                      {index === 0 ? (
                        <span className="flex items-center gap-1">
                          <Home className="h-3 w-3" />
                          {item.label}
                        </span>
                      ) : (
                        item.label
                      )}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
