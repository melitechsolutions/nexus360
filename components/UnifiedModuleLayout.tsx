/*
 * Unified Module Layout Component
 * Provides consistent styling across all modules with dark/light theme support
 * Supports dashboard cards, section layouts, and content organization
 * Optimized for both screen and print display
 */

import React, { useState, useEffect } from 'react';
import '../styles/print-autoscale.css';

export interface CardConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  value: string | number;
  subtitle?: string;
  gradient: {
    from: string;
    to: string;
  };
  onClick?: () => void;
  loading?: boolean;
}

export interface SectionConfig {
  id: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  variant?: 'default' | 'highlighted' | 'minimal';
  fullWidth?: boolean;
}

interface UnifiedModuleLayoutProps {
  title: string;
  subtitle?: string;
  logo?: string;
  cards?: CardConfig[];
  sections?: SectionConfig[];
  showThemeToggle?: boolean;
  printable?: boolean;
  children?: React.ReactNode;
  className?: string;
  isDarkMode?: boolean;
  onThemeToggle?: (isDark: boolean) => void;
}

/**
 * Unified Module Layout Component
 * Provides consistent styling and theming for all modules
 */
export const UnifiedModuleLayout: React.FC<UnifiedModuleLayoutProps> = ({
  title,
  subtitle,
  logo,
  cards = [],
  sections = [],
  showThemeToggle = false,
  printable = true,
  children,
  className = '',
  isDarkMode: initialDarkMode = false,
  onThemeToggle,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(initialDarkMode);
  const [zoom, setZoom] = useState(100);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const handleThemeToggle = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    onThemeToggle?.(newMode);
    // Persist theme preference
    localStorage.setItem('theme-mode', newMode ? 'dark' : 'light');
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 150));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 10, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`unified-module-layout ${isDarkMode ? 'dark-mode' : 'light-mode'} ${className}`}>
      {/* Header with Title and Controls */}
      <header className="module-header">
        <div className="module-header-content">
          {logo && <img src={logo} alt="Logo" className="module-logo" />}
          <div className="module-header-text">
            <h1 className="module-title">{title}</h1>
            {subtitle && <p className="module-subtitle">{subtitle}</p>}
          </div>
        </div>

        {/* Toolbar */}
        <div className="module-toolbar">
          {showThemeToggle && (
            <button
              className="toolbar-button theme-toggle"
              onClick={handleThemeToggle}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          )}

          {printable && (
            <>
              <button
                className="toolbar-button zoom-button"
                onClick={handleZoomOut}
                title="Zoom Out"
              >
                −
              </button>
              <span className="zoom-level">{zoom}%</span>
              <button
                className="toolbar-button zoom-button"
                onClick={handleZoomIn}
                title="Zoom In"
              >
                +
              </button>
              <button
                className="toolbar-button reset-button"
                onClick={handleResetZoom}
                title="Reset Zoom"
              >
                ⟲
              </button>
              <button
                className="toolbar-button print-button"
                onClick={handlePrint}
                title="Print"
              >
                🖨️
              </button>
              <button
                className="toolbar-button preview-button"
                onClick={() => setShowPrintPreview(!showPrintPreview)}
                title="Print Preview"
              >
                👁️
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main
        className="module-content"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center',
          transition: 'transform 0.2s ease',
        }}
      >
        {/* Dashboard Cards Grid */}
        {cards.length > 0 && (
          <section className="module-cards-grid">
            {cards.map(card => (
              <DashboardCard key={card.id} {...card} />
            ))}
          </section>
        )}

        {/* Content Sections */}
        {sections.length > 0 && (
          <div className="module-sections">
            {sections.map(section => (
              <ContentSection key={section.id} {...section} />
            ))}
          </div>
        )}

        {/* Custom Children */}
        {children}
      </main>

      {/* Print Preview Mode */}
      {showPrintPreview && printable && (
        <div className="print-preview-overlay">
          <div className="print-preview-close">
            <button onClick={() => setShowPrintPreview(false)}>×</button>
          </div>
          <div className="print-preview-mode">
            <div className="document-wrapper">
              {/* Print preview content mirrors main content */}
              <div className="document-container">
                {cards.length > 0 && (
                  <section className="module-cards-grid">
                    {cards.map(card => (
                      <DashboardCard key={card.id} {...card} />
                    ))}
                  </section>
                )}
                {sections.length > 0 && (
                  <div className="module-sections">
                    {sections.map(section => (
                      <ContentSection key={section.id} {...section} />
                    ))}
                  </div>
                )}
                {children}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Dashboard Card Component
 * Displays key metrics with gradient backgrounds
 */
const DashboardCard: React.FC<CardConfig> = ({
  id,
  title,
  icon,
  value,
  subtitle,
  gradient,
  onClick,
  loading = false,
}) => {
  return (
    <div
      className="dashboard-card"
      style={{
        backgroundImage: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
      }}
      onClick={onClick}
    >
      <div className="card-icon">{icon}</div>
      <div className="card-content">
        <p className="card-title">{title}</p>
        {loading ? (
          <div className="card-skeleton" />
        ) : (
          <>
            <p className="card-value">{value}</p>
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Content Section Component
 * Organizes content in consistent sections
 */
const ContentSection: React.FC<SectionConfig> = ({
  id,
  title,
  subtitle,
  children,
  variant = 'default',
  fullWidth = false,
}) => {
  return (
    <section className={`content-section section-${variant} ${fullWidth ? 'full-width' : ''}`}>
      <div className="section-header">
        <div className="section-title-group">
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="section-content">{children}</div>
    </section>
  );
};

/**
 * Print-Optimized Table Component
 * Used within sections for displaying tabular data
 */
interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface PrintTableProps {
  columns: TableColumn[];
  data: any[];
  title?: string;
  striped?: boolean;
}

export const PrintOptimizedTable: React.FC<PrintTableProps> = ({
  columns,
  data,
  title,
  striped = true,
}) => {
  return (
    <div className="template-line-items">
      {title && <h3 className="template-line-items-title">{title}</h3>}
      <table className={`print-table ${striped ? 'striped' : ''}`}>
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                style={{
                  textAlign: col.align || 'left',
                  width: col.width,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              {columns.map(col => (
                <td
                  key={`${idx}-${col.key}`}
                  style={{
                    textAlign: col.align || 'left',
                  }}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Metadata Display Component
 * Shows key-value pairs in a structured layout
 */
interface MetadataItem {
  label: string;
  value: string | number | React.ReactNode;
}

interface MetadataDisplayProps {
  items: MetadataItem[];
  columns?: number;
}

export const MetadataDisplay: React.FC<MetadataDisplayProps> = ({ items, columns = 4 }) => {
  return (
    <div
      className="template-metadata"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      }}
    >
      {items.map((item, idx) => (
        <div key={idx} className="template-metadata-item">
          <span className="template-metadata-label">{item.label}</span>
          <span className="template-metadata-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
};

export default UnifiedModuleLayout;
