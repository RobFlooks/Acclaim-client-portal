import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Search, Upload, Calendar, User, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import CaseDetail from "./CaseDetail";

export default function Documents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [caseDetailsOpen, setCaseDetailsOpen] = useState(false);
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

  const filteredDocuments = documents?.filter((doc: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      doc.fileName.toLowerCase().includes(searchLower) ||
      doc.fileType?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ file, caseId }: { file: File; caseId: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("caseId", caseId);

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
      setSelectedCaseId("");
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

    uploadDocumentMutation.mutate({ file: selectedFile, caseId: selectedCaseId });
  };

  const handleCloseUploadDialog = () => {
    setUploadDialogOpen(false);
    setSelectedFile(null);
    setSelectedCaseId("");
  };

  const handleCaseClick = (caseId: number) => {
    const caseData = cases?.find((c: any) => c.id === caseId);
    if (caseData) {
      setSelectedCase(caseData);
      setCaseDetailsOpen(true);
    }
  };

  const getCaseDetails = (caseId: number) => {
    return cases?.find((c: any) => c.id === caseId);
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
      const caseId = doc.caseId || 'general';
      if (!acc[caseId]) {
        acc[caseId] = [];
      }
      acc[caseId].push(doc);
      return acc;
    }, {});
    return grouped;
  };

  const groupedDocuments = groupDocumentsByCase(filteredDocuments);

  return (
    <div className="space-y-6">
      {/* Search and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Document Library</CardTitle>
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-acclaim-teal hover:bg-acclaim-teal/90">
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
                            {caseItem.accountNumber} - {caseItem.debtorName}
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
                      <div className="mt-2 p-2 bg-gray-50 rounded flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFile(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
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
              placeholder="Search documents by name or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Document Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? "..." : documents?.length || 0}
                </p>
              </div>
              <FileText className="h-8 w-8 text-acclaim-teal" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">PDF Files</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? "..." : documents?.filter((d: any) => d.fileType?.includes('pdf')).length || 0}
                </p>
              </div>
              <FileText className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Word Documents</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? "..." : documents?.filter((d: any) => d.fileType?.includes('word') || d.fileType?.includes('document')).length || 0}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Other Files</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? "..." : documents?.filter((d: any) => !d.fileType?.includes('pdf') && !d.fileType?.includes('word') && !d.fileType?.includes('document')).length || 0}
                </p>
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>All Documents ({filteredDocuments.length})</CardTitle>
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
                      {caseId === 'general' ? 'General Documents' : (() => {
                        const caseDetails = getCaseDetails(parseInt(caseId));
                        return caseDetails ? `${caseDetails.accountNumber} - ${caseDetails.debtorName}` : 'Case Documents';
                      })()}
                    </Badge>
                    <span className="text-sm text-gray-500">({caseDocuments.length} files)</span>
                  </div>
                  
                  <div className="space-y-2">
                    {caseDocuments.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            {getFileIcon(doc.fileType)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{doc.fileName}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Calendar className="h-3 w-3 text-gray-400" />
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
                                  <div className="flex items-center space-x-2 mt-1">
                                    <User className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs text-gray-500">Case:</span>
                                    <button
                                      onClick={() => handleCaseClick(doc.caseId)}
                                      className="text-xs text-acclaim-teal hover:text-acclaim-teal/80 hover:underline font-medium"
                                    >
                                      {caseDetails.accountNumber}
                                    </button>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-500">{caseDetails.debtorName}</span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <p className="text-sm text-gray-600">{doc.fileType}</p>
                            {doc.uploadedBy && (
                              <div className="flex items-center space-x-1 mt-1">
                                <User className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">Uploaded by system</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(doc.id)}
                              className="text-acclaim-teal hover:text-acclaim-teal"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {user?.isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this document?")) {
                                    deleteDocumentMutation.mutate(doc.id);
                                  }
                                }}
                                className="text-red-600 hover:text-red-700"
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
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? "No documents match your search" : "No documents found"}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Documents will appear here once they are uploaded to your cases.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Case Details Popup */}
      {selectedCase && (
        <Dialog open={caseDetailsOpen} onOpenChange={setCaseDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Case Details</DialogTitle>
            </DialogHeader>
            <CaseDetail case={selectedCase} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
