import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ProjectProgressBarProps {
  projectId: string;
  projectName: string;
  currentProgress: number;
  onProgressUpdate?: (progress: number) => void;
  isEditable?: boolean;
}

export function ProjectProgressBar({
  projectId,
  projectName,
  currentProgress,
  onProgressUpdate,
  isEditable = true,
}: ProjectProgressBarProps) {
  const [progress, setProgress] = useState(currentProgress);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProgress, setNewProgress] = useState(currentProgress.toString());

  const getProgressColor = (value: number) => {
    if (value < 25) return "bg-red-500";
    if (value < 50) return "bg-orange-500";
    if (value < 75) return "bg-yellow-500";
    if (value < 100) return "bg-blue-500";
    return "bg-green-500";
  };

  const getProgressLabel = (value: number) => {
    if (value === 0) return "Not Started";
    if (value < 25) return "Planning";
    if (value < 50) return "In Progress";
    if (value < 75) return "Advanced";
    if (value < 100) return "Nearly Complete";
    return "Completed";
  };

  const handleUpdateProgress = () => {
    const newVal = parseInt(newProgress);
    
    if (isNaN(newVal) || newVal < 0 || newVal > 100) {
      toast.error("Please enter a value between 0 and 100");
      return;
    }

    setProgress(newVal);
    setIsDialogOpen(false);
    
    if (onProgressUpdate) {
      onProgressUpdate(newVal);
    }

    toast.success(`Project progress updated to ${newVal}%`);
  };

  const handleQuickUpdate = (value: number) => {
    setProgress(value);
    if (onProgressUpdate) {
      onProgressUpdate(value);
    }
    toast.success(`Project progress updated to ${value}%`);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {progress === 100 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : progress > 0 ? (
                <AlertCircle className="h-5 w-5 text-blue-500" />
              ) : null}
              Project Progress
            </CardTitle>
            <CardDescription>{projectName}</CardDescription>
          </div>
          {isEditable && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Project Progress</DialogTitle>
                  <DialogDescription>
                    Enter the new progress percentage for {projectName}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="progress">Progress (%)</Label>
                    <Input
                      id="progress"
                      type="number"
                      min="0"
                      max="100"
                      value={newProgress}
                      onChange={(e) => setNewProgress(e.target.value)}
                      placeholder="Enter progress percentage"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Quick Actions</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {[0, 25, 50, 75, 100].map((val) => (
                        <Button
                          key={val}
                          variant={parseInt(newProgress) === val ? "default" : "outline"}
                          size="sm"
                          onClick={() => setNewProgress(val.toString())}
                        >
                          {val}%
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateProgress}>
                    Update Progress
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{getProgressLabel(progress)}</span>
            <span className="text-sm font-bold text-gray-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full ${getProgressColor(progress)} transition-all duration-300 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Progress Details */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-4">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-xs text-gray-600">Start</div>
            <div className="text-sm font-semibold">0%</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-xs text-gray-600">Quarter</div>
            <div className="text-sm font-semibold">25%</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-xs text-gray-600">Halfway</div>
            <div className="text-sm font-semibold">50%</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-xs text-gray-600">Complete</div>
            <div className="text-sm font-semibold">100%</div>
          </div>
        </div>

        {/* Quick Update Buttons */}
        {isEditable && (
          <div className="pt-4 border-t">
            <div className="text-sm font-medium mb-2">Quick Update</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {[0, 25, 50, 75, 100].map((val) => (
                <Button
                  key={val}
                  variant={progress === val ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickUpdate(val)}
                  className="text-xs"
                >
                  {val}%
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Status Indicator */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            {progress === 100 ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-sm font-semibold text-green-700">Project Completed</div>
                  <div className="text-xs text-green-600">All tasks finished</div>
                </div>
              </>
            ) : progress > 0 ? (
              <>
                <AlertCircle className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-sm font-semibold text-blue-700">In Progress</div>
                  <div className="text-xs text-blue-600">{100 - progress}% remaining</div>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm font-semibold text-gray-700">Not Started</div>
                  <div className="text-xs text-gray-600">Ready to begin</div>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
