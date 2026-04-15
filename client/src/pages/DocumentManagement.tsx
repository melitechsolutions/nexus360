import React, { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { ModuleLayout } from '@/components/ModuleLayout';
import {
  FileText, Upload, Download, Search, Trash2, Edit, Eye,
  Filter, MoreHorizontal, ScanLine, FileSpreadsheet, FilePlus,
  Archive, RefreshCw, Tags, X, Check, Clock,
} from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const DOC_TYPES = ['all', 'contract', 'agreement', 'proposal', 'template', 'invoice', 'receipt', 'other'] as const;
const STATUS_OPTIONS = ['active', 'archived', 'deleted'] as const;

const typeColors: Record<string, string> = {
  contract: "bg-blue-100 text-blue-700",
  agreement: "bg-green-100 text-green-700",
  proposal: "bg-purple-100 text-purple-700",
  template: "bg-amber-100 text-amber-700",
  invoice: "bg-orange-100 text-orange-700",
  receipt: "bg-emerald-100 text-emerald-700",
  other: "bg-slate-100 text-slate-700",
};

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

function timeAgo(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function DocumentManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState<string>('all');
  const [showUpload, setShowUpload] = useState(false);
  const [showOCR, setShowOCR] = useState(false);
  const [ocrDocId, setOcrDocId] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editDoc, setEditDoc] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('other');
  const [editStatus, setEditStatus] = useState('active');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [versionDocId, setVersionDocId] = useState<string | null>(null);

  // Upload form
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState<string>('other');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const queryInput = useMemo(() => ({
    documentType: activeType === 'all' ? undefined : activeType,
    limit: 100,
    search: searchQuery || undefined,
  }), [activeType, searchQuery]);

  const { data, isLoading, refetch } = trpc.fileStorage.listDocuments.useQuery(queryInput);

  const uploadMut = trpc.fileStorage.uploadDocument.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      setShowUpload(false);
      setUploadName('');
      setUploadType('other');
      setUploadTags('');
      setUploadFile(null);
      setUploadProgress('');
      refetch();
    },
    onError: (err) => {
      toast.error("Upload failed: " + err.message);
      setUploadProgress('');
    },
  });

  const updateMut = trpc.fileStorage.updateDocument.useMutation({
    onSuccess: () => {
      toast.success("Document updated");
      setShowEdit(false);
      refetch();
    },
    onError: (err) => toast.error("Update failed: " + err.message),
  });

  const deleteMut = trpc.fileStorage.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      setShowDeleteConfirm(false);
      setDeleteDocId(null);
      refetch();
    },
    onError: (err) => toast.error("Delete failed: " + err.message),
  });

  const ocrMut = trpc.fileStorage.performOCR.useMutation({
    onSuccess: (result) => {
      setOcrResult(result.extractedText || 'No text extracted. OCR processing completed with ' + (result.confidence * 100).toFixed(0) + '% confidence.');
      toast.success(`OCR Complete - ${(result.confidence * 100).toFixed(0)}% confidence`);
    },
    onError: (err) => toast.error("OCR failed: " + err.message),
  });

  const { data: versionsData } = trpc.fileStorage.getDocumentVersions.useQuery(
    { documentId: versionDocId || '' },
    { enabled: !!versionDocId }
  );

  const docs = data?.documents || [];
  const totalDocs = data?.total ?? 0;
  const totalSize = data?.totalSize ?? 0;
  const activeDocs = docs.filter((d: any) => d.status === 'active').length;
  const archivedDocs = docs.filter((d: any) => d.status === 'archived').length;

  const handleUpload = () => {
    if (!uploadFile) {
      toast.error("Please select a file to upload");
      return;
    }
    if (!uploadName.trim()) {
      toast.error("Document name is required");
      return;
    }
    if (uploadFile.size > 25 * 1024 * 1024) {
      toast.error("File size exceeds 25MB limit");
      return;
    }

    setUploadProgress('Reading file...');
    const reader = new FileReader();
    reader.onload = () => {
      setUploadProgress('Uploading...');
      const base64Data = reader.result as string;
      uploadMut.mutate({
        name: uploadName,
        mimeType: uploadFile.type || 'application/octet-stream',
        size: uploadFile.size,
        fileData: base64Data,
        documentType: uploadType as any,
        tags: uploadTags ? uploadTags.split(',').map(t => t.trim()) : [],
      });
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
      setUploadProgress('');
    };
    reader.readAsDataURL(uploadFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadName.trim()) {
        setUploadName(file.name);
      }
    }
  };

  const handleEdit = (doc: any) => {
    setEditDoc(doc);
    setEditName(doc.documentName);
    setEditType(doc.documentType || 'other');
    setEditStatus(doc.status || 'active');
    setShowEdit(true);
  };

  const submitEdit = () => {
    if (!editDoc) return;
    updateMut.mutate({
      documentId: editDoc.id,
      name: editName,
      documentType: editType as any,
      status: editStatus as any,
    });
  };

  const handleDelete = (id: string) => {
    setDeleteDocId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deleteDocId) deleteMut.mutate({ documentId: deleteDocId });
  };

  const handleOCR = (docId: string) => {
    setOcrDocId(docId);
    setOcrResult(null);
    setShowOCR(true);
    ocrMut.mutate({ documentId: docId });
  };

  const handleViewVersions = (docId: string) => {
    setVersionDocId(docId);
    setShowVersions(true);
  };

  return (
    <ModuleLayout
      title="Document Management"
      description="Upload, organize, search and manage all your documents"
      icon={<FileText className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Documents" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:text-white" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" className="bg-white text-orange-600 hover:bg-white/90" onClick={() => setShowUpload(true)}>
            <FilePlus className="w-4 h-4 mr-1" /> Upload Document
          </Button>
        </div>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Documents</p>
              <p className="text-xl font-bold">{totalDocs}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-xl font-bold">{activeDocs}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Archive className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Archived</p>
              <p className="text-xl font-bold">{archivedDocs}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Size</p>
              <p className="text-xl font-bold">{formatBytes(totalSize)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filter bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by document name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={activeType} onValueChange={setActiveType} className="w-auto">
              <TabsList className="h-9">
                {DOC_TYPES.map(t => (
                  <TabsTrigger key={t} value={t} className="text-xs capitalize px-3">
                    {t === 'all' ? 'All' : t}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" /> Documents
            <Badge variant="secondary" className="ml-2">{totalDocs}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading documents...</div>
          ) : docs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No documents found</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowUpload(true)}>
                <Upload className="w-4 h-4 mr-1" /> Upload your first document
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Size</TableHead>
                    <TableHead className="font-semibold">Version</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Modified</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((doc: any) => (
                    <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[200px]">
                          <FileText className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{doc.documentName}</p>
                            {doc.tags && doc.tags.length > 0 && (
                              <div className="flex gap-1 mt-0.5">
                                {doc.tags.slice(0, 3).map((tag: string, i: number) => (
                                  <span key={i} className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={typeColors[doc.documentType || 'other']}>
                          {doc.documentType || 'other'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatBytes(doc.fileSize || 0)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">v{doc.currentVersion || 1}</TableCell>
                      <TableCell>
                        <Badge variant={doc.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                          {doc.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(doc.updatedAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewVersions(doc.id)}>
                              <Eye className="w-4 h-4 mr-2" /> View Versions
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(doc)}>
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOCR(doc.id)}>
                              <ScanLine className="w-4 h-4 mr-2" /> Run OCR
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              if (doc.fileUrl && doc.fileUrl !== '/uploads/') {
                                const a = document.createElement('a');
                                a.href = doc.fileUrl;
                                a.download = doc.documentName || 'download';
                                a.target = '_blank';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              } else {
                                toast.error("No file available for download");
                              }
                            }}>
                              <Download className="w-4 h-4 mr-2" /> Download
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(doc.id)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={(open) => { setShowUpload(open); if (!open) { setUploadFile(null); setUploadProgress(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Upload Document</DialogTitle>
            <DialogDescription>Select a file and add metadata to upload</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">File *</label>
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-colors"
                onClick={() => document.getElementById('file-upload-input')?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    setUploadFile(file);
                    if (!uploadName.trim()) setUploadName(file.name);
                  }
                }}
              >
                <input
                  id="file-upload-input"
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp,.zip,.json,.xml"
                />
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-8 h-8 text-orange-500" />
                    <div className="text-left">
                      <p className="text-sm font-medium">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(uploadFile.size)}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="ml-2" onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to select or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, Images up to 25MB</p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Document Name *</label>
              <Input placeholder="e.g. Invoice_2025_Q1.pdf" value={uploadName} onChange={(e) => setUploadName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Document Type</label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.filter(t => t !== 'all').map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tags (comma-separated)</label>
              <Input placeholder="e.g. finance, 2025, quarterly" value={uploadTags} onChange={(e) => setUploadTags(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploadMut.isPending || !uploadFile}>
              {uploadMut.isPending ? (uploadProgress || 'Uploading...') : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit className="w-5 h-5" /> Edit Document</DialogTitle>
            <DialogDescription>Update document information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Document Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Document Type</label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.filter(t => t !== 'all').map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={submitEdit} disabled={updateMut.isPending}>
              {updateMut.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="w-5 h-5" /> Delete Document</DialogTitle>
            <DialogDescription>Are you sure you want to permanently delete this document? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OCR Dialog */}
      <Dialog open={showOCR} onOpenChange={(open) => { setShowOCR(open); if (!open) setOcrResult(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ScanLine className="w-5 h-5" /> OCR Processing</DialogTitle>
            <DialogDescription>Extract text from this document using optical character recognition</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {ocrMut.isPending ? (
              <div className="flex items-center justify-center py-8 gap-3 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin" /> Processing document...
              </div>
            ) : ocrResult ? (
              <div className="bg-muted rounded-lg p-4 max-h-[300px] overflow-y-auto">
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Check className="w-4 h-4 text-green-500" /> Extracted Text
                </p>
                <p className="text-sm whitespace-pre-wrap">{ocrResult}</p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowOCR(false); setOcrResult(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Versions Dialog */}
      <Dialog open={showVersions} onOpenChange={(open) => { setShowVersions(open); if (!open) setVersionDocId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Version History</DialogTitle>
            <DialogDescription>View all versions of this document</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {versionsData?.versions && versionsData.versions.length > 0 ? (
              versionsData.versions.map((v: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Version {v.version}</p>
                    <p className="text-xs text-muted-foreground">
                      By {v.uploadedBy} · {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <Badge variant="secondary">{formatBytes(v.size || 0)}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No version history available</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowVersions(false); setVersionDocId(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}

export default DocumentManagement;
