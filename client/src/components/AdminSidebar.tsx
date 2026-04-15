import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Menu, X, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminSidebarItem {
  title: string;
  icon: LucideIcon;
  href: string;
  badge?: string | number;
}

interface AdminSidebarProps {
  title: string;
  icon: LucideIcon;
  items: AdminSidebarItem[];
  children: React.ReactNode;
}

/**
 * Responsive admin sidebar component
 * - Desktop: Fixed sidebar on the left
 * - Mobile: Collapsible overlay sidebar
 */
export function AdminSidebar({ title, icon: Icon, items, children }: AdminSidebarProps) {
  const [, setLocation] = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const renderSidebarContent = () => (
    <>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            <span className="truncate">{title}</span>
          </CardTitle>
          {mobileNavOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 md:hidden"
              onClick={() => setMobileNavOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map((item) => {
          const ItemIcon = item.icon;
          return (
            <button
              key={item.href}
              onClick={() => {
                setLocation(item.href);
                setMobileNavOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition",
                "hover:bg-muted",
                "group"
              )}
              title={item.title}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ItemIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate group-hover:font-medium">{item.title}</span>
              </div>
              {item.badge && (
                <span className="flex-shrink-0 ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </CardContent>
    </>
  );

  return (
    <div className="flex gap-4 h-full">
      {/* Desktop Sidebar */}
      <Card className="hidden md:flex md:w-60 md:flex-shrink-0 md:flex-col">
        {renderSidebarContent()}
      </Card>

      {/* Mobile Sidebar Overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        >
          <Card
            className="fixed left-0 top-0 h-full w-64 flex-shrink-0 flex flex-col rounded-none"
            onClick={(e) => e.stopPropagation()}
          >
            {renderSidebarContent()}
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
          <h1 className="text-lg font-semibold flex items-center gap-2 truncate">
            <Icon className="w-5 h-5 flex-shrink-0" />
            {title}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="flex-shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export default AdminSidebar;
