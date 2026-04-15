/**
 * Report Builder Page
 * 
 * Drag-and-drop report designer with:
 * - Report templates browsing
 * - Custom report building
 * - Multi-source data integration
 * - Export and scheduling capabilities
 * - Report sharing and collaboration
 */

import React, { useState } from 'react';
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from '@/components/ModuleLayout';
import { Plus, Download, Share2, Clock, Trash2, Edit, Eye, FileBarChart } from 'lucide-react';
import { toast } from 'sonner';

type TabType = 'reports' | 'templates' | 'builder' | 'scheduled';

interface ReportConfig {
  name: string;
  category: string;
  dataSources: string[];
  format: 'PDF' | 'Excel' | 'CSV' | 'HTML';
  sections: string[];
}

// Template Card Component
const TemplateCard: React.FC<{
  template: any;
  onSelect: (templateId: string) => void;
}> = ({ template, onSelect }) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect(template.id)}>
      <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
      <div className="flex flex-wrap gap-1 mb-3">
        {template.dataSources.map((source: string) => (
          <span key={source} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
            {source}
          </span>
        ))}
      </div>
      <div className="text-xs text-gray-600">
        {template.sections.length} sections included
      </div>
    </div>
  );
};

// Report List Item
const ReportListItem: React.FC<{
  report: any;
  onView: (reportId: number) => void;
  onEdit: (reportId: number) => void;
  onDelete: (reportId: number) => void;
}> = ({ report, onView, onEdit, onDelete }) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-gray-900">{report.name}</h3>
          <p className="text-sm text-gray-600">{report.description}</p>
        </div>
        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">{report.category}</span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs text-gray-600 mb-3">
        <div>
          <div className="font-medium">Owner</div>
          {report.owner}
        </div>
        <div>
          <div className="font-medium">Format</div>
          {report.format}
        </div>
        <div>
          <div className="font-medium">Last Run</div>
          {new Date(report.lastRun).toLocaleDateString()}
        </div>
        <div>
          <div className="font-medium">Pages</div>
          {report.pageCount}
        </div>
      </div>

      <div className="flex gap-2 justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => onView(report.id)}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={() => onEdit(report.id)}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
        </div>
        <button
          onClick={() => onDelete(report.id)}
          className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>

      {report.nextRun && (
        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
          Next scheduled run: {new Date(report.nextRun).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

// Main Report Builder Page
export default function ReportBuilderPage() {
  const [activeTab, setActiveTab] = useState<TabType>('reports');
  const [selectedReport, setSelectedReport] = useState<number | null>(null);
  const [newReportConfig, setNewReportConfig] = useState<ReportConfig>({
    name: '',
    category: 'Financial',
    dataSources: [],
    format: 'PDF',
    sections: [],
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Queries
  const reportsQuery = trpc.reportBuilder.getReports.useQuery({});
  const templatesQuery = trpc.reportBuilder.getTemplates.useQuery({});
  const previewQuery = trpc.reportBuilder.getReportPreview.useQuery(
    { reportId: selectedReport! },
    { enabled: !!selectedReport }
  );

  // Mutations
  const createReportMutation = trpc.reportBuilder.createReport.useMutation({
    onSuccess: () => {
      reportsQuery.refetch();
      setNewReportConfig({
        name: '',
        category: 'Financial',
        dataSources: [],
        format: 'PDF',
        sections: [],
      });
    },
  });

  const exportMutation = trpc.reportBuilder.exportReport.useMutation();
  const scheduleMutation = trpc.reportBuilder.scheduleReport.useMutation();
  const deleteMutation = trpc.reportBuilder.deleteReport.useMutation({
    onSuccess: () => reportsQuery.refetch(),
  });
  const generateFromTemplateMutation = trpc.reportBuilder.generateFromTemplate.useMutation({
    onSuccess: () => {
      reportsQuery.refetch();
      toast.success("Report generated from template");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleCreateReport = () => {
    if (newReportConfig.name && newReportConfig.dataSources.length > 0) {
      createReportMutation.mutate({
        ...newReportConfig,
        layout: {},
      });
    }
  };

  const handleExport = (format: 'PDF' | 'Excel' | 'CSV' | 'HTML') => {
    if (selectedReport) {
      exportMutation.mutate({ reportId: selectedReport, format });
    }
  };

  return (
    <ModuleLayout
      title="Report Builder"
      description="Create, customize, and manage business reports"
      icon={<FileBarChart className="h-6 w-6" />}
      breadcrumbs={[{label: "Dashboard", href: "/crm-home"}, {label: "Reports", href: "/reports"}, {label: "Report Builder"}]}
    >

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 flex-wrap">
        {(['reports', 'templates', 'builder', 'scheduled'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'reports' && 'My Reports'}
            {tab === 'templates' && 'Templates'}
            {tab === 'builder' && 'Create New'}
            {tab === 'scheduled' && 'Scheduled'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* My Reports */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {reportsQuery.data?.reports.map((report) => (
              <ReportListItem
                key={report.id}
                report={report}
                onView={(id) => setSelectedReport(id)}
                onEdit={() => setActiveTab('builder')}
                onDelete={(id) => deleteMutation.mutate({ reportId: id })}
              />
            ))}
          </div>
        )}

        {/* Templates */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templatesQuery.data?.templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={(templateId) => {
                  generateFromTemplateMutation.mutate({
                    templateId,
                    reportName: `Report from template ${templateId}`,
                  });
                }}
              />
            ))}
          </div>
        )}

        {/* Create New Report */}
        {activeTab === 'builder' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Builder Form */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Report</h2>

              <div className="space-y-4">
                {/* Report Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Name *
                  </label>
                  <input
                    type="text"
                    value={newReportConfig.name}
                    onChange={(e) =>
                      setNewReportConfig({ ...newReportConfig, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="e.g., Monthly Revenue Report"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={newReportConfig.category}
                    onChange={(e) =>
                      setNewReportConfig({ ...newReportConfig, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="Financial">Financial</option>
                    <option value="Sales">Sales</option>
                    <option value="HR">HR</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>

                {/* Data Sources */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Sources *
                  </label>
                  <div className="space-y-2">
                    {['GL', 'Invoices', 'Expenses', 'Payments', 'Employees'].map((source) => (
                      <label key={source} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newReportConfig.dataSources.includes(source)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewReportConfig({
                                ...newReportConfig,
                                dataSources: [...newReportConfig.dataSources, source],
                              });
                            } else {
                              setNewReportConfig({
                                ...newReportConfig,
                                dataSources: newReportConfig.dataSources.filter((s) => s !== source),
                              });
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{source}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Output Format *
                  </label>
                  <select
                    value={newReportConfig.format}
                    onChange={(e) =>
                      setNewReportConfig({
                        ...newReportConfig,
                        format: e.target.value as 'PDF' | 'Excel' | 'CSV' | 'HTML',
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="PDF">PDF</option>
                    <option value="Excel">Excel</option>
                    <option value="CSV">CSV</option>
                    <option value="HTML">HTML</option>
                  </select>
                </div>

                {/* Create Button */}
                <button
                  onClick={handleCreateReport}
                  disabled={!newReportConfig.name || newReportConfig.dataSources.length === 0}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Report
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Report Preview</h2>
              <div className="bg-gray-100 p-4 rounded-lg min-h-96 flex items-center justify-center text-gray-600">
                {newReportConfig.name ? (
                  <div className="text-center">
                    <div className="text-lg font-semibold mb-2">{newReportConfig.name}</div>
                    <div className="text-sm mb-4">Category: {newReportConfig.category}</div>
                    <div className="text-sm mb-4">
                      Data Sources: {newReportConfig.dataSources.join(', ') || 'None selected'}
                    </div>
                    <div className="text-sm">Format: {newReportConfig.format}</div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    Enter report details to see preview
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Scheduled Reports */}
        {activeTab === 'scheduled' && (
          <div className="space-y-4">
            {reportsQuery.data?.reports
              .filter((r) => r.nextRun)
              .map((report) => (
                <div key={report.id} className="bg-white p-4 rounded-lg border border-blue-200 bg-blue-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        {report.name}
                      </h3>
                      <div className="text-sm text-gray-600 mt-1">
                        Frequency: {report.frequency || 'Weekly'} | Next: {new Date(report.nextRun).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowScheduleModal(true)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Edit Schedule
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Selected Report Actions */}
      {selectedReport && (
        <div className="fixed bottom-6 right-6 bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Report Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => handleExport('PDF')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export as PDF
            </button>
            <button
              onClick={() => handleExport('Excel')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export as Excel
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share Report
            </button>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
            >
              <Clock className="w-4 h-4" />
              Schedule
            </button>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
