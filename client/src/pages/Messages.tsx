import React from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowRight } from "lucide-react";

/**
 * Messages page - Redirects to Staff Chat
 */
export default function Messages() {
  const [, navigate] = useLocation();

  return (
    <ModuleLayout
      title="Messages"
      description="View and manage your messages"
      icon={<MessageSquare className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Messages" },
      ]}
    >
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-blue-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">
            Staff Chat
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Use the Staff Chat for real-time team communication.
          </p>
          <Button onClick={() => navigate("/staff-chat")} className="gap-2">
            Open Staff Chat <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </ModuleLayout>
  );
}
