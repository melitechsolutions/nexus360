# Unified Template System & Print Optimization Guide

## Overview

This comprehensive template system provides enterprise-grade solutions for:
- **Consistent Module Styling**: Unified look and feel across all CRM modules
- **Auto-Resizing Documents**: Content automatically scales to fit print pages perfectly
- **Theme Support**: Dark/Light mode with persistent user preference
- **Print Optimization**: Professional print output with proper spacing and page breaks
- **Responsive Design**: Adapts to all screen sizes seamlessly
- **Accessibility**: WCAG compliant with semantic HTML

## Files Created

### 1. **print-autoscale.css** (`styles/print-autoscale.css`)
Print-optimized CSS with automatic content scaling

**Features:**
- Auto-scales content to fit A4 page (210mm × 297mm)
- Section-wise scaling transforms for perfect fit
- Print preview mode for screen display
- Responsive breakpoint handling
- Dark/light mode support
- Zoom controls for preview mode

**Key Classes:**
- `.document-wrapper`: Container for A4 page
- `.document-header`: Header section (scales at 0.95)
- `.document-meta`: Metadata section (scales at 0.93)
- `.line-items-section`: Table section (scales at 0.92)
- `.totals-section`: Totals area (scales at 0.90)
- `.document-footer`: Footer section (scales at 0.88)

### 2. **unified-module-layout.css** (`styles/unified-module-layout.css`)
Complete styling system for all module layouts

**Color System:**
```css
--primary-color: #ff9f43 (Orange - Brand Color)
--primary-dark: #2d3436 (Dark Blue-Gray - Text)
--secondary-color: #636e72 (Medium Gray - Secondary Text)
--border-color: #dfe6e9 (Light Gray - Borders)
--light-bg: #f8f9fa (Very Light Gray - Backgrounds)
```

**Gradient Presets:**
- `--gradient-blue`: Blue gradient for data metrics
- `--gradient-green`: Green gradient for positive metrics
- `--gradient-orange`: Orange gradient for primary metrics
- `--gradient-purple`: Purple gradient for user metrics
- `--gradient-red`: Red gradient for alerts/warnings

**Components:**
- `.module-header`: Sticky header with controls
- `.module-toolbar`: Theme toggle, zoom, print buttons
- `.dashboard-card`: Gradient cards for metrics
- `.content-section`: Organized content areas
- `.print-table`: Professional table styling
- `.template-metadata`: Key-value pair display

### 3. **UnifiedModuleLayout.tsx** (`components/UnifiedModuleLayout.tsx`)
React component system for building consistent modules

**Main Components:**

#### UnifiedModuleLayout
```typescript
<UnifiedModuleLayout
  title="Module Name"
  subtitle="Subtitle"
  logo="/path/to/logo.png"
  cards={cardConfigs}
  sections={sectionConfigs}
  showThemeToggle={true}
  printable={true}
  isDarkMode={false}
  onThemeToggle={(isDark) => setDarkMode(isDark)}
/>
```

**Props:**
- `title`: Main module title
- `subtitle`: Optional subtitle
- `logo`: Optional logo image URL
- `cards`: Dashboard card configurations
- `sections`: Content section configurations
- `showThemeToggle`: Show dark/light mode toggle
- `printable`: Enable print features
- `isDarkMode`: Current theme mode
- `onThemeToggle`: Callback for theme changes

#### DashboardCard
Displays key metrics with gradient backgrounds

```typescript
interface CardConfig {
  id: string;
  title: string;  // e.g., "Total Revenue"
  icon: React.ReactNode;  // e.g., '💰' or <Icon />
  value: string | number;  // e.g., "$125,450"
  subtitle?: string;  // e.g., "+12% from last month"
  gradient: { from: string; to: string };
  onClick?: () => void;
  loading?: boolean;
}
```

#### ContentSection
Organizes content with headers and styling options

```typescript
interface SectionConfig {
  id: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  variant?: 'default' | 'highlighted' | 'minimal';
  fullWidth?: boolean;
}
```

#### PrintOptimizedTable
Professional table for tabular data

```typescript
<PrintOptimizedTable
  title="Line Items"
  columns={[
    { key: 'id', label: 'ID', width: '15%' },
    { key: 'amount', label: 'Amount', align: 'right', width: '25%' },
    // ...
  ]}
  data={[
    { id: 'INV-001', amount: '$1,230.00' },
    // ...
  ]}
  striped={true}
/>
```

#### MetadataDisplay
Shows key-value pairs in grid layout

```typescript
<MetadataDisplay
  items={[
    { label: 'Invoice #', value: 'INV-2024-001' },
    { label: 'Date', value: '2024-01-15' },
  ]}
  columns={4}
/>
```

### 4. **UnifiedModuleLayout.examples.tsx** (`components/UnifiedModuleLayout.examples.tsx`)
Complete examples showing implementation patterns

**Examples Included:**
1. **DashboardExample**: Statistics dashboard with 4 cards
2. **InvoiceExample**: Professional invoice layout
3. **ReportExample**: Multi-section report layout
4. **UpgradedDashboardHome**: Migration of existing dashboard

## Implementation Guide

### Step 1: Import Styles
```typescript
import '../styles/print-autoscale.css';
import '../styles/unified-module-layout.css';
```

### Step 2: Replace Module Wrapper
```typescript
// OLD
<div className="module-container">
  <Header title="My Module" />
  <Content />
  <Footer />
</div>

// NEW
<UnifiedModuleLayout
  title="My Module"
  cards={cards}
  sections={sections}
  showThemeToggle={true}
  printable={true}
/>
```

### Step 3: Prepare Card Data
```typescript
const cards: CardConfig[] = [
  {
    id: 'metric-1',
    title: 'Total Revenue',
    icon: '💰',
    value: '$125,450',
    subtitle: '+12% from last month',
    gradient: {
      from: '#ff9f43',
      to: '#ff6348',
    },
  },
  // ... more cards
];
```

### Step 4: Create Sections
```typescript
const sections: SectionConfig[] = [
  {
    id: 'section-1',
    title: 'Recent Transactions',
    subtitle: 'Last 10 items',
    variant: 'highlighted',
    children: <PrintOptimizedTable {...tableProps} />,
  },
  // ... more sections
];
```

### Step 5: Handle Theme Switching
```typescript
const [isDarkMode, setIsDarkMode] = useState(() => {
  return localStorage.getItem('theme-mode') === 'dark';
});

const handleThemeToggle = (isDark: boolean) => {
  setIsDarkMode(isDark);
  localStorage.setItem('theme-mode', isDark ? 'dark' : 'light');
};

return (
  <UnifiedModuleLayout
    isDarkMode={isDarkMode}
    onThemeToggle={handleThemeToggle}
    // ...
  />
);
```

## Print Optimization Details

### How Auto-Scaling Works

1. **Page Setup**: Document sized to A4 (210mm × 297mm with 10mm padding = 190mm × 277mm)

2. **Transform Scaling**: Each section scales individually:
   ```css
   .document-header: scale(0.95)      /* 95% size */
   .document-meta: scale(0.93)        /* 93% size */
   .line-items: scale(0.92)           /* 92% size */
   .totals: scale(0.90)               /* 90% size */
   .document-footer: scale(0.88)      /* 88% size */
   ```

3. **Total Fit**: 0.95 + 0.93 + (0.92 × n) + 0.90 + 0.88 ≈ 100% of page

4. **Print Preview**: Shows how document will look on actual paper

### Testing Print Output

1. **Screen Display:**
   - Open module with cards/content
   - Verify responsive layout on different screen sizes

2. **Print Preview (Ctrl+P or Cmd+P):**
   - Check page breaks don't split content awkwardly
   - Verify all text is readable
   - Confirm colors print correctly with `-webkit-print-color-adjust: exact`

3. **PDF Export:**
   - Use browser "Save as PDF" to create professional document
   - All scaling and styling preserved

## Dark Mode Implementation

### Automatic Detection
```typescript
// Uses system preference by default
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const [isDarkMode, setIsDarkMode] = useState(prefersDark);
```

### CSS Variables
```css
:root {
  /* Light mode defaults */
  --text-color: #2d3436;
  --light-bg: #f8f9fa;
  --border-color: #dfe6e9;
}

.dark-mode {
  /* Dark mode overrides */
  --text-color: #e0e0e0;
  --light-bg: #1a1f2e;
  --border-color: #3a4557;
}
```

### Persistent Storage
```typescript
localStorage.setItem('theme-mode', isDarkMode ? 'dark' : 'light');
const saved = localStorage.getItem('theme-mode') === 'dark';
```

## Module-by-Module Migration

### Dashboard Module
```typescript
// Before
function DashboardHome() {
  return <div className="dashboard-container">...</div>;
}

// After
function DashboardHome() {
  const cards = [
    { id: 'revenue', title: 'Revenue', icon: '💰', value: '$125K', ... },
    // ...
  ];
  return <UnifiedModuleLayout title="Dashboard" cards={cards} />;
}
```

### Invoice Module
```typescript
function InvoiceView({ invoiceId }) {
  const invoice = useInvoice(invoiceId);
  const metadata = [
    { label: 'Invoice #', value: invoice.number },
    { label: 'Date', value: format(invoice.date) },
    // ...
  ];
  
  return (
    <UnifiedModuleLayout
      title="Invoice"
      printable={true}
    >
      <MetadataDisplay items={metadata} />
      <PrintOptimizedTable
        columns={invoiceColumns}
        data={invoice.items}
      />
    </UnifiedModuleLayout>
  );
}
```

### Receipt Module
```typescript
function ReceiptPrint({ receiptId }) {
  const receipt = useReceipt(receiptId);
  
  return (
    <UnifiedModuleLayout
      title="Receipt"
      printable={true}
      showThemeToggle={false}
    >
      {/* ... receipt content ... */}
    </UnifiedModuleLayout>
  );
}
```

### Report Module
```typescript
function SalesReport() {
  const reportData = useReportData();
  const sections = [
    {
      id: 'summary',
      title: 'Summary',
      children: <ReportSummary data={reportData} />,
    },
    {
      id: 'details',
      title: 'Details',
      children: <PrintOptimizedTable {...props} />,
    },
  ];
  
  return (
    <UnifiedModuleLayout
      title="Sales Report"
      sections={sections}
      printable={true}
    />
  );
}
```

## Responsive Breakpoints

The system automatically adjusts for different screen sizes:

| Screen Size | Behavior | Grid Columns |
|-------------|----------|--------------|
| 1920px+ | No scaling | 4 cards |
| 1366-1920px | Scale 0.95 | 3-4 cards |
| 1024-1365px | Scale 0.90 | 2-3 cards |
| 768-1023px | Scale 0.85 | 2 cards in mobile |
| <768px | Scale 0.80 | 1 card |

## Accessibility Features

### Semantic HTML
- Proper heading hierarchy (h1, h2, h3)
- `<table>` elements for tabular data
- `<section>` and `<header>` landmarks
- Alt text for images

### Keyboard Navigation
- Tab through toolbar controls
- Enter to activate buttons
- Print with Ctrl+P or Cmd+P

### Color Contrast
- All text meets WCAG AA standards
- No color-only information conveyance
- Print-friendly black text on light backgrounds

### Screen Readers
- Aria labels on buttons
- Table headers properly referenced
- Status updates announced

## Performance Optimization

### CSS Optimization
- Minimal paint/reflow on theme toggle
- CSS variables for efficient updates
- Hardware acceleration with transforms
- Print CSS separate from screen CSS

### Component Optimization
- Memoization of card components
- Lazy loading of table data
- Virtual scrolling for large tables (future)

### Print Performance
- Reduced DOM nodes for print
- Media query separation
- Efficient transform scaling

## Troubleshooting

### Cards Not Showing Colors
**Problem:** Cards appear without gradient backgrounds
**Solution:** Ensure `-webkit-print-color-adjust: exact` is applied
```css
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
```

### Print Shows Too Much/Too Little
**Problem:** Content doesn't fit on one page
**Solution:** Adjust scale factors in print media query
```css
@media print {
  .document-header { transform: scale(0.93); } /* Was 0.95 */
  .line-items { transform: scale(0.91); }     /* Was 0.92 */
}
```

### Dark Mode Not Persisting
**Problem:** Theme reverts on page reload
**Solution:** Check localStorage is enabled and use `useEffect`:
```typescript
useEffect(() => {
  const saved = localStorage.getItem('theme-mode');
  if (saved) setIsDarkMode(saved === 'dark');
}, []);
```

### Table Rows Breaking Awkwardly
**Problem:** Table content splits across pages
**Solution:** Use `page-break-inside: avoid` and `table { page-break-inside: avoid; }`

### Print Preview Looks Different Than Print
**Problem:** Screen display doesn't match actual print
**Solution:** Use `.print-preview-mode` for accurate simulation
```typescript
<div className="print-preview-mode">
  {/* Renders at actual print size */}
</div>
```

## Best Practices

### 1. Use Semantic Cards
```typescript
// ✅ GOOD: Descriptive title and appropriate icon
{ title: 'Total Revenue', icon: '💰', value: '$125K' }

// ❌ BAD: Vague title
{ title: 'T. Rev', icon: '📊', value: '$125K' }
```

### 2. Organize Sections Logically
```typescript
// ✅ GOOD: Summary → Details → Footer
sections = [
  { id: 'summary', title: 'Summary' },
  { id: 'details', title: 'Transaction Details' },
  { id: 'notes', title: 'Notes' },
]

// ❌ BAD: Random order
sections = [
  { id: 'notes', title: 'Notes' },
  { id: 'summary', title: 'Summary' },
]
```

### 3. Use Appropriate Variants
```typescript
// ✅ GOOD: Info is highlighted, minor content is minimal
{ id: 'summary', variant: 'highlighted' }
{ id: 'help', variant: 'minimal' }

// ❌ BAD: Everything is highlighted
{ id: 'help', variant: 'highlighted' }
```

### 4. Test Print Output
```typescript
// Always test before deployment
1. Browser print preview (Ctrl+P)
2. Print to PDF
3. Print to physical printer
4. Check different screen sizes
```

## Example Usage in Production

### Dashboard Home (CRM)
```typescript
import { UnifiedModuleLayout } from './UnifiedModuleLayout';

export function DashboardHome() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const cards = [
    { id: 'revenue', title: 'Total Revenue', icon: '💰', value: '$425,680', ... },
    { id: 'invoices', title: 'Pending Invoices', icon: '📋', value: '23', ... },
    // ...
  ];
  
  return (
    <UnifiedModuleLayout
      title="Dashboard"
      subtitle="CRM Overview"
      cards={cards}
      showThemeToggle={true}
      isDarkMode={isDarkMode}
      onThemeToggle={setIsDarkMode}
    />
  );
}
```

## API Reference

See [UnifiedModuleLayout.tsx](./UnifiedModuleLayout.tsx) for complete TypeScript interfaces and component documentation.

## Files Summary

| File | Purpose | Size |
|------|---------|------|
| `print-autoscale.css` | Print optimization & auto-scaling | ~500 lines |
| `unified-module-layout.css` | Component styling & theme system | ~600 lines |
| `UnifiedModuleLayout.tsx` | React components & exports | ~400 lines |
| `UnifiedModuleLayout.examples.tsx` | Implementation examples | ~450 lines |
| `UNIFIED_TEMPLATE_GUIDE.md` | This documentation | ~600 lines |

## Next Steps

1. **Immediate**: Import styles in main app layout
2. **Week 1**: Migrate Dashboard module
3. **Week 2**: Migrate Invoice & Receipt modules
4. **Week 3**: Migrate Reports & Analytics
5. **Week 4**: Migrate remaining modules
6. **Ongoing**: User feedback & refinements

## Support & Questions

For issues or questions about the unified template system:
1. Check Troubleshooting section above
2. Review examples in `UnifiedModuleLayout.examples.tsx`
3. Check component documentation in `UnifiedModuleLayout.tsx`
4. Review CSS variables in `unified-module-layout.css`
