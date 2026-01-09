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

import { Send, MessageSquare, Plus, User, Paperclip, Download, Trash2, Search, Filter, Calendar, X } from "lucide-react";
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
      // Text search in subject and content
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesText = 
          message.subject?.toLowerCase().includes(searchLower) ||
          message.content?.toLowerCase().includes(searchLower);
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

  return (
    <div className="space-y-6">
      {/* Header with Search and New Message Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Messages</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className="border-acclaim-teal text-acclaim-teal hover:bg-acclaim-teal hover:text-white"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showAdvancedSearch ? "Hide Filters" : "Show Filters"}
              </Button>
              <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogTrigger asChild>
                  <Button className="bg-acclaim-teal hover:bg-acclaim-teal/90">
                    <Plus className="h-4 w-4 mr-2" />
                    New Message
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
        <CardContent className="pt-6">
          {/* Basic Search */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search messages by subject or content..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    resetPagination();
                  }}
                  className="pl-10"
                />
              </div>
              {(searchTerm || searchDateFrom || searchDateTo || searchSender || searchCaseId) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Advanced Search */}
            {showAdvancedSearch && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="dateFrom">Date From</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={searchDateFrom}
                    onChange={(e) => {
                      setSearchDateFrom(e.target.value);
                      resetPagination();
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="dateTo">Date To</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={searchDateTo}
                    onChange={(e) => {
                      setSearchDateTo(e.target.value);
                      resetPagination();
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="sender">Sender</Label>
                  <Input
                    id="sender"
                    placeholder="Search by sender name/email..."
                    value={searchSender}
                    onChange={(e) => {
                      setSearchSender(e.target.value);
                      resetPagination();
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="caseSearch">Case</Label>
                  <Input
                    id="caseSearch"
                    placeholder="Search by case number/name..."
                    value={searchCaseId}
                    onChange={(e) => {
                      setSearchCaseId(e.target.value);
                      resetPagination();
                    }}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Search Results Summary with Pagination Info */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Showing {startIndex + 1}-{Math.min(endIndex, filteredMessages.length)} of {filteredMessages.length} messages
                {filteredMessages.length !== totalMessages && ` (filtered from ${totalMessages})`}
              </span>
              {totalPages > 1 && (
                <span className="text-accent-foreground">
                  Page {currentPage} of {totalPages}
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              All Messages ({filteredMessages.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : paginatedMessages && paginatedMessages.length > 0 ? (
            <div className="space-y-4">
              {paginatedMessages.map((message: any) => (
                <div
                  key={message.id}
                  className="p-4 rounded-lg border transition-colors cursor-pointer hover:shadow-md bg-gray-50 border-gray-200 hover:bg-gray-100"
                  onClick={() => handleMessageClick(message)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-acclaim-teal bg-opacity-10 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-acclaim-teal" />
                        </div>

                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium text-gray-900">{message.subject}</p>

                        </div>
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <p className="text-xs text-gray-500">
                                From: <span className="font-medium">{message.senderName || message.senderEmail || 'Unknown'}</span>
                              </p>
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                {message.senderIsAdmin ? "Acclaim" : (message.senderOrganisationName || "User")}
                              </Badge>
                            </div>
                            {message.attachmentFileName && (
                              <div className="flex items-center text-xs text-gray-500">
                                <Paperclip className="h-3 w-3 mr-1" />
                                <span>Attachment</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{message.content}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <p className="text-xs text-gray-500">{formatDate(message.createdAt)}</p>
                          {message.caseId && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <p className="text-xs text-gray-500">Related to case</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-acclaim-teal hover:text-acclaim-teal"
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
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No messages found</p>
              <p className="text-sm text-gray-400 mt-2">
                Start a conversation with our team using the "New Message" button above.
              </p>
            </div>
          )}
        </CardContent>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredMessages.length)} of {filteredMessages.length} messages
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="text-acclaim-teal border-acclaim-teal hover:bg-acclaim-teal hover:text-white"
              >
                Previous
              </Button>
              
              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = index + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = index + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + index;
                  } else {
                    pageNumber = currentPage - 2 + index;
                  }
                  
                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNumber)}
                      className={currentPage === pageNumber 
                        ? "bg-acclaim-teal hover:bg-acclaim-teal/90 text-white" 
                        : "text-acclaim-teal border-acclaim-teal hover:bg-acclaim-teal hover:text-white"
                      }
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
                className="text-acclaim-teal border-acclaim-teal hover:bg-acclaim-teal hover:text-white"
              >
                Next
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
