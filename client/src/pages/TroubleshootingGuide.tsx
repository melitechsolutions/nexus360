import React, { useState } from "react";
import { WebsiteNav } from "@/pages/website/WebsiteNav";
import { WebsiteFooter } from "@/pages/website/WebsiteFooter";
import { AlertCircle, CheckCircle, Search, ChevronDown, Phone, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface TroubleshootingItem {
  id: string;
  category: string;
  title: string;
  problem: string;
  solution: string;
  steps: string[];
  relatedTopics?: string[];
}

const troubleshootingGuides: TroubleshootingItem[] = [
  {
    id: "login-issues",
    category: "Authentication",
    title: "Cannot Login",
    problem: "You are unable to log in with your email and password",
    solution:
      "Reset your password or verify your account credentials. Check that your email is correct and that Caps Lock is not accidentally enabled.",
    steps: [
      "Visit the login page",
      "Click 'Forgot Password?' link",
      "Enter your registered email address",
      "Check your email for reset token",
      "Click the reset link and create a new password",
      "Log in with your new password",
    ],
    relatedTopics: ["Two-Factor Authentication", "Account Security"],
  },
  {
    id: "password-reset",
    category: "Account",
    title: "Password Reset Not Working",
    problem: "Password reset email not received or reset link expired",
    solution: "Ensure you're using the correct email and check spam folder. Reset links expire after 24 hours.",
    steps: [
      "Check your spam/junk folder for the reset email",
      "Verify the email address is correct",
      "Wait 1-2 minutes for email delivery",
      "If not received, request a new reset link",
      "Use the reset link within 24 hours",
      "If still failing, contact your system administrator",
    ],
    relatedTopics: ["Login Issues"],
  },
  {
    id: "invoice-not-saving",
    category: "Invoicing",
    title: "Invoice Won't Save",
    problem: "Error message when trying to save an invoice",
    solution: "Check that all required fields are filled and data is valid. Common issues: missing client, negative amounts, or invalid dates.",
    steps: [
      "Verify all required fields are filled (marked with *)",
      "Check invoice date is not in the future",
      "Ensure amounts are positive numbers",
      "Select a valid client from the dropdown",
      "Check that line items have valid quantities",
      "Save again or contact support if error persists",
    ],
    relatedTopics: ["Invoice Management", "Data Entry"],
  },
  {
    id: "payment-processing",
    category: "Payments",
    title: "Payment Processing Errors",
    problem: "Payment transaction fails or gets stuck in pending",
    solution:
      "Verify payment method details and account balance. Check internet connection and try again after 5 minutes.",
    steps: [
      "Verify payment method is active and has sufficient funds",
      "Check your internet connection",
      "Clear browser cache and refresh page",
      "Try payment again",
      "If still failing, change payment method and retry",
      "Contact support if issue persists",
    ],
    relatedTopics: ["Payments", "Financial Reports"],
  },
  {
    id: "report-not-loading",
    category: "Reports",
    title: "Reports Taking Too Long or Not Loading",
    problem: "Financial reports are loading slowly or timing out",
    solution: "Reduce the date range or number of filters. Large date ranges can slow down report generation.",
    steps: [
      "Try reducing the date range (e.g., last 3 months instead of last year)",
      "Remove unnecessary filters",
      "Clear browser cache",
      "Try in a different browser",
      "Contact support if issue persists",
    ],
    relatedTopics: ["Financial Reports", "Performance"],
  },
  {
    id: "attendance-tracking",
    category: "HR",
    title: "Employee Attendance Not Recording",
    problem: "Attendance marks are not showing or being saved",
    solution: "Ensure employee records exist and correct date/month is selected. Check user permissions.",
    steps: [
      "Verify employee exists in the system",
      "Check you're on the correct month/year",
      "Verify you have permission to mark attendance",
      "Refresh the page and try again",
      "For mobile clock-in, ensure location services are enabled",
      "Contact HR admin if persistent",
    ],
    relatedTopics: ["Employee Management", "Permissions"],
  },
  {
    id: "payroll-calculation",
    category: "HR",
    title: "Incorrect Payroll Calculation",
    problem: "Salary calculations seem incorrect or don't match expected amount",
    solution:
      "Verify all deductions, allowances, and tax settings. Check employee salary structure configuration.",
    steps: [
      "Review employee salary structure in HR settings",
      "Check for active deductions or allowances",
      "Verify tax settings match government requirements",
      "Review leave taken in the payroll period",
      "Recalculate payroll with correct parameters",
      "If still incorrect, create a support ticket with details",
    ],
    relatedTopics: ["Payroll Management", "Employee Records"],
  },
  {
    id: "lpo-approval",
    category: "Procurement",
    title: "LPO Stuck in Approval Workflow",
    problem: "Local Purchase Order (LPO) is stuck waiting for approval",
    solution: "Check approval chain configuration and approver availability. Escalate if approver is unavailable.",
    steps: [
      "Identify who the next approver is",
      "Verify they have access to the system",
      "Send them a reminder about pending approval",
      "Check approval workflow rules in settings",
      "If approver unavailable, escalate to manager",
      "Admin can override approval if necessary",
    ],
    relatedTopics: ["Procurement", "Approvals", "Workflows"],
  },
  {
    id: "inventory-mismatch",
    category: "Procurement",
    title: "Inventory Stock Levels Incorrect",
    problem: "Inventory counts don't match actual stock or system records",
    solution: "Run physical count and reconcile. Check for unrecorded transactions or transfers.",
    steps: [
      "Perform physical inventory count",
      "Compare with system count",
      "Check for pending transactions",
      "Review recent receipts and issues",
      "Investigate discrepancies",
      "Adjust inventory with approved variance note",
    ],
    relatedTopics: ["Inventory Management", "Procurement", "Reconciliation"],
  },
  {
    id: "permission-denied",
    category: "Access Control",
    title: "Permission Denied Error",
    problem: "Getting 'Permission Denied' when accessing a feature",
    solution: "Your user role doesn't have access to this feature. Contact your administrator.",
    steps: [
      "Note which feature is restricted",
      "Contact your HR or System Administrator",
      "Request access if needed",
      "Admin can review and grant role-based permissions",
      "Log out and back in after permissions change",
      "Clear cache if access doesn't update",
    ],
    relatedTopics: ["Roles & Permissions", "Account Security"],
  },
  {
    id: "2fa-setup",
    category: "Security",
    title: "Two-Factor Authentication Issues",
    problem: "Cannot set up or use 2FA, or losing access to 2FA device",
    solution: "Use backup codes or contact admin to disable 2FA. Download backup codes after enabling 2FA.",
    steps: [
      "Check 2FA device time is synchronized",
      "Use backup codes if available",
      "Contact admin with proof of identity",
      "Admin can disable 2FA temporarily",
      "Re-enable 2FA with new device",
      "Save backup codes in secure location",
    ],
    relatedTopics: ["Account Security", "Password Reset"],
  },
  {
    id: "bulk-import-failure",
    category: "Data Management",
    title: "Bulk Import/Upload Fails",
    problem: "Error when importing CSV or bulk uploading data",
    solution: "Check file format matches requirements. Validate data doesn't have duplicates or missing required fields.",
    steps: [
      "Download the template file",
      "Ensure all required columns are present",
      "Check data doesn't have duplicates",
      "Verify phone/email formats are valid",
      "Ensure file is not encrypted",
      "Try uploading smaller batches if file is large",
    ],
    relatedTopics: ["Data Entry", "Bulk Actions"],
  },
  {
    id: "email-notifications",
    category: "System",
    title: "Not Receiving Email Notifications",
    problem: "Email alerts or notifications are not being sent",
    solution: "Check notification settings, email configuration, and spam folder.",
    steps: [
      "Verify email address in account settings is correct",
      "Check notification preferences are enabled",
      "Review spam/junk folder",
      "Verify email forwarding rules",
      "Check server email settings with admin",
      "Test with a simple action like commenting",
    ],
    relatedTopics: ["Notifications", "Email Settings"],
  },
  {
    id: "slow-performance",
    category: "Performance",
    title: "System Running Slow",
    problem: "Application is loading slowly or is unresponsive",
    solution: "Clear browser cache, close unused tabs, and check internet connection.",
    steps: [
      "Check your internet connection speed",
      "Close other browser tabs and applications",
      "Clear browser cache and cookies",
      "Try in incognito/private mode",
      "Update your browser to latest version",
      "If all else fails, contact support with details",
    ],
    relatedTopics: ["Performance"],
  },
];

export default function TroubleshootingGuide() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = Array.from(new Set(troubleshootingGuides.map((g) => g.category)));

  const filteredGuides = troubleshootingGuides.filter((guide) => {
    const matchesSearch =
      guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guide.problem.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guide.solution.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !selectedCategory || guide.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <WebsiteNav />

      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/80 via-white to-white" />
        <div className="absolute top-20 left-1/3 w-96 h-96 rounded-full bg-orange-100/40 blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-200 bg-orange-50 text-sm font-medium text-orange-600 mb-6">
            <AlertCircle className="w-3.5 h-3.5" />
            Support Center
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              Troubleshooting
            </span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Find solutions to common issues and learn best practices
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
      <div className="space-y-6">
        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle>Search Issues</CardTitle>
            <CardDescription>Find solutions by keyword or browse by category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search for issues... (e.g., 'login', 'payment', 'invoice')"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All Categories
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              Found {filteredGuides.length} solution{filteredGuides.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {/* Solutions Accordion */}
        <Card>
          <CardHeader>
            <CardTitle>Common Issues & Solutions</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredGuides.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {filteredGuides.map((guide) => (
                  <AccordionItem key={guide.id} value={guide.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-start gap-3 text-left">
                        <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{guide.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{guide.problem}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-6">
                      <div className="space-y-6">
                        {/* Solution Overview */}
                        <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                            Solution
                          </h4>
                          <p className="text-sm text-blue-800 dark:text-blue-200">{guide.solution}</p>
                        </div>

                        {/* Steps */}
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Steps</h4>
                          <div className="space-y-3">
                            {guide.steps.map((step, idx) => (
                              <div
                                key={step || `step-${idx}`}
                                className="flex gap-3 pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0"
                              >
                                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-green-600 text-white text-xs font-semibold flex-shrink-0">
                                  {idx + 1}
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 pt-0.5">
                                  {step}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Related Topics */}
                        {guide.relatedTopics && guide.relatedTopics.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                              Related Topics
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {guide.relatedTopics.map((topic) => (
                                <span
                                  key={topic}
                                  className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No solutions found for "{searchTerm}". Try different keywords.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Support Section */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">Still Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-6">
              If you can't find a solution, our support team is here to help.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <Button variant="default" className="w-full" asChild>
                <a href="mailto:support@example.com" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Support
                </a>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <a href="tel:+254712236643" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Call Us
                </a>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <a href="/documentation" className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Full Documentation
                </a>
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
