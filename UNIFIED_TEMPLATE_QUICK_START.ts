/**
 * QUICK START: Unified Template System
 * Copy-paste snippets for rapid integration
 */

/* ============================================
   1. BASIC MODULE SETUP
   ============================================ */

// File: src/pages/MyModule.tsx
import React, { useState } from 'react';
import {
  UnifiedModuleLayout,
  PrintOptimizedTable,
  MetadataDisplay,
} from '@/components/UnifiedModuleLayout';
import '@/styles/print-autoscale.css';
import '@/styles/unified-module-layout.css';

export function MyModule() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <UnifiedModuleLayout
      title="My Module"
      subtitle="Module Description"
      showThemeToggle={true}
      printable={true}
      isDarkMode={isDarkMode}
      onThemeToggle={setIsDarkMode}
    >
      {/* Content goes here */}
    </UnifiedModuleLayout>
  );
}

/* ============================================
   2. ADD DASHBOARD CARDS
   ============================================ */

const cards = [
  {
    id: 'metric-1',
    title: 'Total Revenue',
    icon: '💰',
    value: '$125,450',
    subtitle: '+12% from last month',
    gradient: { from: '#ff9f43', to: '#ff6348' },
  },
  {
    id: 'metric-2',
    title: 'Active Invoices',
    icon: '📄',
    value: '48',
    subtitle: '$89,230 pending',
    gradient: { from: '#5f9ff0', to: '#0d47a1' },
  },
  {
    id: 'metric-3',
    title: 'Customers',
    icon: '👥',
    value: '342',
    subtitle: '15 new this month',
    gradient: { from: '#26de81', to: '#20c997' },
  },
];

<UnifiedModuleLayout
  title="Dashboard"
  cards={cards}
  showThemeToggle={true}
  printable={true}
/>

/* ============================================
   3. ADD DATA TABLE
   ============================================ */

<PrintOptimizedTable
  title="Recent Transactions"
  columns={[
    { key: 'id', label: 'Transaction #', width: '15%' },
    { key: 'customer', label: 'Customer', width: '30%' },
    { key: 'date', label: 'Date', width: '20%' },
    { key: 'amount', label: 'Amount', align: 'right' as const, width: '15%' },
    { key: 'status', label: 'Status', width: '20%' },
  ]}
  data={[
    {
      id: 'TXN-001',
      customer: 'Acme Corp',
      date: '2024-01-15',
      amount: '$5,230.00',
      status: 'Completed',
    },
    {
      id: 'TXN-002',
      customer: 'Tech Solutions',
      date: '2024-01-14',
      amount: '$3,450.00',
      status: 'Pending',
    },
  ]}
  striped={true}
/>

/* ============================================
   4. ADD METADATA DISPLAY
   ============================================ */

<MetadataDisplay
  items={[
    { label: 'Invoice #', value: 'INV-2024-001' },
    { label: 'Date', value: '2024-01-15' },
    { label: 'Due Date', value: '2024-02-15' },
    { label: 'Status', value: '🟢 Paid' },
  ]}
  columns={4}
/>

/* ============================================
   5. ADD CUSTOM SECTION
   ============================================ */

<div className="content-section section-highlighted">
  <div className="section-header">
    <div className="section-title-group">
      <h2 className="section-title">Customer Information</h2>
      <p className="section-subtitle">Billing details</p>
    </div>
  </div>
  <div className="section-content">
    {/* Your content here */}
  </div>
</div>

/* ============================================
   6. COMPLETE INVOICE EXAMPLE
   ============================================ */

export function InvoiceModule({ invoiceId }: { invoiceId: string }) {
  const invoice = useInvoice(invoiceId);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const metadata = [
    { label: 'Invoice #', value: invoice.number },
    { label: 'Date', value: new Date(invoice.date).toLocaleDateString() },
    { label: 'Due Date', value: new Date(invoice.dueDate).toLocaleDateString() },
    { label: 'Status', value: invoice.status },
  ];

  const tableData = invoice.items.map(item => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: `$${item.unitPrice.toFixed(2)}`,
    total: `$${(item.quantity * item.unitPrice).toFixed(2)}`,
  }));

  const totals = calculateTotals(invoice);

  return (
    <UnifiedModuleLayout
      title="Invoice"
      logo="/path/to/company-logo.png"
      showThemeToggle={true}
      printable={true}
      isDarkMode={isDarkMode}
      onThemeToggle={setIsDarkMode}
    >
      {/* Metadata Section */}
      <MetadataDisplay items={metadata} columns={4} />

      {/* Customer Info Section */}
      <div className="content-section section-highlighted" style={{ marginTop: '24px' }}>
        <div className="section-header">
          <div className="section-title-group">
            <h2 className="section-title">Billing Information</h2>
          </div>
        </div>
        <div className="section-content">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700 }}>
                FROM:
              </h4>
              <p style={{ margin: '0', fontSize: '13px', lineHeight: '1.6' }}>
                <strong>{invoice.company.name}</strong>
                <br />
                {invoice.company.address}
                <br />
                {invoice.company.city}, {invoice.company.state} {invoice.company.zip}
              </p>
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700 }}>
                BILL TO:
              </h4>
              <p style={{ margin: '0', fontSize: '13px', lineHeight: '1.6' }}>
                <strong>{invoice.customer.name}</strong>
                <br />
                {invoice.customer.address}
                <br />
                {invoice.customer.city}, {invoice.customer.state} {invoice.customer.zip}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <PrintOptimizedTable
        title="Invoice Items"
        columns={[
          { key: 'description', label: 'Description', width: '40%' },
          { key: 'quantity', label: 'Qty', align: 'center' as const, width: '15%' },
          { key: 'unitPrice', label: 'Unit Price', align: 'right' as const, width: '20%' },
          { key: 'total', label: 'Total', align: 'right' as const, width: '25%' },
        ]}
        data={tableData}
        striped={true}
      />

      {/* Totals Section */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
        <div style={{
          width: '100%',
          maxWidth: '320px',
          background: '#f8f9fa',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '16px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px 0',
            borderBottom: '1px solid #ddd',
          }}>
            <span>Subtotal:</span>
            <span>${totals.subtotal.toFixed(2)}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px 0',
            borderBottom: '1px solid #ddd',
          }}>
            <span>Tax ({totals.taxRate}%):</span>
            <span>${totals.tax.toFixed(2)}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 0',
            borderTop: '2px solid #ff9f43',
            fontSize: '16px',
            fontWeight: 700,
          }}>
            <span>TOTAL:</span>
            <span style={{ color: '#ff9f43' }}>${totals.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="content-section" style={{ marginTop: '24px' }}>
        <div className="section-header">
          <div className="section-title-group">
            <h2 className="section-title">Notes</h2>
          </div>
        </div>
        <div className="section-content">
          <p>{invoice.notes || 'No notes'}</p>
        </div>
      </div>
    </UnifiedModuleLayout>
  );
}

/* ============================================
   7. CARD GRADIENT PRESETS
   ============================================ */

// Quick gradients for common metrics
const GRADIENT_PRESETS = {
  REVENUE: { from: '#ff9f43', to: '#ff6348' },      // Orange
  INVOICES: { from: '#5f9ff0', to: '#0d47a1' },    // Blue
  CUSTOMERS: { from: '#26de81', to: '#20c997' },   // Green
  EXPENSES: { from: '#ee5a6f', to: '#c44569' },    // Red/Purple
  USERS: { from: '#a29bfe', to: '#6c5ce7' },       // Purple
  TRAFFIC: { from: '#74b9ff', to: '#0984e3' },     // Light Blue
  GROWTH: { from: '#55efc4', to: '#00b894' },      // Bright Green
  WARNING: { from: '#fdcb6e', to: '#f39c12' },     // Yellow/Orange
};

// Use like:
const card = {
  id: 'revenue',
  title: 'Total Revenue',
  icon: '💰',
  value: '$125,450',
  gradient: GRADIENT_PRESETS.REVENUE,
};

/* ============================================
   8. THEME TOGGLE WITH PERSISTENCE
   ============================================ */

import { useEffect, useState } from 'react';

function useTheme() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('theme-mode');
    if (saved) return saved === 'dark';
    
    // Fall back to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleTheme = (isDark: boolean) => {
    setIsDarkMode(isDark);
    localStorage.setItem('theme-mode', isDark ? 'dark' : 'light');
  };

  return { isDarkMode, toggleTheme };
}

// Usage:
function MyComponent() {
  const { isDarkMode, toggleTheme } = useTheme();
  
  return (
    <UnifiedModuleLayout
      isDarkMode={isDarkMode}
      onThemeToggle={toggleTheme}
      showThemeToggle={true}
      // ...
    />
  );
}

/* ============================================
   9. PRINT BUTTON HANDLER
   ============================================ */

function PrintButton() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      onClick={handlePrint}
      style={{
        padding: '8px 16px',
        background: '#ff9f43',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
      }}
    >
      🖨️ Print
    </button>
  );
}

/* ============================================
   10. RESPONSIVE CARD GRID
   ============================================ */

// Automatically wraps cards to fit screen
const cards = [
  // Cards automatically wrap on smaller screens
  // Desktop: 4 cards per row
  // Tablet: 2 cards per row
  // Mobile: 1 card per row
];

/* ============================================
   11. CUSTOM SECTION VARIANTS
   ============================================ */

// Default
<div className="content-section section-default">
  {/* Standard section with border and shadow */}
</div>

// Highlighted (with left border accent)
<div className="content-section section-highlighted">
  {/* Important info stands out */}
</div>

// Minimal (no border, no background)
<div className="content-section section-minimal">
  {/* Clean, minimal appearance */}
</div>

/* ============================================
   12. DATA TABLE WITH CUSTOM RENDERING
   ============================================ */

<PrintOptimizedTable
  title="Transactions"
  columns={[
    { key: 'id', label: 'ID' },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right' as const,
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <span style={{
          padding: '4px 8px',
          borderRadius: '4px',
          background: value === 'Paid' ? '#d4edda' : '#fff3cd',
          color: value === 'Paid' ? '#155724' : '#856404',
        }}>
          {value}
        </span>
      ),
    },
  ]}
  data={items}
  striped={true}
/>

/* ============================================
   13. EXPORT TO PDF
   ============================================ */

function ExportToPDF() {
  const handleExport = () => {
    // Method 1: Browser print to PDF
    window.print(); // Opens print dialog
    
    // Method 2: Using library (requires: npm install pdfkit)
    // import { PDFDocument } from '@/lib/pdf-generator';
    // const pdf = new PDFDocument();
    // pdf.addContent(document.querySelector('.module-content'));
    // pdf.download('document.pdf');
  };

  return <button onClick={handleExport}>📄 Export as PDF</button>;
}

/* ============================================
   14. LOAD THEME FROM LOCAL STORAGE
   ============================================ */

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme-mode');
    if (saved) {
      setIsDarkMode(saved === 'dark');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('theme-mode', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  return (
    <UnifiedModuleLayout
      isDarkMode={isDarkMode}
      onThemeToggle={setIsDarkMode}
      // ...
    />
  );
}

/* ============================================
   15. COMPLETE MINIMAL EXAMPLE
   ============================================ */

import React from 'react';
import { UnifiedModuleLayout } from '@/components/UnifiedModuleLayout';
import '@/styles/print-autoscale.css';
import '@/styles/unified-module-layout.css';

export function SimpleModule() {
  return (
    <UnifiedModuleLayout
      title="Simple Module"
      cards={[
        {
          id: '1',
          title: 'Metric',
          icon: '📊',
          value: '100',
          gradient: { from: '#ff9f43', to: '#ff6348' },
        },
      ]}
      printable={true}
    />
  );
}

/**
 * INTEGRATION CHECKLIST:
 * 
 * ☐ Import styles: import '@/styles/print-autoscale.css'
 * ☐ Import component: import { UnifiedModuleLayout } ...
 * ☐ Wrap module: <UnifiedModuleLayout title="..." />
 * ☐ Add cards: cards={[{ id, title, icon, value, gradient }]}
 * ☐ Add sections: sections={[{ id, title, children }]}
 * ☐ Enable printing: printable={true}
 * ☐ Add theme toggle: showThemeToggle={true}
 * ☐ Test responsive: Check at 480px, 768px, 1024px, 1920px
 * ☐ Test print preview: Ctrl+P to verify scaling
 * ☐ Test dark mode: Toggle theme and check styling
 * 
 * TIPS:
 * • Use provided gradients for consistent colors
 * • Keep card values concise (5-15 characters)
 * • Use emoji icons for quick visual recognition
 * • Test print on actual printer or PDF export
 * • Check all sections page-break-inside: avoid
 */
