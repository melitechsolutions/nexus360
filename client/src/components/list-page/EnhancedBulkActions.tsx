import { Button } from "@/components/ui/button";
import {
  Check,
  Download,
  Copy,
  Mail,
  Trash2,
  X,
  RefreshCw,
  Archive,
  Send,
  FileText,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/export-utils";
import { buildCommunicationComposePath } from "@/lib/communications";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export interface BulkActionConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "destructive";
  onClick: () => void | Promise<void>;
  /** If true, shows confirmation dialog before executing */
  confirm?: boolean;
  confirmMessage?: string;
}

interface EnhancedBulkActionsProps {
  selectedCount: number;
  onClear: () => void;
  actions: BulkActionConfig[];
}

/**
 * Standardized bulk actions bar shown when table rows are selected.
 * Displays selection count, action buttons, and a clear button.
 */
export function EnhancedBulkActions({
  selectedCount,
  onClear,
  actions,
}: EnhancedBulkActionsProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: BulkActionConfig | null;
  }>({ open: false, action: null });

  if (selectedCount === 0) return null;

  const handleAction = (action: BulkActionConfig) => {
    if (action.confirm) {
      setConfirmDialog({ open: true, action });
    } else {
      action.onClick();
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 rounded-lg border bg-primary/5">
        <span className="text-sm font-medium whitespace-nowrap">
          {selectedCount} selected
        </span>
        {actions.map((action) => (
          <Button
            key={action.id}
            size="sm"
            variant={action.variant || "outline"}
            className={
              action.variant === "destructive"
                ? "text-destructive border-destructive/30 hover:bg-destructive/10"
                : ""
            }
            onClick={() => handleAction(action)}
          >
            {action.icon}
            <span className="hidden sm:inline ml-1">{action.label}</span>
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={onClear}>
          <X className="h-3.5 w-3.5" />
          <span className="hidden sm:inline ml-1">Clear</span>
        </Button>
      </div>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog({ open: false, action: null });
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Confirm Action</AlertDialogTitle>
          <AlertDialogDescription>
            {confirmDialog.action?.confirmMessage ||
              `Are you sure you want to ${confirmDialog.action?.label?.toLowerCase()} ${selectedCount} item(s)? This action cannot be undone.`}
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmDialog.action?.onClick();
                setConfirmDialog({ open: false, action: null });
              }}
              className={
                confirmDialog.action?.variant === "destructive"
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              }
            >
              {confirmDialog.action?.label}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// =============================================
// Bulk action factory helpers
// =============================================

/** Creates a standard "Export CSV" bulk action */
export function bulkExportAction(
  selectedIds: Set<string>,
  items: any[],
  columns: { key: string; label: string }[],
  filename: string
): BulkActionConfig {
  return {
    id: "export",
    label: "Export",
    icon: <Download className="h-3.5 w-3.5" />,
    onClick: () => {
      const selected = items.filter((item) => selectedIds.has(item.id));
      const rows = selected.map((item) => {
        const row: Record<string, any> = {};
        columns.forEach((col) => {
          row[col.label] = item[col.key] ?? "";
        });
        return row;
      });
      downloadCSV(rows, filename);
    },
  };
}

/** Creates a standard "Copy IDs" bulk action */
export function bulkCopyIdsAction(selectedIds: Set<string>): BulkActionConfig {
  return {
    id: "copyIds",
    label: "Copy IDs",
    icon: <Copy className="h-3.5 w-3.5" />,
    onClick: () => {
      navigator.clipboard.writeText(Array.from(selectedIds).join(", "));
      toast.success(`Copied ${selectedIds.size} IDs to clipboard`);
    },
  };
}

/** Creates a standard "Delete" bulk action with confirmation */
export function bulkDeleteAction(
  selectedIds: Set<string>,
  onDelete: (ids: string[]) => void | Promise<void>,
  label = "Delete"
): BulkActionConfig {
  return {
    id: "delete",
    label,
    icon: <Trash2 className="h-3.5 w-3.5" />,
    variant: "destructive",
    confirm: true,
    confirmMessage: `Are you sure you want to delete ${selectedIds.size} item(s)? This action cannot be undone.`,
    onClick: () => onDelete(Array.from(selectedIds)),
  };
}

/** Creates an "Approve" bulk action */
export function bulkApproveAction(
  selectedIds: Set<string>,
  onApprove: (ids: string[]) => void | Promise<void>
): BulkActionConfig {
  return {
    id: "approve",
    label: "Approve",
    icon: <Check className="h-3.5 w-3.5" />,
    onClick: () => onApprove(Array.from(selectedIds)),
  };
}

/** Creates an "Email" bulk action */
export function bulkEmailAction(
  navigate: (path: string) => void,
  currentPath: string = window.location.pathname
): BulkActionConfig {
  return {
    id: "email",
    label: "Email",
    icon: <Mail className="h-3.5 w-3.5" />,
    onClick: () => navigate(buildCommunicationComposePath(currentPath)),
  };
}

/** Creates a "Send" bulk action */
export function bulkSendAction(
  selectedIds: Set<string>,
  onSend: (ids: string[]) => void | Promise<void>
): BulkActionConfig {
  return {
    id: "send",
    label: "Send",
    icon: <Send className="h-3.5 w-3.5" />,
    onClick: () => onSend(Array.from(selectedIds)),
  };
}

/** Creates an "Archive" bulk action */
export function bulkArchiveAction(
  selectedIds: Set<string>,
  onArchive: (ids: string[]) => void | Promise<void>
): BulkActionConfig {
  return {
    id: "archive",
    label: "Archive",
    icon: <Archive className="h-3.5 w-3.5" />,
    confirm: true,
    confirmMessage: `Archive ${selectedIds.size} item(s)?`,
    onClick: () => onArchive(Array.from(selectedIds)),
  };
}
