import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2, Star, Download, Copy, Mail, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RowAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
  separator?: boolean;
  hidden?: boolean;
}

export interface RowActionsMenuProps {
  /** Primary icon buttons shown directly (before 3-dots) */
  primaryActions?: RowAction[];
  /** Items shown inside the 3-dots dropdown */
  menuActions?: RowAction[];
  /** Show star/favorite button */
  showStar?: boolean;
  starred?: boolean;
  onToggleStar?: () => void;
  /** Show download button */
  showDownload?: boolean;
  onDownload?: () => void;
}

export function RowActionsMenu({
  primaryActions = [],
  menuActions = [],
  showStar = false,
  starred = false,
  onToggleStar,
  showDownload = false,
  onDownload,
}: RowActionsMenuProps) {
  const visiblePrimary = primaryActions.filter((a) => !a.hidden);
  const visibleMenu = menuActions.filter((a) => !a.hidden);

  return (
    <div className="flex items-center gap-0.5 justify-end">
      {/* Primary action icon buttons */}
      {visiblePrimary.map((action, i) => (
        <Button
          key={i}
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            action.variant === "destructive" && "text-destructive hover:text-destructive"
          )}
          onClick={action.onClick}
          title={action.label}
        >
          {action.icon}
        </Button>
      ))}

      {/* 3-dots dropdown menu */}
      {visibleMenu.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {visibleMenu.map((action, i) => (
              <div key={i}>
                {action.separator && i > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onClick={action.onClick}
                  className={cn(
                    "gap-2 cursor-pointer",
                    action.variant === "destructive" && "text-destructive focus:text-destructive"
                  )}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Star/favorite button */}
      {showStar && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleStar}
          title={starred ? "Remove from favorites" : "Add to favorites"}
        >
          <Star
            className={cn("h-4 w-4", starred && "fill-yellow-400 text-yellow-400")}
          />
        </Button>
      )}

      {/* Download button */}
      {showDownload && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onDownload}
          title="Download"
        >
          <Download className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/** Pre-built action presets for common operations */
export const actionIcons = {
  view: <Eye className="h-4 w-4" />,
  edit: <Edit className="h-4 w-4" />,
  delete: <Trash2 className="h-4 w-4" />,
  download: <Download className="h-4 w-4" />,
  copy: <Copy className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  externalLink: <ExternalLink className="h-4 w-4" />,
  star: <Star className="h-4 w-4" />,
};
