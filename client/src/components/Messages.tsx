import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Send, MessageSquare, Plus, User, Paperclip, Download, Trash2, Search, Filter, Calendar, X, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import CaseDetail from "./CaseDetail";

export default function Messages() {
  const [newMessage, setNewMessage] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [viewingMessage, setViewingMessage] = useState<any>(null);
  const [messageViewOpen, setMessageViewOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [linkedCaseId, setLinkedCaseId] = useState<string>("");
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");
  const [searchSender, setSearchSender] = useState("");
  const [searchCaseId, setSearchCaseId] = useState("");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const messagesPerPage = 20; // Show 20 messages per page

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["/api/messages"],
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
        description: "Failed to load messages",
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

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const formData = new FormData();
      formData.append("recipientType", messageData.recipientType);
      formData.append("recipientId", messageData.recipientId);
      formData.append("subject", messageData.subject);
      formData.append("content", messageData.content);
      
      if (messageData.caseId) {
        formData.append("caseId", messageData.caseId);
      }
      
      if (selectedFile) {
        formData.append("attachment", selectedFile);
      }

      const response = await fetch("/api/messages", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      // Also invalidate documents cache since attachments are now saved as documents
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      setNewMessage("");
      setNewSubject("");
      setSelectedFile(null);
      setLinkedCaseId("");
      setDialogOpen(false);
      toast({
        title: "Success",
        description: "Message sent successfully",
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
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      await apiRequest("DELETE", `/api/admin/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Success",
        description: "Message deleted successfully",
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
        description: "Failed to delete message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !newSubject.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both subject and message",
        variant: "destructive",
      });
      return;
    }

    let messageContent = newMessage;
    
    // If this is a reply, include the original message
    if (replyingTo) {
      const fromName = replyingTo.senderName || replyingTo.senderEmail || replyingTo.senderId;
      messageContent = `${newMessage}\n\n--- Original Message ---\nFrom: ${fromName}\nDate: ${formatDate(replyingTo.createdAt)}\nSubject: ${replyingTo.subject}\n\n${replyingTo.content}`;
    }

    sendMessageMutation.mutate({
      recipientType: "organisation",
      recipientId: "support",
      subject: newSubject,
      content: messageContent,
      caseId: linkedCaseId && linkedCaseId !== "none" ? linkedCaseId : undefined,
    });
  };

  const handleReply = (message: any) => {
    setReplyingTo(message);
    setNewSubject(`Re: ${message.subject}`);
    setNewMessage("");
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setReplyingTo(null);
    setNewMessage("");
    setNewSubject("");
    setSelectedFile(null);
    setLinkedCaseId("");
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      handleCloseDialog();
    }
  };

  const handleMessageClick = (message: any) => {
    setViewingMessage(message);
    setMessageViewOpen(true);
  };

  const handleCloseMessageView = () => {
    setMessageViewOpen(false);
    setViewingMessage(null);
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

  const getCaseAccountNumber = (caseId: number) => {
    const caseData = cases?.find((c: any) => c.id === caseId);
    return caseData?.accountNumber || `Case #${caseId}`;
  };

  const handleCaseClick = (caseId: number) => {
    const caseData = cases?.find((c: any) => c.id === caseId);
    if (caseData) {
      handleCloseMessageView();
      // Set the selected case and open the case detail dialog
      setSelectedCase(caseData);
      setCaseDialogOpen(true);
    }
  };

  const totalMessages = messages?.length || 0;

  // Filter messages based on search criteria
  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    
    return messages.filter((message: any) => {
      // Text search in subject, content, and organisation
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        // Get case data to check organisation name
        const caseData = message.caseId ? cases?.find((c: any) => c.id === message.caseId) : null;
        const matchesText = 
          message.subject?.toLowerCase().includes(searchLower) ||
          message.content?.toLowerCase().includes(searchLower) ||
          caseData?.organisationName?.toLowerCase().includes(searchLower) ||
          caseData?.caseName?.toLowerCase().includes(searchLower);
        if (!matchesText) return false;
      }
      
      // Date range filter
      if (searchDateFrom) {
        const messageDate = new Date(message.createdAt);
        const fromDate = new Date(searchDateFrom);
        if (messageDate < fromDate) return false;
      }
      
      if (searchDateTo) {
        const messageDate = new Date(message.createdAt);
        const toDate = new Date(searchDateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (messageDate > toDate) return false;
      }
      
      // Sender filter
      if (searchSender) {
        const senderLower = searchSender.toLowerCase();
        const matchesSender = 
          message.senderName?.toLowerCase().includes(senderLower) ||
          message.senderEmail?.toLowerCase().includes(senderLower);
        if (!matchesSender) return false;
      }
      
      // Case ID filter
      if (searchCaseId) {
        const caseSearchTerm = searchCaseId.toLowerCase();
        if (message.caseId) {
          const caseData = cases?.find((c: any) => c.id === message.caseId);
          const matchesCase = 
            caseData?.accountNumber?.toLowerCase().includes(caseSearchTerm) ||
            caseData?.caseName?.toLowerCase().includes(caseSearchTerm) ||
            message.caseId.toString().includes(caseSearchTerm);
          if (!matchesCase) return false;
        } else {
          return false; // No case associated with this message
        }
      }
      
      return true;
    });
  }, [messages, searchTerm, searchDateFrom, searchDateTo, searchSender, searchCaseId, cases]);

  // Pagination logic
  const totalPages = Math.ceil(filteredMessages.length / messagesPerPage);
  const startIndex = (currentPage - 1) * messagesPerPage;
  const endIndex = startIndex + messagesPerPage;
  const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

  // Reset to first page when filters change
  const resetPagination = () => {
    setCurrentPage(1);
  };

  // Clear all search filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setSearchDateFrom("");
    setSearchDateTo("");
    setSearchSender("");
    setSearchCaseId("");
    resetPagination();
  };

  // Export messages state
  const [isExporting, setIsExporting] = useState(false);

  // Export messages to Excel
  const handleExportMessages = async () => {
    if (!searchDateFrom && !searchDateTo) {
      toast({
        title: "Date Range Required",
        description: "Please select at least a 'Date From' or 'Date To' to export messages.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (searchDateFrom) params.append('from', searchDateFrom);
      if (searchDateTo) params.append('to', searchDateTo);

      const response = await fetch(`/api/messages/export?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to export messages');
      }

      // Get the blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'Messages_Export.xlsx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Complete",
        description: "Messages have been exported to Excel successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export messages",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Search and New Message Button */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-lg sm:text-xl">Messages</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className="flex-1 sm:flex-none border-acclaim-teal text-acclaim-teal hover:bg-acclaim-teal hover:text-white text-xs sm:text-sm h-9"
              >
                <Filter className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{showAdvancedSearch ? "Hide Filters" : "Show Filters"}</span>
                <span className="sm:hidden ml-1">Filter</span>
              </Button>
              <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogTrigger asChild>
                  <Button className="flex-1 sm:flex-none bg-acclaim-teal hover:bg-acclaim-teal/90 text-xs sm:text-sm h-9">
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">New Message</span>
                    <span className="sm:hidden ml-1">New</span>
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {replyingTo ? `Reply to: ${replyingTo.subject}` : "Send New Message"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Enter message subject"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                    />
                  </div>
                  {replyingTo && (
                    <div className="p-3 bg-gray-50 rounded border-l-4 border-acclaim-teal">
                      <p className="text-sm font-medium text-gray-700 mb-1">Original Message:</p>
                      <p className="text-sm text-gray-600">{replyingTo.content}</p>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Type your message here..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={6}
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedCase">Link to Case (optional)</Label>
                    <Select value={linkedCaseId} onValueChange={setLinkedCaseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a case to link this message to..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No case (general message)</SelectItem>
                        {cases?.map((c: any) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.accountNumber} - {c.caseName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {linkedCaseId && linkedCaseId !== "none" && (
                      <p className="text-sm text-gray-600 mt-1">
                        Message will be stored against the selected case
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="attachment">Attachment (optional)</Label>
                    <Input
                      id="attachment"
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar,.xls,.xlsx,.csv"
                    />
                    {selectedFile && (
                      <p className="text-sm text-gray-600 mt-1">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || !newSubject.trim() || sendMessageMutation.isPending}
                    className="w-full bg-acclaim-teal hover:bg-acclaim-teal/90"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search Panel */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          {/* Basic Search */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by subject, content, case or organisation..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    resetPagination();
                  }}
                  className="pl-10 h-9 sm:h-10 text-sm"
                />
              </div>
              {(searchTerm || searchDateFrom || searchDateTo || searchSender || searchCaseId) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-gray-500 hover:text-gray-700 h-9 px-2 sm:px-3"
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Clear</span>
                </Button>
              )}
            </div>

            {/* Advanced Search */}
            {showAdvancedSearch && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label htmlFor="dateFrom" className="text-xs sm:text-sm">From</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={searchDateFrom}
                      onChange={(e) => {
                        setSearchDateFrom(e.target.value);
                        resetPagination();
                      }}
                      className="mt-1 h-9 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateTo" className="text-xs sm:text-sm">To</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={searchDateTo}
                      onChange={(e) => {
                        setSearchDateTo(e.target.value);
                        resetPagination();
                      }}
                      className="mt-1 h-9 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sender" className="text-xs sm:text-sm">Sender</Label>
                    <Input
                      id="sender"
                      placeholder="Name/email..."
                      value={searchSender}
                      onChange={(e) => {
                        setSearchSender(e.target.value);
                        resetPagination();
                      }}
                      className="mt-1 h-9 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="caseSearch" className="text-xs sm:text-sm">Case</Label>
                    <Input
                      id="caseSearch"
                      placeholder="Case #/name..."
                      value={searchCaseId}
                      onChange={(e) => {
                        setSearchCaseId(e.target.value);
                        resetPagination();
                      }}
                      className="mt-1 h-9 text-xs sm:text-sm"
                    />
                  </div>
                </div>
                
                {/* Export to Excel Button */}
                <div className="flex items-center justify-end p-3 sm:p-4 bg-gray-50 rounded-lg border-t border-gray-200">
                  <Button
                    onClick={handleExportMessages}
                    disabled={isExporting || (!searchDateFrom && !searchDateTo)}
                    variant="outline"
                    className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 text-xs sm:text-sm h-9"
                    title={(!searchDateFrom && !searchDateTo) 
                      ? "Select a date range to enable export" 
                      : "Export messages within the selected date range to Excel"
                    }
                  >
                    <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{isExporting ? "Exporting..." : "Export to Excel"}</span>
                    <span className="sm:hidden ml-1">XLS</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Search Results Summary with Pagination Info */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-xs sm:text-sm text-gray-600">
              <span className="text-center sm:text-left">
                {startIndex + 1}-{Math.min(endIndex, filteredMessages.length)} of {filteredMessages.length}
                <span className="hidden sm:inline"> messages</span>
                {filteredMessages.length !== totalMessages && <span className="hidden sm:inline"> (filtered from {totalMessages})</span>}
              </span>
              {totalPages > 1 && (
                <span className="text-accent-foreground">
                  Page {currentPage}/{totalPages}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message View Dialog */}
      <Dialog open={messageViewOpen} onOpenChange={handleCloseMessageView}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {viewingMessage?.subject}
            </DialogTitle>
          </DialogHeader>
          {viewingMessage && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-acclaim-teal bg-opacity-10 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-acclaim-teal" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">
                          {viewingMessage.senderName || viewingMessage.senderEmail || 'Unknown'}
                        </p>
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                          {viewingMessage.senderIsAdmin ? "Acclaim" : (viewingMessage.senderOrganisationName || "User")}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatDate(viewingMessage.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleCloseMessageView();
                        handleReply(viewingMessage);
                      }}
                      className="text-acclaim-teal border-acclaim-teal hover:bg-acclaim-teal hover:text-white"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Reply
                    </Button>
                    {user?.isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this message?")) {
                            deleteMessageMutation.mutate(viewingMessage.id);
                            handleCloseMessageView();
                          }
                        }}
                        className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                        disabled={deleteMessageMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deleteMessageMutation.isPending ? "Deleting..." : "Delete"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700">
                  {viewingMessage.content}
                </div>
              </div>
              {viewingMessage.attachmentFileName && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Paperclip className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {viewingMessage.attachmentFileName}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({(viewingMessage.attachmentFileSize / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        window.open(`/api/messages/${viewingMessage.id}/download`, '_blank');
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              )}
              {viewingMessage.caseId && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Related to case:</span>{" "}
                    <button
                      onClick={() => handleCaseClick(viewingMessage.caseId)}
                      className="text-acclaim-teal hover:text-acclaim-teal/80 font-medium underline cursor-pointer"
                    >
                      {getCaseAccountNumber(viewingMessage.caseId)}
                    </button>
                    {(() => {
                      const caseData = cases?.find((c: any) => c.id === viewingMessage.caseId);
                      return caseData?.caseName ? (
                        <span className="text-gray-500 ml-2">
                          - {caseData.caseName}
                        </span>
                      ) : null;
                    })()}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Messages List */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">
            All Messages ({filteredMessages.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 sm:h-20 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : paginatedMessages && paginatedMessages.length > 0 ? (
            <div className="space-y-3">
              {paginatedMessages.map((message: any) => (
                <div
                  key={message.id}
                  className="p-3 sm:p-4 rounded-lg border transition-colors cursor-pointer hover:shadow-md bg-gray-50 border-gray-200 hover:bg-gray-100"
                  onClick={() => handleMessageClick(message)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="relative flex-shrink-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-acclaim-teal bg-opacity-10 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 sm:h-5 sm:w-5 text-acclaim-teal" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate mb-1">{message.subject}</p>
                        <div className="mb-2">
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                            <p className="text-xs text-gray-500 truncate">
                              <span className="hidden sm:inline">From: </span>
                              <span className="font-medium">{message.senderName || message.senderEmail || 'Unknown'}</span>
                            </p>
                            <Badge variant="secondary" className="text-[10px] sm:text-xs bg-blue-100 text-blue-800 px-1.5 py-0">
                              {message.senderIsAdmin ? "Acclaim" : (message.senderOrganisationName || "User")}
                            </Badge>
                            {message.attachmentFileName && (
                              <Paperclip className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{message.content}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-gray-500">
                          <span>{formatDate(message.createdAt)}</span>
                          {message.caseId && (() => {
                            const caseData = cases?.find((c: any) => c.id === message.caseId);
                            return (
                              <>
                                <span className="text-gray-400">•</span>
                                <span className="text-acclaim-teal font-medium truncate max-w-[150px] sm:max-w-[250px]">
                                  {caseData?.caseName || getCaseAccountNumber(message.caseId)}
                                  {caseData?.organisationName && (
                                    <span className="text-gray-500 font-normal"> ({caseData.organisationName})</span>
                                  )}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-acclaim-teal hover:text-acclaim-teal flex-shrink-0 h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReply(message);
                      }}
                      title="Reply to this message"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <p className="text-gray-500 text-sm sm:text-base">No messages found</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-2">
                Tap "New" above to start a conversation.
              </p>
            </div>
          )}
        </CardContent>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 sm:px-6 py-3 sm:py-4 border-t bg-gray-50">
            <p className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
              {startIndex + 1}-{Math.min(endIndex, filteredMessages.length)} of {filteredMessages.length}
            </p>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="text-acclaim-teal border-acclaim-teal hover:bg-acclaim-teal hover:text-white h-8 px-2 sm:px-3"
              >
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">&lt;</span>
              </Button>
              
              {/* Page numbers - show fewer on mobile */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(3, totalPages) }, (_, index) => {
                  let pageNumber;
                  if (totalPages <= 3) {
                    pageNumber = index + 1;
                  } else if (currentPage <= 2) {
                    pageNumber = index + 1;
                  } else if (currentPage >= totalPages - 1) {
                    pageNumber = totalPages - 2 + index;
                  } else {
                    pageNumber = currentPage - 1 + index;
                  }
                  
                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`h-8 w-8 p-0 ${currentPage === pageNumber 
                        ? "bg-acclaim-teal hover:bg-acclaim-teal/90 text-white" 
                        : "text-acclaim-teal border-acclaim-teal hover:bg-acclaim-teal hover:text-white"
                      }`}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="text-acclaim-teal border-acclaim-teal hover:bg-acclaim-teal hover:text-white h-8 px-2 sm:px-3"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">&gt;</span>
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Case Detail Dialog */}
      <Dialog open={caseDialogOpen} onOpenChange={setCaseDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Case Details - {selectedCase?.caseName}</DialogTitle>
            <DialogDescription>
              View comprehensive case information including timeline, documents, and messages.
            </DialogDescription>
          </DialogHeader>
          {selectedCase && (
            <CaseDetail case={selectedCase} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
