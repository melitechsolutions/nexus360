import React from "react";
import { useParams, useLocation } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Construction, ArrowLeft, Settings } from "lucide-react";

const MODULE_LABELS: Record<string, string> = {
  accounting: "Accounting",
  budgets: "Budgets",
  projects: "Projects",
  leave: "Leave Management",
  attendance: "Attendance",
  procurement: "Procurement",
  contracts: "Contracts",
  "work-orders": "Work Orders",
  communications: "Communications",
  tickets: "Support Tickets",
  ai: "AI Hub",
};

export default function OrgModulePage() {
  const params = useParams();
  const slug = params.slug as string;
  const module = params.module as string;
  const [, setLocation] = useLocation();

  const label = MODULE_LABELS[module] ?? module?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Module";

  return (
    <OrgLayout title={label} showOrgInfo={false}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[{ label }]} />
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => setLocation(`/org/${slug}/dashboard`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Button>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-16 text-center">
            <Construction className="h-14 w-14 text-white/20 mx-auto mb-4" />
            <CardTitle className="text-xl text-white mb-2">{label}</CardTitle>
            <CardDescription className="text-white/50 mb-6 max-w-md mx-auto">
              This module is available in your plan. Full functionality for <strong>{label}</strong> is available in the main CRM experience. Use the shortcut below to open it now.
            </CardDescription>
            <div className="flex justify-center gap-3">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setLocation(`/crm`)}
              >
                Go to Main CRM
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setLocation(`/org/${slug}/dashboard`)}
              >
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </OrgLayout>
  );
}
