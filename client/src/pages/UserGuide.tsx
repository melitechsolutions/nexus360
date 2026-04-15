import React, { useState } from "react";
import { WebsiteNav } from "@/pages/website/WebsiteNav";
import { WebsiteFooter } from "@/pages/website/WebsiteFooter";
import { HelpCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Guide {
  id: string;
  title: string;
  category: string;
  steps: string[];
  tips?: string[];
}

const userGuides: Guide[] = [
  {
    id: "create-invoice",
    title: "How to Create an Invoice",
    category: "Accounting",
    steps: [
      "Navigate to Accounting > Invoicing from the main menu",
      "Click the 'New Invoice' button in the top right",
      "Select the client from the dropdown menu",
      "Add line items with descriptions and amounts",
      "Set payment terms and due date",
      "Review the total and click 'Create Invoice'",
      "Send directly to client via email or download as PDF",
    ],
    tips: [
      "Use invoice templates for consistent branding",
      "Set automatic reminders for unpaid invoices",
      "Track payment status in real-time",
    ],
  },
  {
    id: "manage-clients",
    title: "How to Manage Clients",
    category: "Sales",
    steps: [
      "Go to Sales > Clients to view all clients",
      "Click 'Add New Client' for new customers",
      "Fill in contact details and company information",
      "Set up client preferences and billing address",
      "Assign a sales representative if needed",
      "Save and access client history anytime",
    ],
    tips: [
      "Add detailed notes to track client interactions",
      "Use client categories for better organization",
      "Set credit limits for account management",
    ],
  },
  {
    id: "track-employees",
    title: "How to Track Employee Attendance",
    category: "Human Resources",
    steps: [
      "Open HR > Attendance from the menu",
      "Select the month and view attendance calendar",
      "Mark attendance as Present, Absent, or Leave",
      "Add notes for absences or special circumstances",
      "Generate attendance reports for payroll",
      "Export reports for HR records",
    ],
    tips: [
      "Use mobile app for clock-in/clock-out",
      "Set automatic reminders for missing attendance",
      "Generate monthly reports automatically",
    ],
  },
  {
    id: "approve-requests",
    title: "How to Approve Requests",
    category: "Workflow",
    steps: [
      "Check the notification bell for pending approvals",
      "Click on the approval to view details",
      "Review the request information thoroughly",
      "Add comments if requesting changes",
      "Click 'Approve' or 'Reject' with reasoning",
      "Track approval history in the document",
    ],
    tips: [
      "Set up approval workflows based on amounts",
      "Delegate approvals when you're unavailable",
      "Review pending approvals regularly",
    ],
  },
  {
    id: "generate-reports",
    title: "How to Generate Financial Reports",
    category: "Accounting",
    steps: [
      "Navigate to Accounting > Reports",
      "Select the report type (Profit & Loss, Balance Sheet, etc.)",
      "Choose the date range for the report",
      "Apply any filters (department, account, etc.)",
      "Click 'Generate Report'",
      "Download as PDF or Excel for sharing",
    ],
    tips: [
      "Schedule recurring reports for automatic generation",
      "Compare period-over-period for trend analysis",
      "Export to Excel for further analysis",
    ],
  },
  {
    id: "create-lpo",
    title: "How to Create a Local Purchase Order (LPO)",
    category: "Procurement",
    steps: [
      "Go to Procurement > Purchase Orders",
      "Click 'Create Local PO' from the floating menu",
      "Select the supplier from your list",
      "Add items with quantities and unit prices",
      "Specify delivery location and date",
      "Set approval workflow if required",
      "Submit and track delivery status",
    ],
    tips: [
      "Save supplier templates for faster ordering",
      "Use stock levels to prevent over-ordering",
      "Track delivery against PO automatically",
    ],
  },
  {
    id: "bulk-actions",
    title: "How to Use Bulk Actions",
    category: "General",
    steps: [
      "Open any list view (Invoices, Clients, etc.)",
      "Select multiple items using checkboxes",
      "A bulk action toolbar appears at the top",
      "Choose an action (Export, Archive, Delete, etc.)",
      "Confirm the action and it applies to all selected",
      "View results in the activity feed",
    ],
    tips: [
      "Use filters before bulk actions to target specific items",
      "Archive instead of delete for record keeping",
      "Export regularly for backups",
    ],
  },
];

export default function UserGuide() {
  const categories = Array.from(new Set(userGuides.map((g) => g.category)));

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <WebsiteNav />

      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/80 via-white to-white" />
        <div className="absolute top-20 right-1/4 w-96 h-96 rounded-full bg-violet-100/40 blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-sm font-medium text-indigo-600 mb-6">
            <HelpCircle className="w-3.5 h-3.5" />
            Step-by-Step
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              User Guide
            </span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Step-by-step guides to help you get the most out of the CRM
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
      <div className="space-y-6">
        {/* Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Card key={category} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <p className="font-medium text-gray-900 dark:text-white text-center">
                  {category}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
                  {userGuides.filter((g) => g.category === category).length} guides
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Guides Accordion */}
        <Card>
          <CardHeader>
            <CardTitle>How-To Guides</CardTitle>
            <CardDescription>
              Click on any guide to view step-by-step instructions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {userGuides.map((guide, idx) => (
                <AccordionItem key={guide.id} value={guide.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <HelpCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{guide.title}</p>
                        <p className="text-xs text-gray-500">{guide.category}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="space-y-4">
                      {/* Steps */}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Steps</h4>
                        <div className="space-y-2">
                          {guide.steps.map((step, stepIdx) => (
                            <div
                              key={stepIdx}
                              className="flex gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                            >
                              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-semibold flex-shrink-0">
                                {stepIdx + 1}
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 pt-0.5">
                                {step}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tips */}
                      {guide.tips && guide.tips.length > 0 && (
                        <div className="pt-4 border-t">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                            Tips & Best Practices
                          </h4>
                          <div className="space-y-2">
                            {guide.tips.map((tip, tipIdx) => (
                              <div
                                key={tipIdx}
                                className="flex gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950"
                              >
                                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-gray-700 dark:text-gray-300">{tip}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Support Section */}
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">Need More Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              If you can't find what you're looking for, check our full documentation or reach out
              to our support team.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="default" size="sm" asChild>
                <a href="/documentation" className="inline-flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Full Documentation
                </a>
              </Button>
              <Button variant="outline" size="sm">
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </section>

      <WebsiteFooter />
    </div>
  );
}
