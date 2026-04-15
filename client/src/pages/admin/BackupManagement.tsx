import { useState } from "react";
import { useRequireRole } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import {
  Download,
  AlertCircle,
  Trash2,
  Play,
  HardDrive,
  CheckCircle2,
  Clock,
  Filter,
  Monitor,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/ui/stats-card";
import { Progress } from "@/components/ui/progress";

interface Backup {
  id: string;
  name: string;
  type: "full" | "incremental" | "differential";
  size: string;
  status: "completed" | "in-progress" | "failed" | "scheduled";
  createdAt: Date;
  completedAt?: Date;
  duration: string;
  progress?: number;
  storageLocation: string;
  verificationStatus: "verified" | "pending" | "failed";
}

export default function BackupManagement() {
  const { allowed, isLoading } = useRequireRole(["ict_manager", "super_admin", "admin"]);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);

  // Mock data - in production this would come from tRPC
  const backups: Backup[] = [
    {
      id: "backup-1",
      name: "Daily Full Backup - 2024-03-14",
      type: "full",
      size: "2.4 GB",
      status: "completed",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60000),
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60000 + 45 * 60000),
      duration: "45 minutes",
      storageLocation: "AWS S3 (primary-backup)",
      verificationStatus: "verified",
    },
    {
      id: "backup-2",
      name: "Hourly Incremental - 2024-03-14 14:00",
      type: "incremental",
      size: "124 MB",
      status: "completed",
      createdAt: new Date(Date.now() - 2 * 60 * 60000),
      completedAt: new Date(Date.now() - 2 * 60 * 60000 + 5 * 60000),
      duration: "5 minutes",
      storageLocation: "AWS S3 (incremental)",
      verificationStatus: "verified",
    },
    {
      id: "backup-3",
      name: "Scheduled Daily Backup - 2024-03-15 02:00",
      type: "full",
      size: "0 B",
      status: "scheduled",
      createdAt: new Date(Date.now() + 12 * 60 * 60000),
      duration: "Pending",
      storageLocation: "AWS S3 (primary-backup)",
      verificationStatus: "pending",
    },
    {
      id: "backup-4",
      name: "On-Demand Backup",
      type: "full",
      size: "2.3 GB",
      status: "in-progress",
      createdAt: new Date(Date.now() - 15 * 60000),
      duration: "In progress...",
      progress: 65,
      storageLocation: "AWS S3 (primary-backup)",
      verificationStatus: "pending",
    },
    {
      id: "backup-5",
      name: "Daily Full Backup - 2024-03-13",
      type: "full",
      size: "2.3 GB",
      status: "completed",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60000),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60000 + 42 * 60000),
      duration: "42 minutes",
      storageLocation: "AWS S3 (archive)",
      verificationStatus: "verified",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "scheduled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "in-progress":
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "scheduled":
        return <Clock className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const completedCount = backups.filter((b) => b.status === "completed").length;
  const totalSize = "8.4 GB";
  const lastBackup = backups.find((b) => b.status === "completed");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <ModuleLayout
      title="Backup Management"
      description="Manage database and system backups"
      icon={<Monitor className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "ICT", href: "/dashboards/ict" },
        { label: "Backups" },
      ]}
    >
      <div className="space-y-6">
        {/* Backup Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            label="Total Backups"
            value={backups.length}
            description="All backup records"
            icon={<HardDrive className="h-5 w-5" />}
            color="border-l-blue-500"
          />
          <StatsCard
            label="Completed"
            value={completedCount}
            description="Successfully completed"
            icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
            color="border-l-green-500"
          />
          <StatsCard
            label="Total Storage"
            value={totalSize}
            description="Used backup storage"
            icon={<Filter className="h-5 w-5" />}
            color="border-l-purple-500"
          />
          <StatsCard
            label="Last Backup"
            value={lastBackup ? `${(Date.now() - lastBackup.createdAt.getTime()) / (1000 * 60 * 60)}h ago` : "N/A"}
            description="Most recent backup"
            icon={<Clock className="h-5 w-5" />}
            color="border-l-cyan-500"
          />
        </div>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Backup Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button className="gap-2">
                <Play className="w-4 h-4" />
                Run Backup Now
              </Button>
              <Button variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Verify Backup
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowScheduleDialog(true)}
              >
                <Clock className="w-4 h-4" />
                Schedule Backup
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowRestoreDialog(true)}
              >
                <Download className="w-4 h-4" />
                Restore Backup
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Backups List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Backups</CardTitle>
            <CardDescription>Latest backup operations and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={getStatusColor(backup.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(backup.status)}
                            {backup.status.charAt(0).toUpperCase() + backup.status.slice(1)}
                          </span>
                        </Badge>
                        <Badge variant="outline">{backup.type.charAt(0).toUpperCase() + backup.type.slice(1)}</Badge>
                        <Badge variant="secondary">{backup.size}</Badge>
                      </div>
                      <p className="font-medium text-sm">{backup.name}</p>
                    </div>
                    <div className="flex gap-2">
                      {backup.status === "completed" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => setShowRestoreDialog(true)}
                          >
                            <Download className="w-4 h-4" />
                            Restore
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progress bar for in-progress backups */}
                  {backup.status === "in-progress" && backup.progress !== undefined && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{backup.progress}%</span>
                      </div>
                      <Progress value={backup.progress} className="h-2" />
                    </div>
                  )}

                  <div className="grid gap-2 md:grid-cols-4 text-sm text-gray-600">
                    <div>
                      <p className="text-xs text-gray-500">Created</p>
                      <p>{backup.createdAt.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Duration</p>
                      <p>{backup.duration}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Storage</p>
                      <p>{backup.storageLocation}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Verification</p>
                      <Badge
                        variant="outline"
                        className={
                          backup.verificationStatus === "verified"
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-50 text-gray-700"
                        }
                      >
                        {backup.verificationStatus.charAt(0).toUpperCase() +
                          backup.verificationStatus.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Backup Policy */}
        <Card>
          <CardHeader>
            <CardTitle>Backup Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium mb-1">Full Backups</p>
                  <p className="text-sm text-gray-600">Daily at 02:00 UTC</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Incremental Backups</p>
                  <p className="text-sm text-gray-600">Every hour from 06:00 to 22:00 UTC</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Retention</p>
                  <p className="text-sm text-gray-600">30 days for backups</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Storage</p>
                  <p className="text-sm text-gray-600">AWS S3 with Cross-Region Replication</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <AlertDialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Schedule Backup</AlertDialogTitle>
          <AlertDialogDescription>
            Configure backup schedule (Coming soon - Contact system administrator)
          </AlertDialogDescription>
          <div className="flex gap-3">
            <AlertDialogCancel>Close</AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Restore Backup</AlertDialogTitle>
          <AlertDialogDescription>
            Select a backup to restore (Coming soon - Contact system administrator)
          </AlertDialogDescription>
          <div className="flex gap-3">
            <AlertDialogCancel>Close</AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </ModuleLayout>
  );
}
