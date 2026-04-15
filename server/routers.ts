import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { salesReportsRouter } from "./routers/salesReports";
import { TRPCError } from "@trpc/server";
import { usersRouter } from "./routers/users";
import { clientsRouter } from "./routers/clients";
import { contactsRouter } from "./routers/contacts";
import { searchRouter } from "./routers/search";
import { invoicesRouter } from "./routers/invoices";
import { projectsRouter } from "./routers/projects";
import { paymentsRouter } from "./routers/payments";
import { stripeRouter } from "./routers/stripe";
import { mpesaRouter } from "./routers/mpesa";
import { emailQueueRouter } from "./routers/emailQueue";
import { smsRouter as smsQueueRouter } from "./routers/smsRouter";
import { schedulerRouter as jobSchedulerRouter } from "./routers/schedulerRouter";
import { estimatesRouter } from "./routers/estimates";
import { productsRouter } from "./routers/products";
import { receiptsRouter } from "./routers/receipts";
import { servicesRouter } from "./routers/services";
import { expensesRouter } from "./routers/expenses";
import { opportunitiesRouter } from "./routers/opportunities";
import { employeesRouter } from "./routers/employees";
import { jobGroupsRouter } from "./routers/jobGroups";
import { departmentsRouter } from "./routers/departments";
import { attendanceRouter } from "./routers/attendance";
import { payrollRouter } from "./routers/payroll";
import { leaveRouter } from "./routers/leave";
import { settingsRouter } from "./routers/settings";
import { rolesRouter } from "./routers/roles";
import { dashboardRouter } from "./routers/dashboard";
import { clientScoringRouter } from "./routers/clientScoring";
import { authRouter } from "./routers/auth";
import { chartOfAccountsRouter } from "./routers/chartOfAccounts";
import { emailRouter } from "./routers/email";
import { reportsRouter } from "./routers/reports";
import { dataExportRouter } from "./routers/dataExport";
import { importExportRouter } from "./routers/importExport";
import { csvImportExportRouter } from "./routers/csvImportExport";
import { lineItemsRouter } from "./routers/lineItems";
import { approvalsRouter } from "./routers/approvals";
import { savedFiltersRouter } from "./routers/savedFilters";
import { documentManagementRouter } from "./routers/documentManagement";
import { analyticsRouter } from "./routers/analytics";
import { aiRouter } from "./routers/ai";
import { reportExportRouter } from "./routers/reportExport";
import { notificationsRouter } from "./routers/notifications";
import { recurringInvoicesRouter } from "./routers/recurringInvoices";
import { paymentPlansRouter } from "./routers/paymentPlans";
import { projectMilestonesRouter } from "./routers/projectMilestones";
import { timeEntriesRouter } from "./routers/timeEntries";
import { remindersRouter } from "./routers/reminders";
import { favoritesRouter } from "./routers/favorites";
import { salesPipelineRouter } from "./routers/salesPipeline";
import { workflowsRouter } from "./routers/workflows";
import { enhancedPermissionsRouter } from "./routers/enhancedPermissions";
import { permissionsRouter } from "./routers/permissions";
import { enhancedDashboardRouter } from "./routers/enhancedDashboard";
import { serviceTemplatesRouter } from "./routers/serviceTemplates";
import { budgetRouter } from "./routers/budget";
import { budgetsRouter } from "./routers/budgets";
import { hrAnalyticsRouter } from "./routers/hrAnalytics";
import { payrollExportRouter } from "./routers/payrollExport";
import { taxComplianceRouter } from "./routers/taxCompliance";
import { lpoRouter } from "./routers/lpo";
import { procurementRouter } from "./routers/procurement";
import { ticketsRouter } from "./routers/tickets";
import { imprestRouter } from "./routers/imprest";
import { imprestSurrenderRouter } from "./routers/imprestSurrender";
import { financialReportsRouter } from "./routers/financialReports";
import { financeRouter } from "./routers/finance";
import { performanceReviewsRouter } from "./routers/performanceReviews";
import { importValidationRouter } from "./routers/importValidation";
import { healthRouter } from "./routers/health";
import { websiteContactRouter } from "./routers/websiteContact";
import { communicationsRouter } from "./routers/communications";
import { enhancedPaymentsRouter } from "./routers/enhancedPayments";
import { professionalBudgetingRouter } from "./routers/professionalBudgeting";
import { procurementRouter as procurementManagementRouter } from "./routers/procurementManagement";
import { inventoryRouter } from "./routers/inventory";
import { staffChatRouter } from "./routers/staffChat";
import { cannedResponsesRouter } from "./routers/cannedResponses";
import { knowledgeBaseRouter } from "./routers/knowledgeBase";
import { warehousesRouter } from "./routers/warehouses";
import { suppliersRouter } from "./routers/suppliers";
import { maintenanceRouter } from "./routers/maintenance";
import { bankReconciliationRouter } from "./routers/bankReconciliation";
import { automationJobsRouter } from "./routers/automationJobs";
import { brandCustomizationRouter } from "./routers/brandCustomization";
import { themeCustomizationRouter } from "./routers/themeCustomization";
import { customHomepageRouter } from "./routers/customHomepage";
import { quotationsRouter } from "./routers/quotations";
import { quotesRouter } from "./routers/quotes";
import { deliveryNotesRouter } from "./routers/delivery-notes";
import { grnRouter } from "./routers/grn";
import { assetsRouter } from "./routers/assets";
import { warrantyRouter } from "./routers/warranty";
import { contractsRouter } from "./routers/contracts";
import { notesRouter } from "./routers/notes";
import { projectManagementRouter } from "./routers/projectManagement";
import { advancedReportingRouter } from "./routers/advancedReporting";
import { automationRulesRouter } from "./routers/automationRulesEngine";
import { multiTenancyRouter } from "./routers/multiTenancy";
import { creditNotesRouter } from "./routers/creditNotes";
import { debitNotesRouter } from "./routers/debitNotes";
import { workOrdersRouter } from "./routers/workOrders";
import { serviceInvoicesRouter } from "./routers/serviceInvoices";
import { reportBuilderRouter } from "./routers/reportBuilder";
import { kpiTrackingRouter } from "./routers/kpiTracking";
import { forecastingRouter } from "./routers/forecasting";
import { activityTrailRouter } from "./routers/activityTrail";
import { systemHealthRouter } from "./routers/systemHealth";
import { advancedAutomationRouter } from "./routers/advancedAutomation";
import { advancedExportRouter } from "./routers/advancedExport";
import { advancedSecurityRouter } from "./routers/advancedSecurity";
import { aiAgentsRouter } from "./routers/aiAgents";
import { aiInsightsRouter } from "./routers/aiInsights";
import { aimlRouter } from "./routers/aiml";
import { analyticsEngineRouter } from "./routers/analyticsEngine";
import { apiMonetizationRouter } from "./routers/apiMonetization";
import { businessIntelligenceRouter } from "./routers/businessIntelligence";
import { cloudInfrastructureRouter } from "./routers/cloudInfrastructure";
import { cohortAnalyticsRouter } from "./routers/cohortAnalytics";
import { dashboardBuilderRouter } from "./routers/dashboardBuilder";
import { developerToolsRouter } from "./routers/developerTools";
import { emailCalendarRouter } from "./routers/emailCalendar";
import { enterpriseSecurityRouter } from "./routers/enterpriseSecurity";
import { executiveDashboardRouter } from "./routers/executiveDashboard";
import { executiveSuiteRouter } from "./routers/executiveSuite";
import { fileStorageRouter } from "./routers/fileStorage";
import { globalFeaturesRouter } from "./routers/globalFeatures";
import { mobileAppRouter } from "./routers/mobileApp";
import { mobileAppsRouter } from "./routers/mobileApps";
import { mobileResponsiveRouter } from "./routers/mobileResponsive";
import { nativeMobileAppsRouter } from "./routers/nativeMobileApps";
import { partnerChannelRouter } from "./routers/partnerChannel";
import { performanceOptimizationRouter } from "./routers/performanceOptimization";
import { performanceScalingRouter } from "./routers/performanceScaling";
import { realtimeCollaborationRouter } from "./routers/realtimeCollaboration";
import { securityComplianceRouter } from "./routers/securityCompliance";
import { sysAdminRouter } from "./routers/sysAdmin";
import { integrationRouter } from "./routers/thirdPartyIntegration";
import { uiuxExcellenceRouter } from "./routers/uiuxExcellence";
import { advancedAnalyticsRouter } from "./routers/advancedAnalytics";
import { auditTrailRouter } from "./routers/auditTrail";
import { businessRulesRouter } from "./routers/businessRules";
import { tablePreferencesRouter } from "./routers/tablePreferences";
import { advancedReportsRouter } from "./routers/advancedReports";
import { paymentReconciliationRouter } from "./routers/paymentReconciliation";
import { billingRouter } from "./routers/billing";
import { bulkOperationsRouter } from "./routers/bulkOperations";
import { organizationUsersRouter } from "./routers/organizationUsers";
import { enterpriseTenantsRouter } from "./routers/enterpriseTenants";
import { emailTemplatesRouter } from "./routers/emailTemplates";
import { cronJobsRouter } from "./routers/cronJobs";
import { proposalTemplatesRouter } from "./routers/proposalTemplates";
import { contractTemplatesRouter } from "./routers/contractTemplates";
import { documentTemplatesRouter } from "./routers/documentTemplates";
import { tenantCommunicationsRouter } from "./routers/tenantCommunications";
import { websiteAdminRouter } from "./routers/websiteAdmin";
import { onboardingRouter } from "./routers/onboarding";
import { holidaysRouter } from "./routers/holidays";
import { payslipRouter } from "./routers/payslips";
import { trainingRouter } from "./routers/training";
import { employeeContractsRouter } from "./routers/employeeContracts";
import { leaveBalancesRouter } from "./routers/leaveBalances";
import { disciplinaryRouter } from "./routers/disciplinary";
import { recruitmentRouter } from "./routers/recruitment";
import { hrAutomationRouter } from "./routers/hrAutomation";
import { ictManagementRouter } from "./routers/ictManagement";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin' && ctx.user.role !== 'staff') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  health: healthRouter,
  websiteContact: websiteContactRouter,
  system: systemRouter,
  users: usersRouter,
  clients: clientsRouter,
  contacts: contactsRouter,
  search: searchRouter,
  invoices: invoicesRouter,
  projects: projectsRouter,
  payments: paymentsRouter,
  stripe: stripeRouter,
  mpesa: mpesaRouter,
  emailQueue: emailQueueRouter,
  smsQueue: smsQueueRouter,
  jobScheduler: jobSchedulerRouter,
  estimates: estimatesRouter,
  products: productsRouter,
  receipts: receiptsRouter,
  services: servicesRouter,
  expenses: expensesRouter,
  opportunities: opportunitiesRouter,
  employees: employeesRouter,
  jobGroups: jobGroupsRouter,
  departments: departmentsRouter,
  attendance: attendanceRouter,
  payroll: payrollRouter,
  leave: leaveRouter,
  settings: settingsRouter,
  dashboard: dashboardRouter,
  clientScoring: clientScoringRouter,
  analytics: analyticsRouter,
  chartOfAccounts: chartOfAccountsRouter,
  email: emailRouter,
  reports: reportsRouter,
  reportExport: reportExportRouter,
  dataExport: dataExportRouter,
  documentManagement: documentManagementRouter,
  importExport: importExportRouter,
  csvImportExport: csvImportExportRouter,
  lineItems: lineItemsRouter,
  approvals: approvalsRouter,
  savedFilters: savedFiltersRouter,
  ai: aiRouter,
  // Aliases for legacy client callsites — keep mounted so existing client code works
  documents: documentManagementRouter,
  // Expose select settings-related procedures under legacy names used client-side
  roles: rolesRouter,
  permissions: permissionsRouter,
  enhancedPermissions: enhancedPermissionsRouter,
  enhancedDashboard: enhancedDashboardRouter,
  bankReconciliation: bankReconciliationRouter,

  // Use the complete authRouter with login, register, logout, etc.
  auth: authRouter,

  // ============= NOTIFICATIONS =============
  notifications: notificationsRouter,

  // ============= RECURRING INVOICES =============
  recurringInvoices: recurringInvoicesRouter,

  // ============= PAYMENT PLANS =============
  paymentPlans: paymentPlansRouter,
  // ============= CLIENT TICKETS =============
  tickets: ticketsRouter,

  // ============= PROJECT MILESTONES =============
  projectMilestones: projectMilestonesRouter,
  projectManagement: projectManagementRouter,

  // ============= TIME ENTRIES =============
  timeEntries: timeEntriesRouter,
  reminders: remindersRouter,
  favorites: favoritesRouter,

  // ============= SALES PIPELINE =============
  salesPipeline: salesPipelineRouter,

  // ============= WORKFLOW AUTOMATION =============
  workflows: workflowsRouter,
  automationRules: automationRulesRouter,

  // ============= SERVICE TEMPLATES & USAGE TRACKING =============
  serviceTemplates: serviceTemplatesRouter,

  // ============= BUDGET MANAGEMENT =============
  budget: budgetRouter,
  budgets: budgetsRouter,

  // ============= HR ANALYTICS =============
  hrAnalytics: hrAnalyticsRouter,

    // ============= PAYROLL EXPORT =============
    payrollExport: payrollExportRouter,

    // ============= TAX COMPLIANCE REPORTS =============
  taxCompliance: taxComplianceRouter,

  // ============= LOCAL PURCHASE ORDERS =============
  lpo: lpoRouter,

  // ============= PROCUREMENT MANAGEMENT (Full CRUD) =============
  procurementMgmt: procurementManagementRouter,

  // ============= SUPPLIERS MANAGEMENT =============
  suppliers: suppliersRouter,

  // ============= PROCUREMENT REQUESTS =============
  procurement: procurementRouter,

  // ============= IMPRESTS =============
  imprest: imprestRouter,
  imprestSurrender: imprestSurrenderRouter,

  // ============= INVENTORY MANAGEMENT =============
  inventory: inventoryRouter,

  // ============= FINANCE UTILITIES =============
  finance: financeRouter,

  // ============= FINANCIAL REPORTS =============
  financialReports: financialReportsRouter,

  // ============= PERFORMANCE REVIEWS =============
  performanceReviews: performanceReviewsRouter,

  // ============= SALES REPORTS & ANALYTICS =============
  salesReports: salesReportsRouter,
  advancedReporting: advancedReportingRouter,

  // ============= COMMUNICATIONS =============
  communications: communicationsRouter,

  // ============= STAFF CHAT =============
  staffChat: staffChatRouter,

  // ============= CANNED RESPONSES =============
  cannedResponses: cannedResponsesRouter,

  // ============= KNOWLEDGE BASE =============
  knowledgeBase: knowledgeBaseRouter,

  // ============= WAREHOUSES & STOCK =============
  warehouses: warehousesRouter,

  // ============= ENHANCED PAYMENTS WITH COA =============
  enhancedPayments: enhancedPaymentsRouter,

  // ============= PROFESSIONAL BUDGETING =============
  professionalBudgeting: professionalBudgetingRouter,

  // ============= MAINTENANCE & UTILITIES =============
  maintenance: maintenanceRouter,

  // ============= AUTOMATION JOBS =============
  automationJobs: automationJobsRouter,

  // ============= BRAND CUSTOMIZATION =============
  brandCustomization: brandCustomizationRouter,

  // ============= THEME CUSTOMIZATION =============
  themeCustomization: themeCustomizationRouter,

  // ============= CUSTOM HOMEPAGE =============
  customHomepage: customHomepageRouter,

  // ============= PROCUREMENT - QUOTATIONS =============
  quotations: quotationsRouter,

  // ============= QUOTES =============
  quotes: quotesRouter,

  // ============= PROCUREMENT - DELIVERY NOTES =============
  deliveryNotes: deliveryNotesRouter,

  // ============= PROCUREMENT - GOODS RECEIVED NOTES =============
  grn: grnRouter,

  // ============= ASSET MANAGEMENT =============
  assets: assetsRouter,

  // ============= WARRANTY MANAGEMENT =============
  warranty: warrantyRouter,

  // ============= CONTRACT MANAGEMENT =============
  contracts: contractsRouter,
  notes: notesRouter,

  // ============= MULTI-TENANCY / ENTERPRISE =============
  multiTenancy: multiTenancyRouter,
  organizationUsers: organizationUsersRouter,
  enterpriseTenants: enterpriseTenantsRouter,

  // ============= CREDIT & DEBIT NOTES =============
  creditNotes: creditNotesRouter,
  debitNotes: debitNotesRouter,

  // ============= WORK ORDERS =============
  workOrders: workOrdersRouter,

  // ============= SERVICE INVOICES =============
  serviceInvoices: serviceInvoicesRouter,

  // ============= REPORT BUILDER =============
  reportBuilder: reportBuilderRouter,

  // ============= KPI TRACKING =============
  kpiTracking: kpiTrackingRouter,

  // ============= FORECASTING =============
  forecasting: forecastingRouter,

  // ============= ACTIVITY TRAIL =============
  activityTrail: activityTrailRouter,

  // ============= SYSTEM HEALTH =============
  systemHealth: systemHealthRouter,

  // ============= ENTERPRISE / ADVANCED FEATURES =============
  advancedAutomation: advancedAutomationRouter,
  advancedExport: advancedExportRouter,
  advancedSecurity: advancedSecurityRouter,
  aiAgents: aiAgentsRouter,
  aiInsights: aiInsightsRouter,
  aiml: aimlRouter,
  analyticsEngine: analyticsEngineRouter,
  apiMonetization: apiMonetizationRouter,
  businessIntelligence: businessIntelligenceRouter,
  cloudInfrastructure: cloudInfrastructureRouter,
  cohortAnalytics: cohortAnalyticsRouter,
  dashboardBuilder: dashboardBuilderRouter,
  developerTools: developerToolsRouter,
  emailCalendar: emailCalendarRouter,
  enterpriseSecurity: enterpriseSecurityRouter,
  executiveDashboard: executiveDashboardRouter,
  executiveSuite: executiveSuiteRouter,
  fileStorage: fileStorageRouter,
  globalFeatures: globalFeaturesRouter,
  mobileApp: mobileAppRouter,
  mobileApps: mobileAppsRouter,
  mobileResponsive: mobileResponsiveRouter,
  nativeMobileApps: nativeMobileAppsRouter,
  partnerChannel: partnerChannelRouter,
  performanceOptimization: performanceOptimizationRouter,
  performanceScaling: performanceScalingRouter,
  realtimeCollaboration: realtimeCollaborationRouter,
  securityCompliance: securityComplianceRouter,
  sysAdmin: sysAdminRouter,
  thirdPartyIntegrations: integrationRouter,
  uiuxExcellence: uiuxExcellenceRouter,
  advancedAnalytics: advancedAnalyticsRouter,
  auditTrail: auditTrailRouter,
  businessRules: businessRulesRouter,
  tablePreferences: tablePreferencesRouter,
  importValidation: importValidationRouter,

  // ============= ADVANCED REPORTS (Quote metrics, conversion, forecasting) =============
  advancedReports: advancedReportsRouter,

  // ============= PAYMENT RECONCILIATION =============
  paymentReconciliation: paymentReconciliationRouter,

  // ============= BILLING & SUBSCRIPTIONS =============
  billing: billingRouter,

  // ============= BULK OPERATIONS =============
  bulkOperations: bulkOperationsRouter,

  // ============= EMAIL TEMPLATES =============
  emailTemplates: emailTemplatesRouter,

  // ============= CRON JOBS =============
  cronJobs: cronJobsRouter,

  // ============= PROPOSAL TEMPLATES =============
  proposalTemplates: proposalTemplatesRouter,

  // ============= CONTRACT TEMPLATES =============
  contractTemplates: contractTemplatesRouter,

  // ============= DOCUMENT TEMPLATES (General) =============
  documentTemplates: documentTemplatesRouter,

  // ============= TENANT COMMUNICATIONS =============
  tenantCommunications: tenantCommunicationsRouter,

  // ============= WEBSITE ADMIN =============
  websiteAdmin: websiteAdminRouter,

  // ============= HR AUTOMATION =============
  onboarding: onboardingRouter,
  holidays: holidaysRouter,
  payslips: payslipRouter,
  training: trainingRouter,
  employeeContracts: employeeContractsRouter,
  leaveBalances: leaveBalancesRouter,
  disciplinary: disciplinaryRouter,
  recruitment: recruitmentRouter,
  hrAutomation: hrAutomationRouter,

  // ============= ICT MANAGEMENT =============
  ictManagement: ictManagementRouter,
});

export type AppRouter = typeof appRouter;
