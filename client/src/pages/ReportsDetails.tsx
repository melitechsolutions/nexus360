import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleLayout } from "@/components/ModuleLayout";
// Using actions helpers for download/delete
import { ArrowLeft, Edit2, Trash2, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { handleDownload as actionsHandleDownload, handleDelete as actionsHandleDelete } from "@/lib/actions";
import { trpc } from "@/lib/trpc";

export default function ReportsDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Default to current month for date range
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Query sales report for the current month
  const { data: reportData, isLoading } = trpc.reports.salesReport.useQuery({
    startDate,
    endDate,
    groupBy: "month",
  });

  // Generate a report object from the query data
  const report = {
    id: id,
    name: "Monthly Sales Report",
    type: "Sales",
    period: `${startDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
    generatedDate: new Date().toLocaleDateString(),
    totalRevenue: reportData?.summary?.totalSales || 0,
    totalTransactions: reportData?.summary?.totalInvoices || 0,
    status: "Completed",
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await actionsHandleDelete(id || "", "report", async () => {
      // backend delete then navigate
      setLocation("/reports");
    });
    setIsDeleting(false);
    setShowDeleteModal(false);
  };

  const handleDownload = () => actionsHandleDownload(id || "", "report", "pdf", report);

  const handleEdit = () => {
    setLocation(`/reports/${id}/edit`);
  };

  return (
    <ModuleLayout
      title="Report Details"
      description={report.name}
      icon={<FileText className="h-6 w-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Reports", href: "/reports" },
        { label: "Details" },
      ]}
      backLink={{ label: "Reports", href: "/reports" }}
    >
      <div className="space-y-6">

        {isLoading ? (
          <Card>
            <CardContent className="p-8">
              <p className="text-muted-foreground text-center">Loading report data...</p>
            </CardContent>
          </Card>
        ) : !reportData ? (
          <Card>
            <CardContent className="p-8">
              <p className="text-muted-foreground text-center">No report data available</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{report.name}</CardTitle>
                <CardDescription>Period: {report.period}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Report Type</p>
                    <p className="font-semibold">{report.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Status</p>
                    <p className={`font-semibold ${report.status === 'Completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {report.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Generated Date</p>
                    <p className="font-semibold">{report.generatedDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Total Revenue</p>
                    <p className="font-semibold">KES {(report.totalRevenue || 0).toLocaleString()}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-slate-600">Total Transactions</p>
                    <p className="font-semibold">{report.totalTransactions}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="gap-2" onClick={handleDownload}>
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={handleEdit}>
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Deletion handled by actions.handleDelete wrapper */}
      </div>
    </ModuleLayout>
  );
}
