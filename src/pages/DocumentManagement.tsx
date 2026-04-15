import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { trpc } from '../utils/trpc';
import { FileText, Upload, Share2, Download, Search } from 'lucide-react';

/**
 * Document Management Page (Phase 5.5)
 * 
 * File storage and document management including:
 * - Document listing and browsing
 * - File upload
 * - Version control
 * - OCR capabilities
 * - Document search
 * - Sharing management
 */

export function DocumentManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const { data: documents } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const result = await trpc.fileStorage.listDocuments.query({
        sortBy: 'date',
      });
      return result;
    },
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    // Trigger search query
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="p-8 space-y-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <FileText className="w-8 h-8 text-orange-600" />
          <h1 className="text-3xl font-bold text-slate-900">Document Management</h1>
        </div>

        {/* Search & Actions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
          <form onSubmit={handleSearch} className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition text-sm font-medium"
            >
              Search
            </button>
          </form>

          <div className="flex gap-3">
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-sm font-medium">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          {/* Upload Form */}
          {showUpload && (
            <div className="mt-6 p-4 bg-slate-50 rounded-lg border-2 border-dashed border-orange-300">
              <div className="space-y-4">
                <input
                  type="file"
                  multiple
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium">
                    Upload Files
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUpload(false)}
                    className="flex-1 px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Documents List */}
        {documents && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 text-center">
                <p className="text-slate-600 text-sm mb-1">Total Documents</p>
                <p className="text-2xl font-bold text-slate-900">{documents.documents.length}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 text-center">
                <p className="text-slate-600 text-sm mb-1">Total Size</p>
                <p className="text-2xl font-bold text-slate-900">{formatBytes(documents.totalSize)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 text-center">
                <p className="text-slate-600 text-sm mb-1">Recent Activity</p>
                <p className="text-2xl font-bold text-slate-900">Today</p>
              </div>
            </div>

            {/* Document Table */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Size</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Versions</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Owner</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Modified</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {documents.documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-orange-600" />
                            <span className="text-sm font-medium text-slate-900">{doc.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatBytes(doc.size)}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{doc.versions}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{doc.owner}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button className="text-xs font-medium text-orange-600 hover:text-orange-700">
                              Download
                            </button>
                            <button className="text-xs font-medium text-slate-600 hover:text-slate-700">
                              Versions
                            </button>
                            {doc.shared && (
                              <button className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                                <Share2 className="w-3 h-3" />
                                Shared
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* OCR Processing */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mt-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Document OCR Processing</h2>
          <p className="text-sm text-slate-600 mb-4">
            Automatically extract and index text from PDF and image documents for full-text search
          </p>
          <div className="space-y-3">
            <div className="p-4 bg-slate-50 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">Invoice_2025_01.pdf</p>
                <p className="text-xs text-slate-500">PDF • 2 MB</p>
              </div>
              <button className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition">
                Process with OCR
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mt-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-700"><strong>Invoice_2025_01.pdf</strong> uploaded</span>
              <span className="text-slate-500">5 minutes ago</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-700"><strong>Contract_Template.docx</strong> shared with 3 users</span>
              <span className="text-slate-500">2 days ago</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-700"><strong>Payment_Record_Jan.xlsx</strong> version 2 created</span>
              <span className="text-slate-500">1 week ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
