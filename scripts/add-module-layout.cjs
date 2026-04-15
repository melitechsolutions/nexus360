const fs = require('fs');
const path = require('path');

const pagesToWrap = [
  { file: 'AdvancedAnalytics.tsx', title: 'Advanced Analytics', icon: 'BarChart3', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Analytics' }, { label: 'Advanced Analytics' }] },
  { file: 'ConversionAnalytics.tsx', title: 'Conversion Analytics', icon: 'TrendingUp', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Analytics' }, { label: 'Conversion Analytics' }] },
  { file: 'RevenueForecasting.tsx', title: 'Revenue Forecasting', icon: 'TrendingUp', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Finance' }, { label: 'Revenue Forecasting' }] },
  { file: 'EnterpriseSettings.tsx', title: 'Enterprise Settings', icon: 'Building2', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Settings' }, { label: 'Enterprise Settings' }] },
  { file: 'AndroidApp.tsx', title: 'Android App', icon: 'Smartphone', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Mobile' }, { label: 'Android App' }] },
  { file: 'IosApp.tsx', title: 'iOS App', icon: 'Smartphone', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Mobile' }, { label: 'iOS App' }] },
  { file: 'AnomalyDetection.tsx', title: 'Anomaly Detection', icon: 'AlertTriangle', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Analytics' }, { label: 'Anomaly Detection' }] },
  { file: 'ApiDocumentation.tsx', title: 'API Documentation', icon: 'BookOpen', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Tools' }, { label: 'API Documentation' }] },
  { file: 'BiTools.tsx', title: 'BI Tools', icon: 'BarChart3', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Analytics' }, { label: 'BI Tools' }] },
  { file: 'CacheManager.tsx', title: 'Cache Manager', icon: 'Database', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'System' }, { label: 'Cache Manager' }] },
  { file: 'DatabaseTuning.tsx', title: 'Database Tuning', icon: 'Database', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'System' }, { label: 'Database Tuning' }] },
  { file: 'DataWarehouse.tsx', title: 'Data Warehouse', icon: 'Database', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'System' }, { label: 'Data Warehouse' }] },
  { file: 'DockerOrchestration.tsx', title: 'Docker Orchestration', icon: 'Server', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'System' }, { label: 'Docker Orchestration' }] },
  { file: 'EtlMonitor.tsx', title: 'ETL Monitor', icon: 'Activity', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'System' }, { label: 'ETL Monitor' }] },
  { file: 'ChatbotAgent.tsx', title: 'Chatbot Agent', icon: 'MessageSquare', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'AI' }, { label: 'Chatbot Agent' }] },
  { file: 'ChurnPrediction.tsx', title: 'Churn Prediction', icon: 'TrendingDown', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Analytics' }, { label: 'Churn Prediction' }] },
  { file: 'Collaboration.tsx', title: 'Collaboration', icon: 'Users', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Tools' }, { label: 'Collaboration' }] },
  { file: 'ComplianceManagement.tsx', title: 'Compliance Management', icon: 'Shield', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Security' }, { label: 'Compliance Management' }] },
  { file: 'CurrencyConverter.tsx', title: 'Currency Converter', icon: 'DollarSign', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Finance' }, { label: 'Currency Converter' }] },
  { file: 'DarkMode.tsx', title: 'Dark Mode', icon: 'Moon', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Settings' }, { label: 'Dark Mode' }] },
  { file: 'DealRegistry.tsx', title: 'Deal Registry', icon: 'FileText', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Sales' }, { label: 'Deal Registry' }] },
  { file: 'ComponentLibrary.tsx', title: 'Component Library', icon: 'LayoutGrid', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Tools' }, { label: 'Component Library' }] },
  { file: 'DesignSystem.tsx', title: 'Design System', icon: 'Palette', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Tools' }, { label: 'Design System' }] },
  { file: 'FeatureFlags.tsx', title: 'Feature Flags', icon: 'Flag', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'System' }, { label: 'Feature Flags' }] },
  { file: 'Encryption.tsx', title: 'Encryption', icon: 'Lock', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Security' }, { label: 'Encryption' }] },
  { file: 'MicroservicesConfig.tsx', title: 'Microservices Config', icon: 'Settings', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'System' }, { label: 'Microservices Config' }] },
  { file: 'MobileAppManagement.tsx', title: 'Mobile App Management', icon: 'Smartphone', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Mobile' }, { label: 'Mobile App Management' }] },
  { file: 'MpesaConfig.tsx', title: 'M-Pesa Configuration', icon: 'CreditCard', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Settings' }, { label: 'M-Pesa Configuration' }] },
  { file: 'NlpProcessor.tsx', title: 'NLP Processor', icon: 'Brain', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'AI' }, { label: 'NLP Processor' }] },
  { file: 'OfflineSync.tsx', title: 'Offline Sync', icon: 'RefreshCw', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'System' }, { label: 'Offline Sync' }] },
  { file: 'PenTesting.tsx', title: 'Penetration Testing', icon: 'Shield', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Security' }, { label: 'Penetration Testing' }] },
  { file: 'TaskScheduler.tsx', title: 'Task Scheduler', icon: 'Clock', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'System' }, { label: 'Task Scheduler' }] },
  { file: 'ThreatDetection.tsx', title: 'Threat Detection', icon: 'ShieldAlert', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Security' }, { label: 'Threat Detection' }] },
  { file: 'VulnerabilityScan.tsx', title: 'Vulnerability Scan', icon: 'Search', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Security' }, { label: 'Vulnerability Scan' }] },
  { file: 'DocumentLibrary.tsx', title: 'Document Library', icon: 'FileText', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Documents' }, { label: 'Document Library' }] },
  { file: 'ThirdPartyIntegrations.tsx', title: 'Third Party Integrations', icon: 'Plug', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Settings' }, { label: 'Third Party Integrations' }] },
  { file: 'UsageMetering.tsx', title: 'Usage Metering', icon: 'Gauge', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'System' }, { label: 'Usage Metering' }] },
  { file: 'VersionControl.tsx', title: 'Version Control', icon: 'GitBranch', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'System' }, { label: 'Version Control' }] },
  { file: 'Webhooks.tsx', title: 'Webhooks', icon: 'Webhook', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Settings' }, { label: 'Webhooks' }] },
  { file: 'TestPDFGeneration.tsx', title: 'PDF Generation Test', icon: 'FileText', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Tools' }, { label: 'PDF Generation Test' }] },
  { file: 'HRAnalyticsPage.tsx', title: 'HR Analytics', icon: 'BarChart3', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'HR' }, { label: 'HR Analytics' }] },
  { file: 'Internationalization.tsx', title: 'Internationalization', icon: 'Globe', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Settings' }, { label: 'Internationalization' }] },
  { file: 'CohortAnalysis.tsx', title: 'Cohort Analysis', icon: 'Users', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Analytics' }, { label: 'Cohort Analysis' }] },
  { file: 'FunnelAnalysis.tsx', title: 'Funnel Analysis', icon: 'Filter', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Analytics' }, { label: 'Funnel Analysis' }] },
  { file: 'ClientPerformance.tsx', title: 'Client Performance', icon: 'TrendingUp', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Clients' }, { label: 'Client Performance' }] },
  { file: 'DashboardBuilderPro.tsx', title: 'Dashboard Builder', icon: 'LayoutGrid', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Tools' }, { label: 'Dashboard Builder' }] },
  { file: 'NotificationCenter.tsx', title: 'Notification Center', icon: 'Bell', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Notification Center' }] },
  { file: 'ExecutiveDashboard.tsx', title: 'Executive Dashboard', icon: 'BarChart3', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Executive Dashboard' }] },
  { file: 'CustomReportBuilder.tsx', title: 'Custom Report Builder', icon: 'FileText', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Reports' }, { label: 'Custom Report Builder' }] },
  { file: 'TimeTracking.tsx', title: 'Time Tracking', icon: 'Clock', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'HR' }, { label: 'Time Tracking' }] },
  { file: 'ComponentShowcase.tsx', title: 'Component Showcase', icon: 'LayoutGrid', breadcrumbs: [{ label: 'Dashboard', href: '/crm/dashboard' }, { label: 'Tools' }, { label: 'Component Showcase' }] },
];

const baseDir = path.join(__dirname, '..', 'client', 'src', 'pages');
let modified = 0;
let skipped = 0;
let errors = [];

// Map of icons that may need special import handling
const lucideIcons = new Set([
  'BarChart3', 'TrendingUp', 'TrendingDown', 'Building2', 'Smartphone', 'AlertTriangle',
  'BookOpen', 'Database', 'Server', 'Activity', 'MessageSquare', 'Users', 'Shield',
  'DollarSign', 'Moon', 'FileText', 'LayoutGrid', 'Palette', 'Flag', 'Lock', 'Settings',
  'CreditCard', 'Brain', 'RefreshCw', 'ShieldAlert', 'Search', 'Clock', 'Plug', 'Gauge',
  'GitBranch', 'Webhook', 'Globe', 'Filter', 'Bell',
]);

pagesToWrap.forEach(p => {
  const filePath = path.join(baseDir, p.file);
  if (!fs.existsSync(filePath)) {
    errors.push(`${p.file} - file not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already has ModuleLayout
  if (content.includes('ModuleLayout')) {
    skipped++;
    return;
  }

  // Find the export default function
  const funcMatch = content.match(/export\s+default\s+function\s+(\w+)\s*\(/);
  if (!funcMatch) {
    errors.push(`${p.file} - no export default function found`);
    return;
  }

  // Build breadcrumbs for JSX
  const breadcrumbsJsx = p.breadcrumbs.map(b => {
    if (b.href) return `{ label: "${b.label}", href: "${b.href}" }`;
    return `{ label: "${b.label}" }`;
  }).join(', ');

  // Add ModuleLayout import  
  const moduleLayoutImport = `import { ModuleLayout } from "@/components/ModuleLayout";\n`;

  // Check if icon is already imported from lucide-react
  const hasLucideImport = content.includes('lucide-react');
  const iconName = p.icon;
  let needsIconImport = false;

  if (!content.includes(iconName)) {
    needsIconImport = true;
  }

  // Add imports
  let importSection = moduleLayoutImport;
  if (needsIconImport && !hasLucideImport) {
    importSection += `import { ${iconName} } from "lucide-react";\n`;
  }

  // Insert imports after the last import line
  const lines = content.split('\n');
  let lastImportLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trimStart().startsWith('import ') || lines[i].includes(' from ')) {
      // Check if this is part of a multi-line import
      if (lines[i].includes(' from ')) {
        lastImportLine = i;
      } else {
        // Multi-line import, find the closing
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes(' from ')) {
            lastImportLine = j;
            break;
          }
        }
      }
    }
  }

  if (lastImportLine === -1) {
    errors.push(`${p.file} - no imports found`);
    return;
  }

  // If icon needs adding to existing lucide import
  if (needsIconImport && hasLucideImport) {
    for (let i = 0; i <= lastImportLine; i++) {
      if (lines[i].includes('lucide-react')) {
        // Add the icon to the import
        if (lines[i].includes('{')) {
          lines[i] = lines[i].replace('{', `{ ${iconName}, `);
        }
        break;
      }
    }
  }

  // Insert ModuleLayout import after last import
  lines.splice(lastImportLine + 1, 0, moduleLayoutImport.trim());

  content = lines.join('\n');

  // Now wrap the return content with ModuleLayout
  // Find the return statement
  const returnMatch = content.match(/return\s*\(\s*\n/);
  if (!returnMatch) {
    // Try return with direct tag
    const returnMatch2 = content.match(/return\s*\(\s*</);
    if (!returnMatch2) {
      errors.push(`${p.file} - no return( pattern found`);
      return;
    }
  }

  // Strategy: Find the first <div or <Card or < after return( and replace it with <ModuleLayout ...>
  // Then find the matching closing tag and replace with </ModuleLayout>

  // Simpler approach: find `return (` and the first top-level `<div` after it, replace with ModuleLayout
  const returnIdx = content.search(/return\s*\(/);
  const afterReturn = content.substring(returnIdx);

  // Find first < after return (
  const firstTagMatch = afterReturn.match(/return\s*\(\s*\n?\s*(<\w+)/);
  if (!firstTagMatch) {
    errors.push(`${p.file} - couldn't find first tag after return`);
    return;
  }
  const firstTag = firstTagMatch[1]; // e.g. <div

  // Replace the opening tag
  const openTagRegex = new RegExp(`(return\\s*\\(\\s*\\n?\\s*)${firstTag.replace('<', '<')}[^>]*>`);
  const openTagMatch = content.match(openTagRegex);

  if (!openTagMatch) {
    errors.push(`${p.file} - couldn't match opening tag`);
    return;
  }

  // Determine closing tag
  const tagName = firstTag.replace('<', '');
  
  // Build the Module Layout open tag
  const moduleLayoutOpen = `<ModuleLayout\n      title="${p.title}"\n      icon={<${iconName} className="h-5 w-5" />}\n      breadcrumbs={[${breadcrumbsJsx}]}\n    >`;

  // Replace the opening tag with ModuleLayout
  content = content.replace(openTagMatch[0], `return (\n    ${moduleLayoutOpen}`);

  // Replace the last closing tag
  // Find the last occurrence of </tagName> before the final );\n}
  const closingTag = `</${tagName}>`;
  const lastClosingIdx = content.lastIndexOf(closingTag);
  if (lastClosingIdx !== -1) {
    content = content.substring(0, lastClosingIdx) + '</ModuleLayout>' + content.substring(lastClosingIdx + closingTag.length);
  }

  // Remove any existing inline h1 title since ModuleLayout provides it
  // Remove patterns like: <h1 className="...">Title Text</h1>
  content = content.replace(/<h1[^>]*>.*?<\/h1>\s*\n?/g, '');
  // Also remove standalone title divs that just show the page title  
  content = content.replace(/<div className="flex[^"]*items-center[^"]*justify-between[^"]*">\s*\n\s*<div>\s*\n\s*<p[^>]*>.*?<\/p>\s*\n?\s*<\/div>\s*\n?\s*<[^>]*\/>\s*\n?\s*<\/div>\s*\n?/g, '');

  // Remove gradient backgrounds from top-level since ModuleLayout handles the layout
  content = content.replace(/bg-gradient-to-br from-\w+-\d+ to-\w+-\d+\s*/g, '');
  content = content.replace(/min-h-screen\s*/g, '');

  fs.writeFileSync(filePath, content, 'utf8');
  modified++;
  console.log(`  ✓ ${p.file}`);
});

console.log(`\nModified: ${modified}`);
console.log(`Skipped (already has layout): ${skipped}`);
if (errors.length > 0) {
  console.log(`Errors (${errors.length}):`);
  errors.forEach(e => console.log(`  ✗ ${e}`));
}
