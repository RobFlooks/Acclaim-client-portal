import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Search, Upload, Calendar, User, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import CaseDetail from "./CaseDetail";

export default function Documents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [notifyOnUpload, setNotifyOnUpload] = useState(true);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [caseDetailsOpen, setCaseDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const documentsPerPage = 20;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: documents, isLoading } = useQuery({
    queryKey: ["/api/documents"],
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    },
  });

  const { data: cases } = useQuery({
    queryKey: ["/api/cases"],
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });

  const getCaseDetails = (caseId: number) => {
    return cases?.find((c: any) => c.id === caseId);
  };

  const filteredDocuments = documents?.filter((doc: any) => {
    const searchLower = searchTerm.toLowerCase();
    
    // Handle nested document structure
    const docData = doc.documents || doc;
    
    // Exclude documents without a caseId (general documents)
    if (!docData.caseId) {
      return false;
    }
    
    const caseDetails = getCaseDetails(docData.caseId);
    
    return (
      (docData.fileName && docData.fileName.toLowerCase().includes(searchLower)) ||
      (docData.fileType && docData.fileType.toLowerCase().includes(searchLower)) ||
      (caseDetails && caseDetails.accountNumber && caseDetails.accountNumber.toLowerCase().includes(searchLower)) ||
      (caseDetails && caseDetails.caseName && caseDetails.caseName.toLowerCase().includes(searchLower)) ||
      (caseDetails && caseDetails.organisationName && caseDetails.organisationName.toLowerCase().includes(searchLower))
    );
  }) || [];

  // Pagination calculations
  const totalPages = Math.ceil(filteredDocuments.length / documentsPerPage);
  const startIndex = (currentPage - 1) * documentsPerPage;
  const endIndex = startIndex + documentsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);

  // Reset pagination when search changes
  const resetPagination = () => {
    setCurrentPage(1);
  };

  useEffect(() => {
    resetPagination();
  }, [searchTerm]);

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ file, caseId, notify, fileName }: { file: File; caseId: string; notify: boolean; fileName: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("caseId", caseId);
      if (fileName && fileName.trim()) {
        formData.append("customFileName", fileName.trim());
      }
      // Admin uploads notify users, regular users notify admin
      if (user?.isAdmin) {
        formData.append("notifyUsers", notify.toString());
      } else {
        formData.append("notifyAdmin", notify.toString());
      }

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setSelectedFile(null);
      setCustomFileName("");
      setSelectedCaseId("");
      setNotifyOnUpload(true);
      setUploadDialogOpen(false);
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      await apiRequest("DELETE", `/api/admin/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  const handleDownload = (documentId: number) => {
    window.open(`/api/documents/${documentId}/download`, '_blank');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCustomFileName("");
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !selectedCaseId) {
      toast({
        title: "Error",
        description: "Please select a file and case before uploading",
        variant: "destructive",
      });
      return;
    }

    // Build final filename with original extension
    const ext = selectedFile.name.split('.').pop();
    const finalFileName = customFileName.trim() ? `${customFileName.trim()}.${ext}` : selectedFile.name;
    uploadDocumentMutation.mutate({ file: selectedFile, caseId: selectedCaseId, notify: notifyOnUpload, fileName: finalFileName });
  };

  const handleCloseUploadDialog = () => {
    setUploadDialogOpen(false);
    setSelectedFile(null);
    setCustomFileName("");
    setSelectedCaseId("");
    setNotifyOnUpload(true);
  };

  const handleCaseClick = (caseId: number) => {
    const caseData = cases?.find((c: any) => c.id === caseId);
    if (caseData) {
      setSelectedCase(caseData);
      setCaseDetailsOpen(true);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType?.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    if (fileType?.includes('word') || fileType?.includes('document')) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    }
    if (fileType?.includes('image')) {
      return <FileText className="h-5 w-5 text-green-500" />;
    }
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  const groupDocumentsByCase = (docs: any[]) => {
    const grouped = docs.reduce((acc: any, doc: any) => {
      const docData = doc.documents || doc;
      // Only include documents that have a caseId (exclude general documents)
      if (!docData.caseId) {
        return acc;
      }
      const caseId = docData.caseId;
      if (!acc[caseId]) {
        acc[caseId] = [];
      }
      acc[caseId].push(docData);
      return acc;
    }, {});
    return grouped;
  };

  const groupedDocuments = groupDocumentsByCase(paginatedDocuments);

  return (
    <div className="space-y-6">
      {/* Search and Actions */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg sm:text-xl">Document Library</CardTitle>
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-acclaim-teal hover:bg-acclaim-teal/90 w-full sm:w-auto" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="case-select">Select Case</Label>
                    <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a case..." />
                      </SelectTrigger>
                      <SelectContent>
                        {cases?.map((caseItem: any) => (
                          <SelectItem key={caseItem.id} value={caseItem.id.toString()}>
                            {caseItem.accountNumber} - {caseItem.caseName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="file-input">Select Document</Label>
                    <Input
                      id="file-input"
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.csv,.xlsx,.xls"
                      className="mt-2"
                    />
                    {selectedFile && (
                      <div className="mt-2 space-y-2">
                        <div className="p-2 bg-gray-50 rounded flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedFile(null); setCustomFileName(""); }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div>
                          <Label htmlFor="custom-filename" className="text-sm">Rename file (optional)</Label>
                          <div className="flex items-center gap-1 mt-1">
                            <Input
                              id="custom-filename"
                              type="text"
                              value={customFileName}
                              onChange={(e) => setCustomFileName(e.target.value)}
                              placeholder="Enter new filename"
                              className="flex-1"
                            />
                            <span className="text-sm text-gray-500">.{selectedFile.name.split('.').pop()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notify-upload"
                      checked={notifyOnUpload}
                      onCheckedChange={(checked) => setNotifyOnUpload(checked === true)}
                    />
                    <Label htmlFor="notify-upload" className="text-sm cursor-pointer">
                      {user?.isAdmin ? "Notify users" : "Notify admin"}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={handleUpload}
                      disabled={uploadDocumentMutation.isPending || !selectedFile || !selectedCaseId}
                      className="bg-acclaim-teal hover:bg-acclaim-teal/90"
                    >
                      {uploadDocumentMutation.isPending ? "Uploading..." : "Upload Document"}
                    </Button>
                    <Button variant="outline" onClick={handleCloseUploadDialog}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by filename, case or organisation..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                resetPagination();
              }}
              className="pl-10 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Document Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Total</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {isLoading ? "..." : documents?.length || 0}
                </p>
              </div>
              <FileText className="h-5 w-5 sm:h-8 sm:w-8 text-acclaim-teal hidden sm:block" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">PDF</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {isLoading ? "..." : documents?.filter((d: any) => {
                    const docData = d.documents || d;
                    return docData.fileType?.includes('pdf');
                  }).length || 0}
                </p>
              </div>
              <FileText className="h-5 w-5 sm:h-8 sm:w-8 text-red-500 hidden sm:block" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Word</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {isLoading ? "..." : documents?.filter((d: any) => {
                    const docData = d.documents || d;
                    return docData.fileType?.includes('word') || docData.fileType?.includes('document');
                  }).length || 0}
                </p>
              </div>
              <FileText className="h-5 w-5 sm:h-8 sm:w-8 text-blue-500 hidden sm:block" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Other</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {isLoading ? "..." : documents?.filter((d: any) => {
                    const docData = d.documents || d;
                    return !docData.fileType?.includes('pdf') && !docData.fileType?.includes('word') && !docData.fileType?.includes('document');
                  }).length || 0}
                </p>
              </div>
              <FileText className="h-5 w-5 sm:h-8 sm:w-8 text-green-500 hidden sm:block" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <CardTitle className="text-base sm:text-lg">
              All Documents ({filteredDocuments.length})
            </CardTitle>
            {filteredDocuments.length > documentsPerPage && (
              <span className="text-xs sm:text-sm text-gray-500 font-normal">
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : Object.keys(groupedDocuments).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedDocuments).map(([caseId, caseDocuments]: [string, any]) => (
                <div key={caseId} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-acclaim-teal border-acclaim-teal">
                      {(() => {
                        const caseDetails = getCaseDetails(parseInt(caseId));
                        return caseDetails ? `${caseDetails.accountNumber} - ${caseDetails.caseName}` : 'Case Documents';
                      })()}
                    </Badge>
                    <span className="text-sm text-gray-500">({caseDocuments.length} files)</span>
                  </div>
                  
                  <div className="space-y-2">
                    {caseDocuments.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border gap-2 sm:gap-4"
                      >
                        <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                          <div className="flex-shrink-0 mt-0.5 sm:mt-0">
                            {getFileIcon(doc.fileType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{doc.fileName}</p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                              <span className="text-xs text-gray-500">{formatDate(doc.createdAt)}</span>
                              {doc.fileSize && (
                                <>
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-gray-500">{formatFileSize(doc.fileSize)}</span>
                                </>
                              )}
                            </div>
                            {doc.caseId && (() => {
                              const caseDetails = getCaseDetails(doc.caseId);
                              if (caseDetails) {
                                return (
                                  <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 mt-1">
                                    <span className="text-xs text-gray-500">Case:</span>
                                    <button
                                      onClick={() => handleCaseClick(doc.caseId)}
                                      className="text-xs text-acclaim-teal hover:text-acclaim-teal/80 hover:underline font-medium"
                                    >
                                      {caseDetails.accountNumber}
                                    </button>
                                    {caseDetails.organisationName && (
                                      <span className="text-xs text-gray-500">
                                        ({caseDetails.organisationName})
                                      </span>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 pl-8 sm:pl-0">
                          <div className="text-left sm:text-right hidden sm:block">
                            <p className="text-xs sm:text-sm text-gray-600">{doc.fileType}</p>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(doc.id)}
                              className="text-acclaim-teal hover:text-acclaim-teal h-8 px-2 sm:px-3"
                            >
                              <Download className="h-4 w-4" />
                              <span className="ml-1 text-xs sm:hidden">Download</span>
                            </Button>
                            {user?.isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this document?")) {
                                    deleteDocumentMutation.mutate(doc.id);
                                  }
                                }}
                                className="text-red-600 hover:text-red-700 h-8 px-2"
                                disabled={deleteDocumentMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <p className="text-gray-500 text-sm sm:text-base">
                {searchTerm ? "No documents match your search" : "No documents found"}
              </p>
              <p className="text-xs sm:text-sm text-gray-400 mt-2">
                Documents will appear here once uploaded.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {filteredDocuments.length > documentsPerPage && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredDocuments.length)} of {filteredDocuments.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2 sm:px-3"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Previous</span>
            </Button>
            <span className="text-xs sm:text-sm text-gray-600 px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-2 sm:px-3"
            >
              <span className="hidden sm:inline mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Case Details Popup */}
      {selectedCase && (
        <Dialog open={caseDetailsOpen} onOpenChange={setCaseDetailsOpen}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto w-[95vw]">
            <DialogHeader>
              <DialogTitle>Case Details</DialogTitle>
              <DialogDescription>
                View comprehensive case information including timeline, documents, and messages.
              </DialogDescription>
            </DialogHeader>
            <CaseDetail case={selectedCase} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
