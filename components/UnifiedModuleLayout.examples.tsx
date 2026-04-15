/*
 * Example Usage: Unified Module Layout
 * Demonstrates how to implement the unified template system
 * across all CRM modules (Dashboard, Invoices, Receipts, etc.)
 */

import React from 'react';
import {
  UnifiedModuleLayout,
  PrintOptimizedTable,
  MetadataDisplay,
} from './UnifiedModuleLayout';

/**
 * EXAMPLE 1: Dashboard with Statistics Cards
 * Shows how to create a dashboard-style module
 */
export const DashboardExample = () => {
  const cards = [
    {
      id: 'revenue',
      title: 'Total Revenue',
      icon: '💰',
      value: '$125,450',
      subtitle: '+12% from last month',
      gradient: {
        from: '#ff9f43',
        to: '#ff6348',
      },
    },
    {
      id: 'invoices',
      title: 'Active Invoices',
      icon: '📄',
      value: '48',
      subtitle: '$89,230 pending',
      gradient: {
        from: '#5f9ff0',
        to: '#0d47a1',
      },
    },
    {
      id: 'customers',
      title: 'Customers',
      icon: '👥',
      value: '342',
      subtitle: '15 new this month',
      gradient: {
        from: '#26de81',
        to: '#20c997',
      },
    },
    {
      id: 'expenses',
      title: 'Total Expenses',
      icon: '📊',
      value: '$45,230',
      subtitle: '-5% from last month',
      gradient: {
        from: '#ee5a6f',
        to: '#c44569',
      },
    },
  ];

  const sections = [
    {
      id: 'recent-invoices',
      title: 'Recent Invoices',
      subtitle: 'Last 10 invoices',
      variant: 'highlighted',
      children: (
        <PrintOptimizedTable
          title="Recent Transactions"
          columns={[
            { key: 'id', label: 'Invoice #', width: '15%' },
            { key: 'customer', label: 'Customer', width: '30%' },
            { key: 'date', label: 'Date', width: '20%' },
            { key: 'amount', label: 'Amount', align: 'right', width: '15%' },
            { key: 'status', label: 'Status', width: '20%' },
          ]}
          data={[
            {
              id: 'INV-001',
              customer: 'Acme Corp',
              date: '2024-01-15',
              amount: '$5,230.00',
              status: 'Paid',
            },
            {
              id: 'INV-002',
              customer: 'Tech Solutions',
              date: '2024-01-14',
              amount: '$3,450.00',
              status: 'Pending',
            },
            // Add more rows...
          ]}
          striped
        />
      ),
    },
  ];

  return (
    <UnifiedModuleLayout
      title="Dashboard"
      subtitle="CRM Statistics and Overview"
      cards={cards}
      sections={sections}
      showThemeToggle={true}
      printable={true}
    />
  );
};

/**
 * EXAMPLE 2: Invoice Module with Print Optimization
 * Shows how to create a document-focused module
 */
export const InvoiceExample = () => {
  const metadata = [
    { label: 'Invoice #', value: 'INV-2024-001' },
    { label: 'Date', value: '2024-01-15' },
    { label: 'Due Date', value: '2024-02-15' },
    { label: 'Status', value: '🟢 Paid' },
  ];

  const tableColumns = [
    {
      key: 'description',
      label: 'Description',
      width: '40%',
    },
    {
      key: 'quantity',
      label: 'Qty',
      align: 'center' as const,
      width: '15%',
    },
    {
      key: 'unitPrice',
      label: 'Unit Price',
      align: 'right' as const,
      width: '20%',
    },
    {
      key: 'total',
      label: 'Total',
      align: 'right' as const,
      width: '25%',
      render: (value: string) => <strong>{value}</strong>,
    },
  ];

  const tableData = [
    {
      description: 'Professional Services - Web Development',
      quantity: 40,
      unitPrice: '$150.00',
      total: '$6,000.00',
    },
    {
      description: 'UI/UX Design',
      quantity: 16,
      unitPrice: '$120.00',
      total: '$1,920.00',
    },
    {
      description: 'Project Management & Support',
      quantity: 20,
      unitPrice: '$100.00',
      total: '$2,000.00',
    },
  ];

  return (
    <UnifiedModuleLayout
      title="Invoice"
      logo="/logo.png"
      showThemeToggle={true}
      printable={true}
    >
      <MetadataDisplay items={metadata} columns={4} />

      <div className="content-section section-highlighted">
        <div className="section-header">
          <div className="section-title-group">
            <h2 className="section-title">Customer Information</h2>
          </div>
        </div>
        <div className="section-content">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700 }}>
                FROM:
              </h4>
              <p style={{ margin: '0', fontSize: '13px' }}>
                <strong>Your Company</strong>
                <br />
                123 Business St
                <br />
                City, State 12345
              </p>
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700 }}>
                BILL TO:
              </h4>
              <p style={{ margin: '0', fontSize: '13px' }}>
                <strong>Acme Corporation</strong>
                <br />
                456 Client Ave
                <br />
                Destination City, ST 67890
              </p>
            </div>
          </div>
        </div>
      </div>

      <PrintOptimizedTable
        title="Line Items"
        columns={tableColumns}
        data={tableData}
        striped
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
        <div style={{ width: '320px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', padding: '16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: '1px solid #ddd',
            }}
          >
            <span>Subtotal:</span>
            <span>$9,920.00</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: '1px solid #ddd',
            }}
          >
            <span>Tax (10%):</span>
            <span>$992.00</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderTop: '2px solid #ff9f43',
              fontSize: '16px',
              fontWeight: 700,
            }}
          >
            <span>TOTAL:</span>
            <span style={{ color: '#ff9f43' }}>$10,912.00</span>
          </div>
        </div>
      </div>
    </UnifiedModuleLayout>
  );
};

/**
 * EXAMPLE 3: Report Module with Custom Sections
 * Shows how to create a report-focused module
 */
export const ReportExample = () => {
  const sections = [
    {
      id: 'summary',
      title: 'Sales Summary',
      subtitle: 'Q1 2024 Overview',
      variant: 'highlighted' as const,
      children: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div style={{ textAlign: 'center', padding: '16px', background: '#f8f9fa', borderRadius: '4px' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#ff9f43' }}>$245,680</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Total Revenue</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', background: '#f8f9fa', borderRadius: '4px' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#26de81' }}>156</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Transactions</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', background: '#f8f9fa', borderRadius: '4px' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#5f9ff0' }}>$1,573</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Average</div>
          </div>
        </div>
      ),
    },
    {
      id: 'details',
      title: 'Transaction Details',
      variant: 'default' as const,
      children: (
        <PrintOptimizedTable
          title="Monthly Breakdown"
          columns={[
            { key: 'month', label: 'Month', width: '25%' },
            { key: 'revenue', label: 'Revenue', align: 'right' as const, width: '25%' },
            { key: 'transactions', label: 'Transactions', align: 'center' as const, width: '25%' },
            { key: 'average', label: 'Avg. Transaction', align: 'right' as const, width: '25%' },
          ]}
          data={[
            { month: 'January', revenue: '$78,450', transactions: '52', average: '$1,508' },
            { month: 'February', revenue: '$85,230', transactions: '54', average: '$1,578' },
            { month: 'March', revenue: '$82,000', transactions: '50', average: '$1,640' },
          ]}
          striped
        />
      ),
    },
  ];

  return (
    <UnifiedModuleLayout
      title="Sales Report"
      subtitle="Q1 2024 Performance Analysis"
      sections={sections}
      showThemeToggle={true}
      printable={true}
    />
  );
};

/**
 * EXAMPLE 4: Integration with Existing Dashboard
 * Shows how to upgrade existing DashboardHome component
 */
export const UpgradedDashboardHome = () => {
  const cards = [
    {
      id: 'total-revenue',
      title: 'Total Revenue',
      icon: '💵',
      value: '$425,680',
      subtitle: '+18% from last quarter',
      gradient: { from: '#ff9f43', to: '#ff6348' },
    },
    {
      id: 'pending-invoices',
      title: 'Pending Invoices',
      icon: '📋',
      value: '23',
      subtitle: '$78,450 awaiting payment',
      gradient: { from: '#5f9ff0', to: '#0d47a1' },
    },
    {
      id: 'active-customers',
      title: 'Active Customers',
      icon: '👤',
      value: '1,247',
      subtitle: '45 added this month',
      gradient: { from: '#26de81', to: '#20c997' },
    },
    {
      id: 'total-expenses',
      title: 'Total Expenses',
      icon: '💸',
      value: '$156,230',
      subtitle: '+8% from last quarter',
      gradient: { from: '#ee5a6f', to: '#c44569' },
    },
  ];

  return (
    <UnifiedModuleLayout
      title="Dashboard"
      cards={cards}
      showThemeToggle={true}
      printable={true}
    >
      {/* Add existing dashboard sections here */}
    </UnifiedModuleLayout>
  );
};

/**
 * HOW TO IMPLEMENT:
 * 
 * 1. Replace existing component render with UnifiedModuleLayout:
 *    OLD: <div className="dashboard"><DashboardHeader />...
 *    NEW: <UnifiedModuleLayout title="Module Name" cards={cards} sections={sections} />
 * 
 * 2. Import print styles in your component:
 *    import '../styles/print-autoscale.css';
 *    import '../styles/unified-module-layout.css';
 * 
 * 3. For custom styling, extend with CSS modules or styled-components:
 *    const CustomSection = styled.div`
 *      /* Inherits from unified-module-layout.css */
 *    `;
 * 
 * 4. Wire up theme switching if needed:
 *    const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme-mode') === 'dark');
 *    <UnifiedModuleLayout isDarkMode={isDarkMode} onThemeToggle={setIsDarkMode} />
 * 
 * 5. For print optimization, use PrintOptimizedTable instead of native tables:
 *    <PrintOptimizedTable columns={cols} data={data} title="Title" />
 * 
 * 6. Add to existing modules like:
 *    - Dashboard: ✅ Shows cards and recent activity
 *    - Invoices: ✅ Generates print-ready documents
 *    - Receipts: ✅ Professional receipt layout
 *    - Reports: ✅ Summary widgets and data tables
 *    - Analytics: ✅ Charts and metrics display
 *    - Payments: ✅ Payment history and status
 */
