import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

interface BulkProgressTrackerProps {
  title?: string;
  totalItems?: number;
  currentItem?: number;
  failedItems?: number;
}

export default function BulkProgressTracker({
  title = "Bulk Operation in Progress",
  totalItems = 100,
  currentItem = 35,
  failedItems = 2,
}: BulkProgressTrackerProps) {
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState("0:00");

  useEffect(() => {
    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 20;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Update elapsed time
    const interval = setInterval(() => {
      setElapsedTime((prev) => {
        const [minutes, seconds] = prev.split(":").map(Number);
        const totalSeconds = minutes * 60 + seconds + 1;
        const newMinutes = Math.floor(totalSeconds / 60);
        const newSeconds = totalSeconds % 60;
        return `${newMinutes}:${newSeconds.toString().padStart(2, "0")}`;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const successCount = currentItem - failedItems;
  const progressPercent = (currentItem / totalItems) * 100;

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          {title}
        </CardTitle>
        <CardDescription>Operation status and progress</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="text-muted-foreground">{Math.min(100, Math.round(progressPercent))}%</span>
          </div>
          <Progress value={Math.min(100, progressPercent)} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-3 border">
            <p className="text-xs text-muted-foreground">Processed</p>
            <p className="text-lg font-bold">{currentItem}</p>
            <p className="text-xs text-muted-foreground">of {totalItems}</p>
          </div>

          <div className="bg-white rounded-lg p-3 border border-green-200">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-600" />
              Success
            </p>
            <p className="text-lg font-bold text-green-600">{successCount}</p>
          </div>

          <div className="bg-white rounded-lg p-3 border border-red-200">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-red-600" />
              Failed
            </p>
            <p className="text-lg font-bold text-red-600">{failedItems}</p>
          </div>

          <div className="bg-white rounded-lg p-3 border">
            <p className="text-xs text-muted-foreground">Elapsed</p>
            <p className="text-lg font-bold font-mono">{elapsedTime}</p>
          </div>
        </div>

        {/* Status Message */}
        <div className="text-sm text-muted-foreground">
          {currentItem === totalItems
            ? "✓ Bulk operation completed successfully"
            : `Processing item ${currentItem} of ${totalItems}...`}
        </div>
      </CardContent>
    </Card>
  );
}
