import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  Check, 
  AlertTriangle, 
  Download, 
  Upload, 
  Send, 
  FileText, 
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  PoundSterling
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";

interface CaseDetailProps {
  case: any;
}

export default function CaseDetail({ case: caseData }: CaseDetailProps) {
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [messageAttachment, setMessageAttachment] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("timeline");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate accurate outstanding amount
  const getTotalPayments = () => {
    if (!payments || payments.length === 0) return 0;
    return payments.reduce((sum: number, payment: any) => sum + parseFloat(payment.amount), 0);
  };

  const getOutstandingAmount = () => {
    const totalPayments = getTotalPayments();
    return parseFloat(caseData.originalAmount) - totalPayments;
  };

  const handlePaymentsClick = () => {
    setActiveTab("payments");
    // Scroll to payments section after a brief delay to allow tab to render
    setTimeout(() => {
      const paymentsSection = document.querySelector('[data-tab="payments"]');
      if (paymentsSection) {
        paymentsSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  };

  const handleMessagesClick = () => {
    setActiveTab("messages");
    // Scroll to messages section after a brief delay to allow tab to render
    setTimeout(() => {
      const messagesSection = document.querySelector('[data-tab="messages"]');
      if (messagesSection) {
        messagesSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  };

  const getLastMessage = () => {
    if (!messages || messages.length === 0) return null;
    return messages[0]; // Messages are ordered by newest first
  };

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["/api/cases", caseData.id, "activities"],
    enabled: !!caseData.id,
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

  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ["/api/cases", caseData.id, "documents"],
    enabled: !!caseData.id,
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

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/cases", caseData.id, "messages"],
    enabled: !!caseData.id,
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

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/cases", caseData.id, "payments"],
    enabled: !!caseData.id,
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
      if (messageAttachment) {
        const formData = new FormData();
        formData.append("caseId", messageData.caseId);
        formData.append("recipientType", messageData.recipientType);
        formData.append("recipientId", messageData.recipientId);
        formData.append("subject", messageData.subject);
        formData.append("content", messageData.content);
        formData.append("attachment", messageAttachment);
        
        const response = await fetch("/api/messages", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error("Failed to send message");
        }
        
        return response.json();
      } else {
        await apiRequest("POST", "/api/messages", messageData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseData.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setNewMessage("");
      setMessageAttachment(null);
      // Reset message attachment file input
      const messageFileInput = document.getElementById("message-attachment") as HTMLInputElement;
      if (messageFileInput) messageFileInput.value = "";
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

  const uploadDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("caseId", caseData.id.toString());
      
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseData.id, "documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById("file-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
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

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    sendMessageMutation.mutate({
      caseId: caseData.id,
      recipientType: "organization",
      recipientId: "support",
      subject: `Message regarding case ${caseData.accountNumber}`,
      content: newMessage,
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = () => {
    if (!selectedFile) return;
    uploadDocumentMutation.mutate(selectedFile);
  };

  const getStatusBadge = (status: string, stage: string) => {
    if (status === "resolved") {
      return <Badge variant="secondary" className="bg-green-100 text-green-800"><Check className="w-3 h-3 mr-1" />Resolved</Badge>;
    }
    
    switch (stage) {
      case "payment_plan":
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><Check className="w-3 h-3 mr-1" />Payment Plan</Badge>;
      case "legal_action":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Legal Action</Badge>;
      default:
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(num);
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

  const handleDownload = (documentId: number) => {
    window.open(`/api/documents/${documentId}/download`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Case Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{caseData.debtorName}</CardTitle>
            {getStatusBadge(caseData.status, caseData.stage)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Account Number</p>
              <p className="font-medium">{caseData.accountNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Outstanding Amount</p>
              <p className="font-medium">{formatCurrency(getOutstandingAmount())}</p>
              <p className="text-xs text-gray-500 mt-1">*May include interest and recovery costs</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Original Amount</p>
              <p className="font-medium">{formatCurrency(caseData.originalAmount)}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Payments</p>
              <button 
                onClick={handlePaymentsClick}
                className="font-medium text-green-600 hover:text-green-800 hover:underline cursor-pointer text-left"
              >
                {formatCurrency(getTotalPayments())}
              </button>
              <p className="text-xs text-gray-500 mt-1">Click to view details</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Case Handler</p>
              <p className="font-medium">{caseData.assignedTo || "Unassigned"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Last Message</p>
              {getLastMessage() ? (
                <button 
                  onClick={handleMessagesClick}
                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                >
                  <p className="truncate max-w-48">
                    {getLastMessage()?.content || "No content"}
                  </p>
                </button>
              ) : (
                <p className="font-medium text-gray-400">No messages yet</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {getLastMessage() ? 
                  `${formatDate(getLastMessage().createdAt)} - Click to view` : 
                  "Start a conversation"
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Debtor Information */}
      <Card>
        <CardHeader>
          <CardTitle>Debtor Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="font-medium">Name:</span>
                <span>{caseData.debtorName}</span>
              </div>
              {caseData.debtorEmail && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">Email:</span>
                  <span>{caseData.debtorEmail}</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {caseData.debtorPhone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">Phone:</span>
                  <span>{caseData.debtorPhone}</span>
                </div>
              )}
              {caseData.debtorAddress && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">Address:</span>
                  <span>{caseData.debtorAddress}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Case Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : activities && activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity: any) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="w-4 h-4 bg-acclaim-teal rounded-full mt-1 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <p className="text-xs text-gray-500">{formatDate(activity.createdAt)}</p>
                          {activity.performedBy && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <p className="text-xs text-gray-500">by {activity.performedBy}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No timeline activities found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {documentsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-12 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : documents && documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-acclaim-teal" />
                        <div>
                          <p className="font-medium text-sm">{doc.fileName}</p>
                          <p className="text-xs text-gray-500">
                            {formatDate(doc.createdAt)} • {doc.fileSize ? `${Math.round(doc.fileSize / 1024)}KB` : 'Unknown size'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(doc.id)}
                        className="text-acclaim-teal hover:text-acclaim-teal"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No documents found</p>
                </div>
              )}
              
              {/* Upload Document Section */}
              <div className="mt-6 pt-6 border-t">
                <Label htmlFor="file-upload" className="text-sm font-medium">
                  Upload Document
                </Label>
                <div className="mt-2 space-y-3">
                  <input
                    id="file-upload"
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-acclaim-teal file:text-white hover:file:bg-acclaim-teal/90"
                  />
                  {selectedFile && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-acclaim-teal" />
                        <div>
                          <p className="font-medium text-sm">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {Math.round(selectedFile.size / 1024)}KB
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={handleFileUpload}
                        disabled={uploadDocumentMutation.isPending}
                        className="bg-acclaim-teal hover:bg-acclaim-teal/90"
                        size="sm"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadDocumentMutation.isPending ? "Uploading..." : "Upload"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4" data-tab="messages">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardContent>
              {messagesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : messages && messages.length > 0 ? (
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {messages.map((message: any) => (
                    <div key={message.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{message.subject}</p>
                        <p className="text-xs text-gray-500">{formatDate(message.createdAt)}</p>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">From: {message.senderName || 'Unknown'}</p>
                      <p className="text-sm text-gray-700">{message.content}</p>
                      {message.attachmentFileName && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-md">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-acclaim-teal" />
                              <span className="text-sm font-medium">{message.attachmentFileName}</span>
                              <span className="text-xs text-gray-500">
                                ({message.attachmentFileSize ? Math.round(message.attachmentFileSize / 1024) : 0}KB)
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`/api/messages/${message.id}/download`, '_blank')}
                              className="text-acclaim-teal hover:text-acclaim-teal"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Send className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No messages found</p>
                </div>
              )}
              
              {/* Send Message Form */}
              <div className="mt-6 pt-6 border-t">
                <Label htmlFor="message" className="text-sm font-medium">
                  Send Message
                </Label>
                <Textarea
                  id="message"
                  placeholder="Type your message here..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
                
                {/* Message Attachment Section */}
                <div className="mt-4">
                  <Label htmlFor="message-attachment" className="text-sm font-medium text-gray-700">
                    Attach File (Optional)
                  </Label>
                  <input
                    id="message-attachment"
                    type="file"
                    onChange={(e) => setMessageAttachment(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar,.xls,.xlsx,.csv"
                    className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-acclaim-teal file:text-white hover:file:bg-acclaim-teal/90"
                  />
                  {messageAttachment && (
                    <p className="text-sm text-gray-600 mt-1">
                      Selected: {messageAttachment.name} ({(messageAttachment.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  className="mt-3 bg-acclaim-teal hover:bg-acclaim-teal/90"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4" data-tab="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PoundSterling className="h-5 w-5 mr-2" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : payments && payments.length > 0 ? (
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Payment Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment: any) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium">
                              {formatDate(payment.paymentDate)}
                            </TableCell>
                            <TableCell>
                              <span className="text-green-600 font-semibold">
                                {formatCurrency(payment.amount)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {payment.paymentMethod || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {payment.reference || "N/A"}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {payment.notes || "N/A"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Payment Summary */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">Total Payments Received</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(getTotalPayments())}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-600">Outstanding Balance</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(getOutstandingAmount())}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">*May include interest and recovery costs</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <PoundSterling className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No payments recorded yet</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Payments will appear here when they are recorded by the recovery team
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
