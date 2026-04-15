import { useState, useEffect } from "react";
import {
  Plus,
  X,
  Home,
  DollarSign,
  Users,
  ShoppingCart,
  Clock,
  MessageSquare,
  BarChart3,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

export interface QuickAccessItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  href?: string;
  action?: () => void;
  badge?: number;
  badgeColor?: "default" | "success" | "warning" | "error";
}

interface FloatingActionBarProps {
  items?: QuickAccessItem[];
  position?: "left" | "right";
  collapsed?: boolean;
  onItemClick?: (item: QuickAccessItem) => void;
  sidebarOpen?: boolean;
  sidebarExpanded?: boolean;
}

const DEFAULT_QUICK_ACCESS_ITEMS: QuickAccessItem[] = [
  {
    id: "home",
    label: "Home",
    icon: <Home className="h-5 w-5" />,
    description: "Back to home",
    href: "/",
  },
  {
    id: "create-invoice",
    label: "New Invoice",
    icon: <Plus className="h-5 w-5" />,
    description: "Create a new invoice",
    href: "/invoices/create",
  },
  {
    id: "create-payment",
    label: "Record Payment",
    icon: <DollarSign className="h-5 w-5" />,
    description: "Record a new payment",
    href: "/payments/create",
  },
  {
    id: "view-reports",
    label: "Reports",
    icon: <BarChart3 className="h-5 w-5" />,
    description: "View reports and analytics",
    href: "/reports",
  },
  {
    id: "team",
    label: "Team",
    icon: <Users className="h-5 w-5" />,
    description: "Manage team members",
    href: "/employees",
  },
  {
    id: "orders",
    label: "Orders",
    icon: <ShoppingCart className="h-5 w-5" />,
    description: "View and manage orders",
    href: "/orders",
  },
  {
    id: "pending-approvals",
    label: "Approvals",
    icon: <CheckCircle className="h-5 w-5" />,
    description: "Pending approvals",
    href: "/approvals",
    badge: 0,
    badgeColor: "warning",
  },
  {
    id: "recent-activity",
    label: "Activity",
    icon: <Clock className="h-5 w-5" />,
    description: "Recent activity",
    href: "/activity",
  },
  {
    id: "messages",
    label: "Messages",
    icon: <MessageSquare className="h-5 w-5" />,
    description: "Your messages",
    href: "/messages",
  },
];

export function FloatingActionBar({
  items = DEFAULT_QUICK_ACCESS_ITEMS,
  position = "right",
  collapsed: initialCollapsed = true,
  onItemClick,
  sidebarOpen = false,
  sidebarExpanded = false,
}: FloatingActionBarProps) {
  const [, navigate] = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleItemClick = (item: QuickAccessItem) => {
    onItemClick?.(item);
    if (item.href) {
      navigate(item.href);
    } else if (item.action) {
      item.action();
    }
    // Close after selection
    setIsExpanded(false);
  };

  const positionClasses =
    position === "right"
      ? "right-4 md:right-6"
      : sidebarExpanded
        ? "left-[272px]"
        : "left-20 lg:left-[80px]";

  return (
    <TooltipProvider>
      <div className={cn("fixed bottom-6 md:bottom-8 z-40 transition-all duration-300", positionClasses)}>
        {/* Expanded Menu (when isExpanded = true) */}
        {isExpanded && (
          <div className="mb-4 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 w-80 max-w-[calc(100vw-2rem)]">
            <div className={cn(
              "bg-card border border-border shadow-lg rounded-xl p-3",
              "max-h-[60vh] overflow-y-auto"
            )}>
              <div className="space-y-1">
                {items.map((item) => (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-sm h-10 hover:bg-accent text-foreground px-2"
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="relative flex-shrink-0">
                          {item.icon}
                          {item.badge && item.badge > 0 && (
                            <span className={cn(
                              "absolute -top-2 -right-2 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold text-white",
                              item.badgeColor === "success" && "bg-green-500",
                              item.badgeColor === "warning" && "bg-amber-500",
                              item.badgeColor === "error" && "bg-red-500",
                              !item.badgeColor && "bg-blue-500"
                            )}>
                              {item.badge > 9 ? "9+" : item.badge}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-medium truncate text-foreground text-xs">{item.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        </div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side={position === "right" ? "left" : "right"}>
                      {item.description}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* Close Button - Visible and Easy to Access */}
            <Button
              size="sm"
              variant="outline"
              className="w-full text-foreground border-border hover:bg-accent text-xs h-8"
              onClick={() => setIsExpanded(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Close Quick Actions
            </Button>
          </div>
        )}

        {/* Main FAB Button - Always Visible */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="lg"
              className={cn(
                "rounded-full h-14 w-14 md:h-16 md:w-16 shadow-lg",
                "flex items-center justify-center relative"
              )}
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Close menu" : "Open quick actions"}
            >
              {isExpanded ? (
                <X className="h-6 w-6 md:h-7 md:w-7" />
              ) : (
                <Plus className="h-6 w-6 md:h-7 md:w-7" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side={position === "right" ? "left" : "right"}>
            {isExpanded ? "Close menu" : `Quick Actions (${items.length} available)`}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
