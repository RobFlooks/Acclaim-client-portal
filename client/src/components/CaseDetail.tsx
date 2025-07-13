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
  PoundSterling,
  Printer,
  Trash2
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
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
  const { user } = useAuth();

  // Calculate accurate outstanding amount
  const getTotalPayments = () => {
    if (!payments || payments.length === 0) return 0;
    return payments.reduce((sum: number, payment: any) => sum + parseFloat(payment.amount), 0);
  };

  const getOutstandingAmount = () => {
    // Use the static outstanding amount from the database
    return parseFloat(caseData.outstandingAmount || 0);
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

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      await apiRequest("DELETE", `/api/admin/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseData.id, "messages"] });
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

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      await apiRequest("DELETE", `/api/admin/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseData.id, "documents"] });
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
    if (status === "resolved" || status?.toLowerCase() === "closed") {
      return <Badge variant="secondary" className="bg-green-100 text-green-800"><Check className="w-3 h-3 mr-1" />Closed</Badge>;
    }
    
    // Normalize stage for comparison
    const normalizedStage = stage?.toLowerCase().replace(/[_-]/g, '');
    
    switch (normalizedStage) {
      case "paymentplan":
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><Check className="w-3 h-3 mr-1" />Payment Plan</Badge>;
      case "legalaction":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Legal Action</Badge>;
      case "prelegal":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Pre-Legal</Badge>;
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

  const handlePrintCase = () => {
    if (!caseData) {
      toast({
        title: "No Data",
        description: "No case data available to print.",
        variant: "destructive",
      });
      return;
    }

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Could not open print window');
      }

      const currentDate = formatDate(new Date().toISOString());
      const totalPayments = getTotalPayments();
      const outstandingAmount = getOutstandingAmount();
      
      // Helper function to get status text and class for print
      const getStatusForPrint = (status: string, stage: string) => {
        if (status === "resolved" || status?.toLowerCase() === "closed") {
          return { text: 'Closed', class: 'status-resolved' };
        }
        
        const normalizedStage = stage?.toLowerCase().replace(/[_-]/g, '');
        
        switch (normalizedStage) {
          case "paymentplan":
            return { text: 'Payment Plan', class: 'status-resolved' };
          case "legalaction":
            return { text: 'Legal Action', class: 'status-legal' };
          case "prelegal":
            return { text: 'Pre-Legal', class: 'status-progress' };
          default:
            return { text: 'In Progress', class: 'status-progress' };
        }
      };
      
      const statusInfo = getStatusForPrint(caseData.status, caseData.stage);
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Case Details - ${caseData.accountNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0f766e; padding-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; color: #0f766e; }
            .header p { margin: 5px 0; color: #666; }
            .section { margin-bottom: 30px; }
            .section h2 { font-size: 18px; margin-bottom: 15px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            .section h3 { font-size: 16px; margin-bottom: 10px; color: #555; }
            .case-info { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
            .info-card { padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
            .info-label { font-size: 12px; color: #666; margin-bottom: 5px; text-transform: uppercase; }
            .info-value { font-size: 16px; font-weight: bold; color: #333; }
            .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .status-resolved { background-color: #dcfce7; color: #166534; }
            .status-progress { background-color: #fef3c7; color: #92400e; }
            .status-legal { background-color: #fee2e2; color: #991b1b; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 8px; text-align: left; border: 1px solid #ddd; font-size: 12px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .currency { text-align: right; font-weight: bold; }
            .date { font-size: 11px; color: #666; }
            .message-content { background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin: 5px 0; }
            .message-meta { font-size: 10px; color: #666; margin-bottom: 5px; }
            .no-data { text-align: center; color: #666; font-style: italic; padding: 20px; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Case Details Report</h1>
            <p><strong>Account Number:</strong> ${caseData.accountNumber}</p>
            <p><strong>Debtor:</strong> ${caseData.debtorName}</p>
            <p>Generated on: ${currentDate}</p>
          </div>
          
          <div class="section">
            <h2>Case Information</h2>
            <div class="case-info">
              <div class="info-card">
                <div class="info-label">Status</div>
                <div class="info-value">
                  <span class="status-badge ${statusInfo.class}">
                    ${statusInfo.text}
                  </span>
                </div>
              </div>
              <div class="info-card">
                <div class="info-label">Original Amount</div>
                <div class="info-value">${formatCurrency(caseData.originalAmount)}</div>
              </div>
              <div class="info-card">
                <div class="info-label">Outstanding Amount</div>
                <div class="info-value">${formatCurrency(outstandingAmount)}</div>
              </div>
              <div class="info-card">
                <div class="info-label">Total Payments</div>
                <div class="info-value">${formatCurrency(totalPayments)}</div>
              </div>
            </div>
            
            <div class="case-info">
              <div class="info-card">
                <div class="info-label">Debtor Type</div>
                <div class="info-value">${caseData.debtorType || 'Not specified'}</div>
              </div>
              <div class="info-card">
                <div class="info-label">Created Date</div>
                <div class="info-value">${formatDate(caseData.createdAt)}</div>
              </div>
              <div class="info-card">
                <div class="info-label">Last Updated</div>
                <div class="info-value">${formatDate(caseData.updatedAt)}</div>
              </div>
              <div class="info-card">
                <div class="info-label">Stage</div>
                <div class="info-value">${caseData.stage || 'Initial'}</div>
              </div>
            </div>
            

            
            ${caseData.notes ? `
              <div class="info-card" style="grid-column: 1 / -1;">
                <div class="info-label">Notes</div>
                <div class="info-value">${caseData.notes}</div>
              </div>
            ` : ''}
          </div>

          <div class="section">
            <h2>Payment History</h2>
            ${payments && payments.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${payments.map((payment: any) => `
                    <tr>
                      <td class="date">${formatDate(payment.createdAt)}</td>
                      <td class="currency">${formatCurrency(payment.amount)}</td>
                      <td>${payment.method || 'N/A'}</td>
                      <td>${payment.reference || 'N/A'}</td>
                      <td>${payment.status || 'N/A'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div style="margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
                <strong>Total Payments: ${formatCurrency(totalPayments)}</strong>
              </div>
            ` : '<div class="no-data">No payments recorded</div>'}
          </div>

          <div class="section">
            <h2>Case Timeline</h2>
            ${activities && activities.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Activity Type</th>
                    <th>Description</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  ${activities.map((activity: any) => `
                    <tr>
                      <td class="date">${formatDate(activity.createdAt)}</td>
                      <td>${activity.activityType || 'N/A'}</td>
                      <td>${activity.description || 'N/A'}</td>
                      <td>${activity.outcome || 'N/A'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<div class="no-data">No timeline activities recorded</div>'}
          </div>

          <div class="section">
            <h2>Documents</h2>
            ${documents && documents.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Upload Date</th>
                    <th>File Size</th>
                  </tr>
                </thead>
                <tbody>
                  ${documents.map((doc: any) => `
                    <tr>
                      <td>${doc.fileName || 'N/A'}</td>
                      <td class="date">${formatDate(doc.createdAt)}</td>
                      <td>${doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : 'N/A'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<div class="no-data">No documents uploaded</div>'}
          </div>

          <div class="section">
            <h2>Messages</h2>
            ${messages && messages.length > 0 ? `
              <div>
                ${messages.map((message: any) => `
                  <div class="message-content">
                    <div class="message-meta">
                      <strong>From:</strong> ${message.senderName || 'Unknown'} | 
                      <strong>Date:</strong> ${formatDate(message.createdAt)} | 
                      <strong>Subject:</strong> ${message.subject || 'No subject'}
                    </div>
                    <div>${message.content || 'No content'}</div>
                  </div>
                `).join('')}
              </div>
            ` : '<div class="no-data">No messages recorded</div>'}
          </div>
          
          <div class="section">
            <p style="text-align: center; color: #666; font-size: 12px; margin-top: 40px;">
              This report was generated by Acclaim Credit Management System<br>
              All amounts are in GBP. Report generated on ${currentDate}
            </p>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      };
      
      toast({
        title: "PDF Print Dialog Opened",
        description: "Use your browser's print dialog to save as PDF.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Generation Failed",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Case Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{caseData.debtorName}</CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handlePrintCase}
                variant="outline"
                size="sm"
                className="border-acclaim-teal text-acclaim-teal hover:bg-acclaim-teal hover:text-white"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Case PDF
              </Button>
              {getStatusBadge(caseData.status, caseData.stage)}
            </div>
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
              <p className="text-sm text-gray-600">Total Payments</p>
              <button 
                onClick={handlePaymentsClick}
                className="font-medium text-green-600 hover:text-green-800 hover:underline cursor-pointer text-left"
              >
                {formatCurrency(getTotalPayments())}
              </button>
              <p className="text-xs text-gray-500 mt-1">Click to view details</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Original Amount</p>
              <p className="font-medium">{formatCurrency(caseData.originalAmount)}</p>
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

          {/* Additional Debt Information */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Additional Charges</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Costs Added</p>
                <p className="font-medium">{formatCurrency(caseData.costsAdded || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">Legal costs</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Interest Added</p>
                <p className="font-medium">{formatCurrency(caseData.interestAdded || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">Accrued interest charges</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Other Fees</p>
                <p className="font-medium">{formatCurrency(caseData.feesAdded || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">Compensation, administrative and other fees</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total Additional Charges:</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency((parseFloat(caseData.costsAdded || 0) + parseFloat(caseData.interestAdded || 0) + parseFloat(caseData.feesAdded || 0)))}
                </span>
              </div>
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
                        <div className="flex items-center space-x-2">
                          <p className="text-xs text-gray-500">{formatDate(message.createdAt)}</p>
                          {user?.isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this message?")) {
                                  deleteMessageMutation.mutate(message.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-700"
                              disabled={deleteMessageMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
