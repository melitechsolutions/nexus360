import React, { Suspense, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import { BrandProvider } from "./contexts/BrandContext";
import { ThemeCustomizationProvider } from "./contexts/ThemeCustomizationContext";
import { CurrencyProvider } from "./pages/website/CurrencyContext";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { canAccessRoute, PUBLIC_ROUTES, getDashboardUrl } from "@/lib/permissions";

// lazily load all page components so the main bundle stays small and the
// dashboard (and other routes) only fetch what they actually need on
// navigation. this dramatically improves initial load time.
const NotFound = React.lazy(() => import("@/pages/NotFound"));
const Home = React.lazy(() => import("./pages/Home"));
const BusinessDashboard = React.lazy(() => import("./pages/Dashboard"));
const Projects = React.lazy(() => import("./pages/Projects"));
const ProjectDetails = React.lazy(() => import("./pages/ProjectDetails"));
const Profile = React.lazy(() => import("./pages/Profile"));
const Security = React.lazy(() => import("./pages/Security"));
const MFA = React.lazy(() => import("./pages/MFA"));
const Dashboard = React.lazy(() => import("./pages/dashboards/Dashboard"));
const DashboardHome = React.lazy(() => import("./pages/dashboards/DashboardHome"));
const Clients = React.lazy(() => import("./pages/Clients"));
const ClientDetails = React.lazy(() => import("./pages/ClientDetails"));
const EditClient = React.lazy(() => import("./pages/EditClient"));
const Contacts = React.lazy(() => import("./pages/Contacts"));
const ContactDetails = React.lazy(() => import("./pages/ContactDetails"));
const Invoices = React.lazy(() => import("./pages/Invoices"));
const InvoiceDetails = React.lazy(() => import("./pages/InvoiceDetails"));
const CreateInvoice = React.lazy(() => import("./pages/CreateInvoice"));
const EditInvoice = React.lazy(() => import("./pages/EditInvoice"));
const RecurringInvoices = React.lazy(() => import("./pages/RecurringInvoices"));
const RecurringExpenses = React.lazy(() => import("./pages/RecurringExpenses"));
const PaymentPlans = React.lazy(() => import("./pages/PaymentPlans"));
const ProjectMilestones = React.lazy(() => import("./pages/ProjectMilestones"));
const TimeTracking = React.lazy(() => import("./pages/TimeTracking"));
const SalesPipeline = React.lazy(() => import("./pages/SalesPipeline"));
const Estimates = React.lazy(() => import("./pages/Estimates"));
const EstimateDetails = React.lazy(() => import("./pages/EstimateDetails"));
const CreateEstimate = React.lazy(() => import("./pages/CreateEstimate"));
const EditEstimate = React.lazy(() => import("./pages/EditEstimate"));
const Receipts = React.lazy(() => import("./pages/Receipts"));
const ReceiptDetails = React.lazy(() => import("./pages/ReceiptDetails"));
const CreateReceipt = React.lazy(() => import("./pages/CreateReceipt"));
const EditReceipt = React.lazy(() => import("./pages/EditReceipt"));
const TicketsPage = React.lazy(() => import("./pages/Tickets"));
const FinanceSettingsPage = React.lazy(() => import("./pages/FinanceSettings"));
const Opportunities = React.lazy(() => import("./pages/Opportunities"));
const Payments = React.lazy(() => import("./pages/Payments"));
const CreatePayment = React.lazy(() => import("./pages/CreatePayment"));
const PaymentReconciliation = React.lazy(() => import("./pages/PaymentReconciliation"));
const CreateProduct = React.lazy(() => import("./pages/CreateProduct"));
const CreateService = React.lazy(() => import("./pages/CreateService"));
const CreateExpense = React.lazy(() => import("./pages/CreateExpense"));
const CreateOpportunity = React.lazy(() => import("./pages/CreateOpportunity"));
const CreateEmployee = React.lazy(() => import("./pages/CreateEmployee"));
const CreateDepartment = React.lazy(() => import("./pages/CreateDepartment"));
const CreateAttendance = React.lazy(() => import("./pages/CreateAttendance"));
const CreatePayroll = React.lazy(() => import("./pages/CreatePayroll"));
const CreateLeaveRequest = React.lazy(() => import("./pages/CreateLeaveRequest"));
const CreateProject = React.lazy(() => import("./pages/CreateProject"));
const EditProject = React.lazy(() => import("./pages/EditProject"));
const EditProduct = React.lazy(() => import("./pages/EditProduct"));
const EditService = React.lazy(() => import("./pages/EditService"));
const EditExpense = React.lazy(() => import("./pages/EditExpense"));
const EditEmployee = React.lazy(() => import("./pages/EditEmployee"));
const EditOpportunity = React.lazy(() => import("./pages/EditOpportunity"));
const EditPayment = React.lazy(() => import("./pages/EditPayment"));
const Products = React.lazy(() => import("./pages/Products"));
const Services = React.lazy(() => import("./pages/Services"));
const HR = React.lazy(() => import("./pages/HR"));
const Employees = React.lazy(() => import("./pages/Employees"));
const EmployeeDetails = React.lazy(() => import("./pages/EmployeeDetails"));
const Attendance = React.lazy(() => import("./pages/Attendance"));
const Payroll = React.lazy(() => import("./pages/Payroll"));
const LeaveManagement = React.lazy(() => import("./pages/LeaveManagement"));
const JobGroups = React.lazy(() => import("./pages/JobGroups"));
const Onboarding = React.lazy(() => import("./pages/Onboarding"));
const Holidays = React.lazy(() => import("./pages/Holidays"));
const Payslips = React.lazy(() => import("./pages/Payslips"));
const Training = React.lazy(() => import("./pages/Training"));
const Reports = React.lazy(() => import("./pages/Reports"));
const Settings = React.lazy(() => import("@/pages/Settings"));
const TestPDFGeneration = React.lazy(() => import("@/pages/TestPDFGeneration"));
const Expenses = React.lazy(() => import("./pages/Expenses"));
const BankReconciliation = React.lazy(() => import("./pages/BankReconciliation"));
const EditBankReconciliation = React.lazy(() => import("./pages/EditBankReconciliation"));
const ChartOfAccounts = React.lazy(() => import("./pages/ChartOfAccounts"));
const Departments = React.lazy(() => import("./pages/Departments"));
const DepartmentDetails = React.lazy(() => import("./pages/DepartmentDetails"));
const PaymentDetails = React.lazy(() => import("./pages/PaymentDetails"));
const ProductDetails = React.lazy(() => import("./pages/ProductDetails"));
const ServiceDetails = React.lazy(() => import("./pages/ServiceDetails"));
const OpportunityDetails = React.lazy(() => import("./pages/OpportunityDetails"));
const Login = React.lazy(() => import("./pages/Login"));
const ChangePassword = React.lazy(() => import("./pages/ChangePassword"));
const EnhancedChangePassword = React.lazy(() => import("./pages/EnhancedChangePassword"));
const BillingDashboard = React.lazy(() => import("./pages/BillingDashboard"));
const EnhancedReceiptManagement = React.lazy(() => import("./pages/EnhancedReceiptManagement"));
const Signup = React.lazy(() => import("./pages/Signup"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const ClientPortal = React.lazy(() => import("./pages/ClientPortal"));
const AttendanceDetails = React.lazy(() => import("@/pages/AttendanceDetails"));
const PayrollDetails = React.lazy(() => import("@/pages/PayrollDetails"));
const LeaveManagementDetails = React.lazy(() => import("@/pages/LeaveManagementDetails"));
const ReportsDetails = React.lazy(() => import("@/pages/ReportsDetails"));
const BankReconciliationDetails = React.lazy(() => import("@/pages/BankReconciliationDetails"));
const ChartOfAccountsDetails = React.lazy(() => import("@/pages/ChartOfAccountsDetails"));
const EditChartOfAccounts = React.lazy(() => import("@/pages/EditChartOfAccounts"));
const ExpensesDetails = React.lazy(() => import("@/pages/ExpensesDetails"));
const HRDetails = React.lazy(() => import("@/pages/HRDetails"));
const Account = React.lazy(() => import("./pages/Account"));
const Sales = React.lazy(() => import("./pages/Sales"));
const Accounting = React.lazy(() => import("./pages/Accounting"));
const CreateUser = React.lazy(() => import("./pages/CreateUser"));
const EditUser = React.lazy(() => import("./pages/EditUser"));
const AdminManagement = React.lazy(() => import("./pages/AdminManagement"));
const AdminEmailTemplates = React.lazy(() => import("./pages/admin/AdminEmailTemplates"));
const AdminCronJobs = React.lazy(() => import("./pages/admin/AdminCronJobs"));
const SystemHealthDashboard = React.lazy(() => import("./pages/admin/SystemHealthDashboard"));
const SystemLogsViewer = React.lazy(() => import("./pages/admin/SystemLogsViewer"));
const SessionManager = React.lazy(() => import("./pages/admin/SessionManager"));
const ProposalTemplates = React.lazy(() => import("./pages/ProposalTemplates"));
const ContractTemplates = React.lazy(() => import("./pages/ContractTemplates"));
const DocumentTemplates = React.lazy(() => import("./pages/DocumentTemplates"));
const TenantCommunications = React.lazy(() => import("./pages/admin/TenantCommunications"));
const CreateClient = React.lazy(() => import("./pages/CreateClient"));
const EditDepartment = React.lazy(() => import("./pages/EditDepartment"));
const EditAttendance = React.lazy(() => import("./pages/EditAttendance"));
const EditPayroll = React.lazy(() => import("./pages/EditPayroll"));
const EditLeave = React.lazy(() => import("./pages/EditLeave"));
const RoleBasedDashboard = React.lazy(() => import("./components/RoleBasedDashboard"));
const SuperAdminDashboard = React.lazy(() => import("./pages/dashboards/SuperAdminDashboard"));
const MultiTenancy = React.lazy(() => import("./pages/MultiTenancy"));
const AdminDashboard = React.lazy(() => import("./pages/dashboards/AdminDashboard"));
const HRDashboard = React.lazy(() => import("./pages/dashboards/HRDashboard"));
const AccountantDashboard = React.lazy(() => import("./pages/dashboards/AccountantDashboard"));
const StaffDashboard = React.lazy(() => import("./pages/dashboards/StaffDashboard"));
const ProjectManagerDashboard = React.lazy(() => import("./pages/dashboards/ProjectManagerDashboard"));
const ProcurementManagerDashboard = React.lazy(() => import("./pages/dashboards/ProcurementManagerDashboard"));
const SalesManagerDashboard = React.lazy(() => import("./pages/dashboards/SalesManagerDashboard"));
const ICTDashboard = React.lazy(() => import("./pages/dashboards/ICTDashboard"));
const GlobalSettings = React.lazy(() => import("./pages/GlobalSettings"));
const UnifiedLanding = React.lazy(() => import("./pages/UnifiedLanding"));
const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const WebsiteFeatures = React.lazy(() => import("./pages/website/Features"));
const WebsitePricing = React.lazy(() => import("./pages/website/Pricing"));
const WebsiteAbout = React.lazy(() => import("./pages/website/About"));
const WebsiteContact = React.lazy(() => import("./pages/website/Contact"));
const Roles = React.lazy(() => import("./pages/Roles.tsx"));
const AIHub = React.lazy(() => import("./pages/AIHub"));
const FinancialDashboard = React.lazy(() => import("./pages/FinancialDashboard"));
const WorkflowAutomation = React.lazy(() => import("./pages/WorkflowAutomation"));
const Demo = React.lazy(() => import("./pages/Demo"));
const Blog = React.lazy(() => import("./pages/Blog"));
const BecomeAPartner = React.lazy(() => import("./pages/BecomeAPartner"));
const BookADemo = React.lazy(() => import("./pages/BookADemo"));
const HRAutomation = React.lazy(() => import("./pages/HRAutomation"));
const HRPayrollManagement = React.lazy(() => import("./pages/HRPayrollManagement"));
const CreateSalaryStructure = React.lazy(() => import("./pages/CreateSalaryStructure"));
const CreateAllowance = React.lazy(() => import("./pages/CreateAllowance"));
const CreateDeduction = React.lazy(() => import("./pages/CreateDeduction"));
const CreateBenefit = React.lazy(() => import("./pages/CreateBenefit"));
const EditSalaryStructure = React.lazy(() => import("./pages/EditSalaryStructure"));
const EditAllowance = React.lazy(() => import("./pages/EditAllowance"));
const EditDeduction = React.lazy(() => import("./pages/EditDeduction"));
const EditBenefit = React.lazy(() => import("./pages/EditBenefit"));
const CreateContact = React.lazy(() => import("./pages/CreateContact"));
const EditContact = React.lazy(() => import("./pages/EditContact"));
const CreateTicket = React.lazy(() => import("./pages/CreateTicket"));
const EditTicket = React.lazy(() => import("./pages/EditTicket"));
const EditWarranty = React.lazy(() => import("./pages/EditWarranty"));
const KenyanPayrollCalculator = React.lazy(() => import("./pages/KenyanPayrollCalculator"));
const OverduePayments = React.lazy(() => import("./pages/OverduePayments"));
const PaymentReports = React.lazy(() => import("./pages/PaymentReports"));
const TaxComplianceReportsPage = React.lazy(() => import("./pages/TaxComplianceReports"));
const SalesReportsPage = React.lazy(() => import("./pages/SalesReports"));
const FinancialReportsPage = React.lazy(() => import("./pages/FinancialReports"));
const ImprestsPage = React.lazy(() => import("./pages/Imprests"));
const BudgetsPage = React.lazy(() => import("./pages/Budgets"));
const BudgetDetails = React.lazy(() => import("./pages/BudgetDetails"));
const CreateBudget = React.lazy(() => import("./pages/CreateBudget"));
const EditBudget = React.lazy(() => import("./pages/EditBudget"));
const ProfessionalBudgeting = React.lazy(() => import("./components/ProfessionalBudgeting"));
const ProcurementLPOs = React.lazy(() => import("./components/ProcurementLPOs"));
const ProcurementOrders = React.lazy(() => import("./components/ProcurementOrders"));
const ProcurementImprests = React.lazy(() => import("./components/ProcurementImprests"));
const HRAnalyticsPage = React.lazy(() => import("./pages/HRAnalyticsPage"));
const LPOsPage = React.lazy(() => import("./pages/LPOs"));
const CreateLPO = React.lazy(() => import("./pages/CreateLPO"));
const EditLPO = React.lazy(() => import("./pages/EditLPO"));
const LPODetails = React.lazy(() => import("./pages/LPODetails"));
const OrdersPage = React.lazy(() => import("./pages/Orders"));
const CreateOrder = React.lazy(() => import("./pages/CreateOrder"));
const EditOrder = React.lazy(() => import("./pages/EditOrder"));
const ImportExcelPage = React.lazy(() => import("./pages/ImportExcel"));
const BrandCustomization = React.lazy(() => import("./pages/tools/BrandCustomization"));
const CustomHomepageBuilder = React.lazy(() => import("./pages/tools/CustomHomepageBuilder"));
const ThemeCustomization = React.lazy(() => import("./pages/tools/ThemeCustomization"));
const SystemSettings = React.lazy(() => import("./pages/tools/SystemSettings"));
const IntegrationGuides = React.lazy(() => import("./pages/tools/IntegrationGuides"));
const Integrations = React.lazy(() => import("./pages/Integrations"));
const DepartmentPayrollReports = React.lazy(() => import("./pages/DepartmentPayrollReports"));
const CustomReportBuilder = React.lazy(() => import("./pages/CustomReportBuilder"));
const Communications = React.lazy(() => import("./pages/Communications"));
const CreateCommunication = React.lazy(() => import("./pages/CreateCommunication"));
const Messages = React.lazy(() => import("./pages/Messages"));
const ActivityPage = React.lazy(() => import("./pages/Activity"));
const CalendarPage = React.lazy(() => import("./pages/Calendar"));
const Approvals = React.lazy(() => import("./pages/Approvals"));
const Notifications = React.lazy(() => import("./pages/Notifications"));
const AccountSettings = React.lazy(() => import("./pages/AccountSettings"));
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions = React.lazy(() => import("./pages/TermsAndConditions"));
const Documentation = React.lazy(() => import("./pages/Documentation"));
const DocumentManagement = React.lazy(() => import("./pages/DocumentManagement"));
const UserGuide = React.lazy(() => import("./pages/UserGuide"));
const OrganizationUsersManagement = React.lazy(() => import("./pages/OrganizationUsersManagement"));
const EnterpriseTenantsManagement = React.lazy(() => import("./pages/EnterpriseTenantsManagement"));
const TroubleshootingGuide = React.lazy(() => import("./pages/TroubleshootingGuide"));
const CreateImprest = React.lazy(() => import("./pages/CreateImprest"));
const CreatePurchaseOrder = React.lazy(() => import("./pages/CreatePurchaseOrder"));
const Inventory = React.lazy(() => import("./pages/Inventory"));
const Suppliers = React.lazy(() => import("./pages/Suppliers"));
const SupplierDetails = React.lazy(() => import("./pages/SupplierDetails"));
const CreateSupplier = React.lazy(() => import("./pages/CreateSupplier"));
const EditSupplier = React.lazy(() => import("./pages/EditSupplier"));
const ProcurementMaster = React.lazy(() => import("./pages/ProcurementMaster"));
const ExpenseBudgetReport = React.lazy(() => import("./pages/ExpenseBudgetReport"));
const HRAnalyticsDashboard = React.lazy(() => import("./pages/HRAnalyticsDashboard"));
const ProjectsManagement = React.lazy(() => import("./pages/ProjectsManagement"));
const AccountingManagement = React.lazy(() => import("./pages/AccountingManagement"));
const ContractManagement = React.lazy(() => import("./pages/ContractManagement"));
const ContractDetails = React.lazy(() => import("./pages/ContractDetails"));
const AssetManagement = React.lazy(() => import("./pages/AssetManagement"));
const AssetDetails = React.lazy(() => import("./pages/AssetDetails"));
const WarrantyManagement = React.lazy(() => import("./pages/WarrantyManagement"));
const Quotations = React.lazy(() => import("./pages/Quotations"));
const QuotationDetails = React.lazy(() => import("./pages/QuotationDetails"));
const DeliveryNotes = React.lazy(() => import("./pages/DeliveryNotes"));
const DeliveryNoteDetails = React.lazy(() => import("./pages/DeliveryNoteDetails"));
const GRN = React.lazy(() => import("./pages/GRN"));
const GRNDetails = React.lazy(() => import("./pages/GRNDetails"));
const OrderDetails = React.lazy(() => import("./pages/OrderDetails"));
const ImprestDetails = React.lazy(() => import("./pages/ImprestDetails"));
const Proposals = React.lazy(() => import("./pages/Proposals"));
const EditProposal = React.lazy(() => import("./pages/EditProposal"));
const ProposalDetails = React.lazy(() => import("./pages/ProposalDetails"));
const ServiceInvoices = React.lazy(() => import("./pages/ServiceInvoices"));
const CreateServiceInvoice = React.lazy(() => import("./pages/CreateServiceInvoice"));
const EditServiceInvoice = React.lazy(() => import("./pages/EditServiceInvoice"));
const CreditNotes = React.lazy(() => import("./pages/CreditNotes"));
const CreateCreditNote = React.lazy(() => import("./pages/CreateCreditNote"));
const DebitNotes = React.lazy(() => import("./pages/DebitNotes"));
const CreateDebitNote = React.lazy(() => import("./pages/CreateDebitNote"));
const DebitNoteDetails = React.lazy(() => import("./pages/DebitNoteDetails"));
const EditDebitNote = React.lazy(() => import("./pages/EditDebitNote"));
const CreditNoteDetails = React.lazy(() => import("./pages/CreditNoteDetails"));
const EditCreditNote = React.lazy(() => import("./pages/EditCreditNote"));
const CreateWarranty = React.lazy(() => import("./pages/CreateWarranty"));
const WarrantyDetails = React.lazy(() => import("./pages/WarrantyDetails"));
const Quotes = React.lazy(() => import("./pages/Quotes").then(m => ({ default: m.Quotes })));
const QuoteDetails = React.lazy(() => import("./pages/QuoteDetails").then(m => ({ default: m.QuoteDetails })));
const CreateQuote = React.lazy(() => import("./pages/CreateQuote"));
const Forecasting = React.lazy(() => import("./pages/Forecasting"));
const PerformanceReviews = React.lazy(() => import("./pages/PerformanceReviews"));
const EmployeeContracts = React.lazy(() => import("./pages/EmployeeContracts"));
const LeaveBalances = React.lazy(() => import("./pages/LeaveBalances"));
const DisciplinaryRecords = React.lazy(() => import("./pages/DisciplinaryRecords"));
const Recruitment = React.lazy(() => import("./pages/Recruitment"));
const ServiceTemplates = React.lazy(() => import("./pages/ServiceTemplates"));
const CreateServiceTemplate = React.lazy(() => import("./pages/CreateServiceTemplate"));
const ServiceTemplateDetails = React.lazy(() => import("./pages/ServiceTemplateDetails"));
const WorkOrders = React.lazy(() => import("./pages/WorkOrders"));
const CreateWorkOrder = React.lazy(() => import("./pages/CreateWorkOrder"));
const EditWorkOrder = React.lazy(() => import("./pages/EditWorkOrder"));
const ReportBuilder = React.lazy(() => import("./pages/ReportBuilder"));
const KPITracking = React.lazy(() => import("./pages/KPITracking"));
const ActivityTrail = React.lazy(() => import("./pages/ActivityTrail"));
const StaffChat = React.lazy(() => import("./pages/StaffChat"));
const CannedResponses = React.lazy(() => import("./pages/CannedResponses"));
const ProjectAnalytics = React.lazy(() => import("./pages/ProjectAnalytics"));
const SystemHealth = React.lazy(() => import("./pages/SystemHealth"));
const HRAnalytics = React.lazy(() => import("./pages/HRAnalytics"));
const AdvancedAnalytics = React.lazy(() => import("./pages/AdvancedAnalytics"));
const RevenueForecasting = React.lazy(() => import("./pages/RevenueForecasting"));
const ConversionAnalytics = React.lazy(() => import("./pages/ConversionAnalytics"));
const CustomFieldsPage = React.lazy(() => import("./pages/tools/CustomFields"));
const EmailQueue = React.lazy(() => import("./pages/EmailQueue"));
const SmsQueue = React.lazy(() => import("./pages/SmsQueue"));
const GlobalSearch = React.lazy(() => import("./pages/Search"));
const BackupManagement = React.lazy(() => import("./pages/BackupManagement"));
const EnterpriseSettings = React.lazy(() => import("./pages/EnterpriseSettings"));
const ExecutiveDashboard = React.lazy(() => import("./pages/ExecutiveDashboard"));
const NotificationCenter = React.lazy(() => import("./pages/NotificationCenter"));
const BiTools = React.lazy(() => import("./pages/BiTools"));
const ChurnPrediction = React.lazy(() => import("./pages/ChurnPrediction"));
const FunnelAnalysis = React.lazy(() => import("./pages/FunnelAnalysis"));
const CohortAnalysis = React.lazy(() => import("./pages/CohortAnalysis"));
const DashboardBuilderPro = React.lazy(() => import("./pages/DashboardBuilderPro"));
const ClientPerformancePage = React.lazy(() => import("./pages/ClientPerformance"));
const OrgDashboard = React.lazy(() => import("./pages/org/OrgDashboard"));
const OrgSettings = React.lazy(() => import("./pages/org/OrgSettings"));
const OrgStaff = React.lazy(() => import("./pages/org/OrgStaff"));
const OrgBilling = React.lazy(() => import("./pages/org/OrgBilling"));
const OrgCRM = React.lazy(() => import("./pages/org/OrgCRM"));
const OrgClientDetail = React.lazy(() => import("./pages/org/OrgClientDetail"));
const OrgSalesPipeline = React.lazy(() => import("./pages/org/OrgSalesPipeline"));
const OrgInvoices = React.lazy(() => import("./pages/org/OrgInvoices"));
const OrgPayments = React.lazy(() => import("./pages/org/OrgPayments"));
const OrgExpenses = React.lazy(() => import("./pages/org/OrgExpenses"));
const OrgHR = React.lazy(() => import("./pages/org/OrgHR"));
const OrgReports = React.lazy(() => import("./pages/org/OrgReports"));
const OrgCalendar = React.lazy(() => import("./pages/org/OrgCalendar"));
const OrgActivity = React.lazy(() => import("./pages/org/OrgActivity"));
const OrgApprovals = React.lazy(() => import("./pages/org/OrgApprovals"));
const OrgAccounting = React.lazy(() => import("./pages/org/OrgAccounting"));
const OrgBudgets = React.lazy(() => import("./pages/org/OrgBudgets"));
const OrgProjects = React.lazy(() => import("./pages/org/OrgProjects"));
const OrgProjectDetail = React.lazy(() => import("./pages/org/OrgProjectDetail"));
const OrgLeave = React.lazy(() => import("./pages/org/OrgLeave"));
const OrgAttendance = React.lazy(() => import("./pages/org/OrgAttendance"));
const OrgProcurement = React.lazy(() => import("./pages/org/OrgProcurement"));
const OrgContracts = React.lazy(() => import("./pages/org/OrgContracts"));
const OrgWorkOrders = React.lazy(() => import("./pages/org/OrgWorkOrders"));
const OrgCommunications = React.lazy(() => import("./pages/org/OrgCommunications"));
const OrgTickets = React.lazy(() => import("./pages/org/OrgTickets"));
const OrgAI = React.lazy(() => import("./pages/org/OrgAI"));
const OrgModulePage = React.lazy(() => import("./pages/org/OrgModulePage"));
const SuperAdminPricingTiers = React.lazy(() => import("./pages/admin/SuperAdminPricingTiers"));
const MaintenanceAdmin = React.lazy(() => import("./pages/MaintenanceAdmin"));
const WebsiteAdmin = React.lazy(() => import("./pages/admin/WebsiteAdmin"));
const Tasks = React.lazy(() => import("./pages/Tasks"));
const Leads = React.lazy(() => import("./pages/Leads"));
const Subscriptions = React.lazy(() => import("./pages/Subscriptions"));
const KnowledgeBase = React.lazy(() => import("./pages/KnowledgeBase"));
const Warehouses = React.lazy(() => import("./pages/Warehouses"));
const Notes = React.lazy(() => import("./pages/Notes"));
const Timesheets = React.lazy(() => import("./pages/Timesheets"));
const AuditLogs = React.lazy(() => import("./pages/AuditLogs"));

/*
 * Main router with role-based dashboard routing
 * 
 * IMPORTANT: Route ordering matters in wouter!
 * - Static routes (like /create) must come BEFORE dynamic routes (like /:id)
 * - Otherwise, "create" will be treated as an :id parameter
 * 
 * Authentication flow:
 * 1. User logs in at /login
 * 2. Login component stores token and user data in localStorage
 * 3. User is redirected based on role:
 *    - super_admin -> /crm/super-admin
 *    - admin -> /admin/management
 *    - hr -> /crm/hr
 *    - accountant -> /crm/accountant
 *    - staff -> /crm/staff
 *    - client -> /crm/client-portal
 *    - project_manager -> /crm/project-manager
 *    - procurement_manager -> /crm/procurement
 *    - ict_manager-> /crm/ict
 *    - user -> /crm (default)
 */

/**
 * RouteGuard enforces client-side RBAC.
 * Wraps the entire router — checks auth + role access on every navigation.
 */
function RouteGuard({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { user, loading, isAuthenticated } = useAuth();

  const isPublic = PUBLIC_ROUTES.some(
    (r) => location === r || (r !== "/" && location.startsWith(r + "/"))
  );

  useEffect(() => {
    if (loading || isPublic) return;

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // Org isolation: tenant org users must stay within /org/* or public routes
    if (user?.organizationId && !location.startsWith("/org/") && !isPublic) {
      const slug = (user as any).organizationSlug 
        || (() => { try { return JSON.parse(localStorage.getItem("auth-user") || "{}").organizationSlug; } catch { return null; } })();
      if (slug) {
        navigate(`/org/${slug}/dashboard`);
        return;
      }
    }

    if (user && !user.organizationId && !canAccessRoute(user.role, location)) {
      navigate(getDashboardUrl(user.role));
    }
  }, [location, loading, isAuthenticated, user]);

  if (loading && !isPublic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isPublic && !isAuthenticated && !loading) return null;
  if (!isPublic && user?.organizationId && !location.startsWith("/org/")) return null;
  if (!isPublic && user && !user.organizationId && !canAccessRoute(user.role, location)) return null;

  return <>{children}</>;
}

function Router() {
  return (
    <RouteGuard>
    <Switch>
      {/* Auth Routes */}
      <Route path={"/login"} component={Login} />
      <Route path={"/signup"} component={Signup} />
      <Route path={"/forgot-password"} component={ForgotPassword} />
      <Route path={"/reset-password"} component={ResetPassword} />
      
      {/* Portal Routes */}
      <Route path={"/crm/client-portal"} component={ClientPortal} />
      
      {/* Organization (Tenant) Routes - MUST come before general routes */}
      <Route path={"/org/:slug/dashboard"} component={OrgDashboard} />
      <Route path={"/org/:slug/settings"} component={OrgSettings} />
      <Route path={"/org/:slug/staff"} component={OrgStaff} />
      <Route path={"/org/:slug/billing"} component={OrgBilling} />
      <Route path={"/org/:slug/crm"} component={OrgCRM} />
      <Route path={"/org/:slug/clients/:id"} component={OrgClientDetail} />
      <Route path={"/org/:slug/pipeline"} component={OrgSalesPipeline} />
      <Route path={"/org/:slug/invoices"} component={OrgInvoices} />
      <Route path={"/org/:slug/payments"} component={OrgPayments} />
      <Route path={"/org/:slug/expenses"} component={OrgExpenses} />
      <Route path={"/org/:slug/hr"} component={OrgHR} />
      <Route path={"/org/:slug/reports"} component={OrgReports} />
      <Route path={"/org/:slug/calendar"} component={OrgCalendar} />
      <Route path={"/org/:slug/activity"} component={OrgActivity} />
      <Route path={"/org/:slug/approvals"} component={OrgApprovals} />
      <Route path={"/org/:slug/accounting"} component={OrgAccounting} />
      <Route path={"/org/:slug/budgets"} component={OrgBudgets} />
      <Route path={"/org/:slug/projects"} component={OrgProjects} />
      <Route path={"/org/:slug/projects/:id"} component={OrgProjectDetail} />
      <Route path={"/org/:slug/leave"} component={OrgLeave} />
      <Route path={"/org/:slug/attendance"} component={OrgAttendance} />
      <Route path={"/org/:slug/procurement"} component={OrgProcurement} />
      <Route path={"/org/:slug/contracts"} component={OrgContracts} />
      <Route path={"/org/:slug/work-orders"} component={OrgWorkOrders} />
      <Route path={"/org/:slug/communications"} component={OrgCommunications} />
      <Route path={"/org/:slug/communications/new"} component={OrgCommunications} />
      <Route path={"/org/:slug/tickets"} component={OrgTickets} />
      <Route path={"/org/:slug/ai"} component={OrgAI} />
      {/* Catch-all org module route — handles every /org/:slug/:module path */}
      <Route path={"/org/:slug/:module"} component={OrgModulePage} />
      
      {/* Home & Main Dashboard - Smart routing based on auth state */}
      <Route path={"/"} component={LandingPage} />
      <Route path={"/features"} component={WebsiteFeatures} />
      <Route path={"/pricing"} component={WebsitePricing} />
      <Route path={"/about"} component={WebsiteAbout} />
      <Route path={"/contact"} component={WebsiteContact} />
      <Route path={"/home"} component={Home} />
      <Route path={"/demo"} component={Demo} />
      <Route path={"/book-a-demo"} component={BookADemo} />
      <Route path={"/become-a-partner"} component={BecomeAPartner} />
      <Route path={"/blog"} component={Blog} />
      <Route path={"/landing"} component={LandingPage} />
      <Route path={"/dashboard"} component={UnifiedLanding} />
      
      {/* Main Dashboard - Unified for all users with role-aware content */}
      <Route path={"/crm"} component={DashboardHome} />
      <Route path={"/crm-home"} component={BusinessDashboard} />
      <Route path={"/dashboards/dashboardhome"} component={DashboardHome} />
      
      {/* Role-Specific Dashboards (for specialized views) */}
      <Route path={"\u002fcrm\u002fsuper-admin"} component={SuperAdminDashboard} />
      <Route path={"/crm/pricing-tiers"} component={SuperAdminPricingTiers} />
      <Route path={"\u002fcrm\u002fadmin"} component={AdminDashboard} />
      <Route path={"\u002fcrm\u002fhr"} component={HRDashboard} />
      <Route path={"\u002fcrm\u002faccountant"} component={AccountantDashboard} />
      <Route path={"\u002fcrm\u002fproject-manager"} component={ProjectManagerDashboard} />
      <Route path={"\u002fcrm\u002fprocurement"} component={ProcurementManagerDashboard} />
      <Route path={"\u002fcrm\u002fsales"} component={SalesManagerDashboard} />
      <Route path={"\u002fcrm\u002fstaff"} component={StaffDashboard} />
      <Route path={"\u002fcrm\u002fict"} component={ICTDashboard} />
      
      {/* Global Settings - Available to all users */}
      <Route path={"/settings/global"} component={GlobalSettings} />
      <Route path={"/user/settings"} component={GlobalSettings} />
      
      {/* Legacy Dashboard Routes (kept for backward compatibility) */}
      <Route path={"/dashboard-home"} component={DashboardHome} />
      <Route path={"/rbd"} component={RoleBasedDashboard} />
      <Route path={"/account"} component={AccountSettings} />
      <Route path={"/sales"} component={Sales} />
      <Route path={"/accounting"} component={Accounting} />
      <Route path={"/accounting/management"} component={AccountingManagement} />
      
      {/* Admin Routes */}
      <Route path={"/admin/management"} component={AdminManagement} />
      <Route path={"/crm/admin"} component={AdminManagement} />
      
      {/* CRM Home for regular users */}
      <Route path={"/crm/home"} component={DashboardHome} />
      
      {/* User Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/users/new"} component={CreateUser} />
      <Route path={"/users/:id/edit"} component={EditUser} />
      <Route path={"/users/:id"} component={EditUser} />
      
      {/* Project Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/projects"} component={Projects} />
      <Route path={"/projects/management"} component={ProjectsManagement} />
      <Route path={"/projects/create"} component={CreateProject} />
      <Route path={"/projects/:id/edit"} component={EditProject} />
      <Route path={"/projects/:id"} component={ProjectDetails} />
      
      {/* Client Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/clients"} component={Clients} />
      <Route path={"/clients/create"} component={CreateClient} />
      <Route path={"/clients/:id/edit"} component={EditClient} />
      <Route path={"/clients/:id"} component={ClientDetails} />
      
      {/* Contact Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/contacts"} component={Contacts} />
      <Route path={"/contacts/create"} component={CreateContact} />
      <Route path={"/contacts/:id/edit"} component={EditContact} />
      <Route path={"/contacts/:id"} component={ContactDetails} />

      {/* Tasks Route */}
      <Route path={"/tasks"} component={Tasks} />

      {/* Leads Route */}
      <Route path={"/leads"} component={Leads} />

      {/* Subscriptions Route */}
      <Route path={"/subscriptions"} component={Subscriptions} />

      {/* Knowledge Base Route */}
      <Route path={"/knowledge-base"} component={KnowledgeBase} />
      <Route path={"/knowledgebase"} component={KnowledgeBase} />
      
      {/* Warehouses Route */}
      <Route path={"/warehouses"} component={Warehouses} />
      
      {/* Document Template Routes */}
      <Route path={"/invoices/templates"}>{() => <DocumentTemplates type="invoice" />}</Route>
      <Route path={"/estimates/templates"}>{() => <DocumentTemplates type="estimate" />}</Route>
      <Route path={"/quotations/templates"}>{() => <DocumentTemplates type="quotation" />}</Route>
      <Route path={"/receipts/templates"}>{() => <DocumentTemplates type="receipt" />}</Route>
      <Route path={"/lpos/templates"}>{() => <DocumentTemplates type="purchase_order" />}</Route>
      <Route path={"/credit-notes/templates"}>{() => <DocumentTemplates type="credit_note" />}</Route>
      <Route path={"/debit-notes/templates"}>{() => <DocumentTemplates type="debit_note" />}</Route>

      {/* Invoice Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/invoices"} component={Invoices} />
      <Route path={"/invoices/create"} component={CreateInvoice} />
      <Route path={"/invoices/:id/edit"} component={EditInvoice} />
      <Route path={"/invoices/:id"} component={InvoiceDetails} />
      
      {/* Recurring Expense Routes */}
      <Route path={"/recurring-expenses"} component={RecurringExpenses} />
      
      {/* Recurring Invoice Routes */}
      <Route path={"/recurring-invoices"} component={RecurringInvoices} />
      
      {/* Payment Plans Routes */}
      <Route path={"/payment-plans"} component={PaymentPlans} />
      
      {/* Project Milestones Routes */}
      <Route path={"/project-milestones"} component={ProjectMilestones} />
      
      {/* Time Tracking Routes */}
      <Route path={"/time-tracking"} component={TimeTracking} />
      
      {/* Sales Pipeline Routes */}
      <Route path={"/sales-pipeline"} component={SalesPipeline} />
      {/* Workflow Automation Routes */}
      <Route path={"/workflow-automation"} component={WorkflowAutomation} />
      {/* Estimate Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/estimates"} component={Estimates} />
      <Route path={"/estimates/create"} component={CreateEstimate} />
      <Route path={"/estimates/:id/edit"} component={EditEstimate} />
      <Route path={"/estimates/:id"} component={EstimateDetails} />
      
      {/* Receipt Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/tickets"} component={TicketsPage} />
      <Route path={"/tickets/create"} component={CreateTicket} />
      <Route path={"/tickets/:id/edit"} component={EditTicket} />
      <Route path={"/finance/settings"} component={FinanceSettingsPage} />
      <Route path={"/receipts"} component={Receipts} />
      <Route path={"/receipts/create"} component={CreateReceipt} />
      <Route path={"/receipts/:id/edit"} component={EditReceipt} />
      <Route path={"/receipts/:id"} component={ReceiptDetails} />
      
      {/* Opportunity Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/opportunities"} component={Opportunities} />
      <Route path={"/opportunities/create"} component={CreateOpportunity} />
      <Route path={"/opportunities/:id/edit"} component={EditOpportunity} />
      <Route path={"/opportunities/:id"} component={OpportunityDetails} />
      
      {/* Payment Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/payments"} component={Payments} />
      <Route path={"/payments/create"} component={CreatePayment} />
      <Route path={"/payments/reconciliation"} component={PaymentReconciliation} />
      <Route path={"/payments/overdue"} component={OverduePayments} />
      <Route path={"/payments/reports"} component={PaymentReports} />
      <Route path={"/payments/:id/edit"} component={EditPayment} />
      <Route path={"/payments/:id"} component={PaymentDetails} />
      
      {/* Product Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/products"} component={Products} />
      <Route path={"/products/create"} component={CreateProduct} />
      <Route path={"/products/:id/edit"} component={EditProduct} />
      <Route path={"/products/:id"} component={ProductDetails} />
      
      {/* Service Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/services"} component={Services} />
      <Route path={"/services/create"} component={CreateService} />
      <Route path={"/services/:id/edit"} component={EditService} />
      <Route path={"/services/:id"} component={ServiceDetails} />
      
      {/* Expense Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/expenses"} component={Expenses} />
      <Route path={"/expenses/create"} component={CreateExpense} />
      <Route path={"/expenses/:id/edit"} component={EditExpense} />
      <Route path={"/expenses/:id"} component={ExpensesDetails} />
      
      {/* HR Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/hr"} component={HR} />
      <Route path={"/hr/:id/edit"} component={EditEmployee} />
      <Route path={"/hr/:id"} component={HRDetails} />
      <Route path={"/job-groups"} component={JobGroups} />
      <Route path={"/onboarding"} component={Onboarding} />
      <Route path={"/holidays"} component={Holidays} />
      <Route path={"/payslips"} component={Payslips} />
      <Route path={"/training"} component={Training} />
      
      {/* Employee Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/employees"} component={Employees} />
      <Route path={"/employees/create"} component={CreateEmployee} />
      <Route path={"/employees/:id/edit"} component={EditEmployee} />
      <Route path={"/employees/:id"} component={EmployeeDetails} />
      
      {/* Attendance Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/attendance"} component={Attendance} />
      <Route path={"/attendance/new"} component={CreateAttendance} />
      <Route path={"/attendance/create"} component={CreateAttendance} />
      <Route path={"/attendance/:id/edit"} component={EditAttendance} />
      <Route path={"/attendance/:id"} component={AttendanceDetails} />
      
      {/* Payroll Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/payroll"} component={HRPayrollManagement} />
      <Route path={"/payroll/kenyan"} component={KenyanPayrollCalculator} />
      <Route path={"/payroll/tax-compliance"} component={TaxComplianceReportsPage} />
      <Route path={"/finance/reports"} component={FinancialReportsPage} />
      <Route path={"/imprests"} component={ImprestsPage} />
      <Route path={"/reports/sales"} component={SalesReportsPage} />
      <Route path={"/import-excel"} component={ImportExcelPage} />
      <Route path={"/tools"} component={Settings} />
      <Route path={"/tools/theme-customization"} component={ThemeCustomization} />
      <Route path={"/tools/brand-customization"} component={BrandCustomization} />
      <Route path={"/tools/homepage-builder"} component={CustomHomepageBuilder} />
      <Route path={"/tools/system-settings"} component={SystemSettings} />
      <Route path={"/tools/integration-guides"} component={IntegrationGuides} />
      
      {/* Payroll - Full CRUD Routes */}
      <Route path={"/payroll/create"} component={CreatePayroll} />
      <Route path={"/payroll/:id/edit"} component={EditPayroll} />
      <Route path={"/payroll/:id"} component={PayrollDetails} />
      
      {/* Salary Structures - Full CRUD Routes */}
      <Route path={"/salary-structures/create"} component={CreateSalaryStructure} />
      <Route path={"/payroll/salary-structures/create"} component={CreateSalaryStructure} />
      <Route path={"/salary-structures/:id/edit"} component={EditSalaryStructure} />
      <Route path={"/payroll/salary-structures/:id/edit"} component={EditSalaryStructure} />
      
      {/* Allowances - Full CRUD Routes */}
      <Route path={"/allowances/create"} component={CreateAllowance} />
      <Route path={"/payroll/allowances/create"} component={CreateAllowance} />
      <Route path={"/allowances/:id/edit"} component={EditAllowance} />
      <Route path={"/payroll/allowances/:id/edit"} component={EditAllowance} />
      
      {/* Deductions - Full CRUD Routes */}
      <Route path={"/deductions/create"} component={CreateDeduction} />
      <Route path={"/payroll/deductions/create"} component={CreateDeduction} />
      <Route path={"/deductions/:id/edit"} component={EditDeduction} />
      <Route path={"/payroll/deductions/:id/edit"} component={EditDeduction} />
      
      {/* Benefits - Full CRUD Routes */}
      <Route path={"/benefits/create"} component={CreateBenefit} />
      <Route path={"/payroll/benefits/create"} component={CreateBenefit} />
      <Route path={"/benefits/:id/edit"} component={EditBenefit} />
      <Route path={"/payroll/benefits/:id/edit"} component={EditBenefit} />
      
      {/* Leave Management Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/leave-management"} component={LeaveManagement} />
      <Route path={"/leave-management/create"} component={CreateLeaveRequest} />
      <Route path={"/leave-management/:id/edit"} component={EditLeave} />
      <Route path={"/leave-management/:id"} component={LeaveManagementDetails} />
      
      {/* Department Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/departments"} component={Departments} />
      <Route path={"/departments/create"} component={CreateDepartment} />
      <Route path={"/departments/:id/edit"} component={EditDepartment} />
      <Route path={"/departments/:id"} component={DepartmentDetails} />
      
      {/* Budget Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/budgets"} component={BudgetsPage} />
      <Route path={"/budgets/create"} component={CreateBudget} />
      <Route path={"/budgets/professional"} component={ProfessionalBudgeting} />
      <Route path={"/budgets/:id/edit"} component={EditBudget} />
      <Route path={"/budgets/:id"} component={BudgetDetails} />
      
      {/* Procurement Master Route - Main procurement hub */}
      <Route path={"/procurement"} component={ProcurementMaster} />
      
      {/* Supplier Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/suppliers"} component={Suppliers} />
      <Route path={"/suppliers/create"} component={CreateSupplier} />
      <Route path={"/suppliers/:id/edit"} component={EditSupplier} />
      <Route path={"/suppliers/:id"} component={SupplierDetails} />
      
      {/* LPO Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/lpos"} component={LPOsPage} />
      <Route path={"/lpos/create"} component={CreateLPO} />
      <Route path={"/lpos/professional"} component={ProcurementLPOs} />
      <Route path={"/lpos/:id/edit"} component={EditLPO} />
      <Route path={"/lpos/:id"} component={LPODetails} />
      
      {/* Order Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/orders"} component={OrdersPage} />
      <Route path={"/orders/create"} component={CreateOrder} />
      <Route path={"/orders/professional"} component={ProcurementOrders} />
      <Route path={"/orders/:id/edit"} component={EditOrder} />
      <Route path={"/orders/:id"} component={OrderDetails} />
      
      {/* Imprest Routes */}
      <Route path={"/imprests/professional"} component={ProcurementImprests} />
      <Route path={"/imprests/:id"} component={ImprestDetails} />
      
      {/* Quotes Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/quotes/new"} component={CreateQuote} />
      <Route path={"/quotes/:id/edit"} component={CreateQuote} />
      <Route path={"/quotes/:id"} component={QuoteDetails} />
      <Route path={"/quotes"} component={Quotes} />

      {/* Phase 20 - Quotations & RFQs */}
      <Route path={"/quotations/:id"} component={QuotationDetails} />
      <Route path={"/quotations"} component={Quotations} />
      
      {/* Phase 20 - Delivery Notes */}
      <Route path={"/delivery-notes/:id"} component={DeliveryNoteDetails} />
      <Route path={"/delivery-notes"} component={DeliveryNotes} />
      
      {/* Phase 20 - Goods Received Notes */}
      <Route path={"/grn/:id"} component={GRNDetails} />
      <Route path={"/grn"} component={GRN} />
      
      {/* Phase 20 - Contracts Management */}
      <Route path={"/contracts/templates"} component={ContractTemplates} />
      <Route path={"/contracts/:id"} component={ContractDetails} />
      <Route path={"/contracts"} component={ContractManagement} />
      
      {/* Phase 20 - Asset Management */}
      <Route path={"/assets/:id"} component={AssetDetails} />
      <Route path={"/assets"} component={AssetManagement} />
      
      {/* Phase 20 - Warranty Management */}
      <Route path={"/warranty/create"} component={CreateWarranty} />
      <Route path={"/warranty/:id/edit"} component={EditWarranty} />
      <Route path={"/warranty/:id"} component={WarrantyDetails} />
      <Route path={"/warranty"} component={WarrantyManagement} />
      
      {/* HR Analytics Route */}
      <Route path={"/hr/analytics"} component={HRAnalyticsDashboard} />
      <Route path={"/hr/analytics-dashboard"} component={HRAnalyticsDashboard} />
      
      {/* Payroll Reports */}
      <Route path={"/payroll/department-reports"} component={DepartmentPayrollReports} />
      <Route path={"/budgets/expense-report"} component={ExpenseBudgetReport} />
      <Route path={"/reports/custom-builder"} component={CustomReportBuilder} />
      
      {/* Approvals Route */}
      <Route path={"/approvals"} component={Approvals} />
      <Route path={"/notifications"} component={Notifications} />
      
      {/* Communications Routes - STATIC routes BEFORE dynamic routes */}
      <Route path={"/communications/new"} component={CreateCommunication} />
      <Route path={"/communications"} component={Communications} />
      <Route path={"/communications/:id"} component={Communications} />
      
      {/* Messages Route */}
      <Route path={"/messages"} component={Messages} />
      
      {/* Activity Route */}
      <Route path={"/activity"} component={ActivityPage} />

      {/* Calendar Route */}
      <Route path={"/calendar"} component={CalendarPage} />
      
      {/* Accounting Routes */}
      <Route path={"/bank-reconciliation"} component={BankReconciliation} />
      <Route path={"/bank-reconciliation/:id/edit"} component={EditBankReconciliation} />
      <Route path={"/bank-reconciliation/:id"} component={BankReconciliationDetails} />
      <Route path={"/chart-of-accounts"} component={ChartOfAccounts} />
      <Route path={"/chart-of-accounts/:id/edit"} component={EditChartOfAccounts} />
      <Route path={"/chart-of-accounts/:id"} component={ChartOfAccountsDetails} />
      
      {/* Report Routes */}
      <Route path={"/reports"} component={Reports} />
      <Route path={"/reports/:id/edit"} component={CustomReportBuilder} />
      <Route path={"/reports/:id"} component={ReportsDetails} />
      
      {/* Account Routes */}
      <Route path={"/privacy-policy"} component={PrivacyPolicy} />
      <Route path={"/terms-and-conditions"} component={TermsAndConditions} />
      <Route path={"/documentation"} component={Documentation} />
      <Route path={"/documents"} component={DocumentManagement} />
      <Route path={"/user-guide"} component={UserGuide} />
      <Route path={"/troubleshooting"} component={TroubleshootingGuide} />
      <Route path={"/create-imprest"} component={CreateImprest} />
      <Route path={"/create-purchase-order"} component={CreatePurchaseOrder} />
      
      {/* Inventory Routes */}
      <Route path={"/inventory"} component={Inventory} />
      
      {/* Financial Dashboard Routes */}
      <Route path={"/financial-dashboard"} component={FinancialDashboard} />
      
      {/* User Profile Routes */}
      <Route path={"/profile"} component={Profile} />
      <Route path={"/security"} component={Security} />
      <Route path={"/mfa"} component={MFA} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/roles"} component={Roles} />

      {/* AI Hub Route */}
      <Route path={"/ai-hub"} component={AIHub} />
      
      {/* Test Routes */}
      <Route path={"/test-pdf"} component={TestPDFGeneration} />
      
      {/* Password Management Routes */}
      <Route path={"/change-password"} component={ChangePassword} />
      <Route path={"/change-password-enhanced"} component={EnhancedChangePassword} />
      
      {/* Phase 4 Billing & Finance Routes */}
      <Route path={"/billing"} component={BillingDashboard} />
      <Route path={"/billing/dashboard"} component={BillingDashboard} />
      <Route path={"/receipts-advanced"} component={EnhancedReceiptManagement} />
      
      {/* Enterprise Routes */}
      <Route path={"/enterprise/tenants"} component={MultiTenancy} />
      <Route path={"/enterprise/tenants-management"} component={EnterpriseTenantsManagement} />
      <Route path={"/org/users"} component={OrganizationUsersManagement} />
      <Route path={"/enterprise/pricing"} component={SuperAdminPricingTiers} />
      <Route path={"/audit-logs"} component={AuditLogs} />
      <Route path={"/enterprise/tenant-admins"} component={MultiTenancy} />
      <Route path={"/enterprise/tenant-comms"} component={MultiTenancy} />
      <Route path={"/enterprise/create-super-admin"} component={SuperAdminDashboard} />
      <Route path={"/enterprise/settings"} component={EnterpriseSettings} />
      <Route path={"/enterprise/communications"} component={MultiTenancy} />

      {/* Sales Module Routes */}
      <Route path={"/service-invoices"} component={ServiceInvoices} />
      <Route path={"/service-invoices/create"} component={CreateServiceInvoice} />
      <Route path={"/service-invoices/:id/edit"} component={EditServiceInvoice} />
      <Route path={"/credit-notes/create"} component={CreateCreditNote} />
      <Route path={"/credit-notes/:id/edit"} component={EditCreditNote} />
      <Route path={"/credit-notes/:id"} component={CreditNoteDetails} />
      <Route path={"/credit-notes"} component={CreditNotes} />
      <Route path={"/debit-notes/create"} component={CreateDebitNote} />
      <Route path={"/debit-notes/:id/edit"} component={EditDebitNote} />
      <Route path={"/debit-notes/:id"} component={DebitNoteDetails} />
      <Route path={"/debit-notes"} component={DebitNotes} />
      <Route path={"/proposals/templates"} component={ProposalTemplates} />
      <Route path={"/proposals"} component={Proposals} />
      <Route path={"/proposals/:id/edit"} component={EditProposal} />
      <Route path={"/proposals/:id"} component={ProposalDetails} />
      <Route path={"/sales-pipeline"} component={SalesPipeline} />

      {/* Accounting / Finance Routes */}
      <Route path={"/forecasting"} component={Forecasting} />

      {/* HR Routes */}
      <Route path={"/performance-reviews"} component={PerformanceReviews} />
      <Route path={"/employee-contracts"} component={EmployeeContracts} />
      <Route path={"/leave-balances"} component={LeaveBalances} />
      <Route path={"/disciplinary"} component={DisciplinaryRecords} />
      <Route path={"/recruitment"} component={Recruitment} />
      <Route path={"/hr-automation"} component={HRAutomation} />

      {/* Products / Services Routes */}
      <Route path={"/service-templates"} component={ServiceTemplates} />
      <Route path={"/service-templates/create"} component={CreateServiceTemplate} />
      <Route path={"/service-templates/:id"} component={ServiceTemplateDetails} />
      <Route path={"/service-templates/:id/edit"} component={CreateServiceTemplate} />

      {/* Assets & Contracts Routes */}
      <Route path={"/work-orders"} component={WorkOrders} />
      <Route path={"/work-orders/create"} component={CreateWorkOrder} />
      <Route path={"/work-orders/:id/edit"} component={EditWorkOrder} />

      {/* Reports Routes */}
      <Route path={"/report-builder"} component={ReportBuilder} />
      <Route path={"/kpi-tracking"} component={KPITracking} />
      <Route path={"/activity-trail"} component={ActivityTrail} />
      <Route path={"/hr-analytics"} component={HRAnalytics} />
      <Route path={"/project-analytics"} component={ProjectAnalytics} />
      <Route path={"/advanced-analytics"} component={AdvancedAnalytics} />
      <Route path={"/reports/revenue"} component={RevenueForecasting} />
      <Route path={"/reports/conversion"} component={ConversionAnalytics} />

      {/* Communications Routes */}
      <Route path={"/staff-chat"} component={StaffChat} />
      <Route path={"/canned-responses"} component={CannedResponses} />

      {/* Admin Routes */}
      <Route path={"/admin/email-queue"} component={EmailQueue} />
      <Route path={"/admin/sms-queue"} component={SmsQueue} />
      <Route path={"/admin/backups"} component={BackupManagement} />
      <Route path={"/admin/email-templates"} component={AdminEmailTemplates} />
      <Route path={"/admin/cron-jobs"} component={AdminCronJobs} />
      <Route path={"/admin/tenant-communications"} component={TenantCommunications} />
      <Route path={"/admin/maintenance"} component={MaintenanceAdmin} />
      <Route path={"/admin/website"} component={WebsiteAdmin} />
      <Route path={"/admin/system-health"} component={SystemHealthDashboard} />
      <Route path={"/admin/sessions"} component={SessionManager} />
      <Route path={"/admin/system-logs"} component={SystemLogsViewer} />

      {/* Tools Routes */}
      <Route path={"/tools/custom-fields"} component={CustomFieldsPage} />
      <Route path={"/system-health"} component={SystemHealth} />
      <Route path={"/automation"} component={WorkflowAutomation} />
      <Route path={"/workflow-automation"} component={WorkflowAutomation} />
      <Route path={"/integrations"} component={Integrations} />
      <Route path={"/search"} component={GlobalSearch} />

      {/* Notes & Timesheets */}
      <Route path={"/notes"} component={Notes} />
      <Route path={"/timesheets"} component={Timesheets} />

      {/* Analytics & BI Routes */}
      <Route path={"/executive-dashboard"} component={ExecutiveDashboard} />
      <Route path={"/notification-center"} component={NotificationCenter} />
      <Route path={"/bi-tools"} component={BiTools} />
      <Route path={"/analytics/churn-prediction"} component={ChurnPrediction} />
      <Route path={"/analytics/funnel-analysis"} component={FunnelAnalysis} />
      <Route path={"/analytics/cohort-analysis"} component={CohortAnalysis} />
      <Route path={"/analytics/client-performance"} component={ClientPerformancePage} />
      <Route path={"/dashboard-builder-pro"} component={DashboardBuilderPro} />

      {/* 404 Not Found */}
      <Route component={NotFound} />
    </Switch>
    </RouteGuard>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ThemeCustomizationProvider>
          <BrandProvider>
            <CurrencyProvider>
              <NotificationsProvider>
                <TooltipProvider>
                  <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="size-8 animate-spin text-blue-500" /></div>}>
                    <Router />
                  </Suspense>
                </TooltipProvider>
              </NotificationsProvider>
            </CurrencyProvider>
          </BrandProvider>
        </ThemeCustomizationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}