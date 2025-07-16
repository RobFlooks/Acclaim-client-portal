import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderOpen, CheckCircle, PoundSterling, TrendingUp, User, Building, Clock, FileText, Check, AlertTriangle, Store, UserCheck, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import CaseDetail from "./CaseDetail";

interface DashboardProps {
  setActiveSection?: (section: string) => void;
}

export default function Dashboard({ setActiveSection }: DashboardProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
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
        description: "Failed to load dashboard statistics",
        variant: "destructive",
      });
    },
  });

  const { data: cases, isLoading: casesLoading } = useQuery({
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
      toast({
        title: "Error",
        description: "Failed to load cases",
        variant: "destructive",
      });
    },
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
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

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case "resolved":
        return "secondary";
      case "active":
        return "default";
      case "overdue":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getDebtorIcon = (debtorType: string) => {
    switch (debtorType) {
      case 'individual':
        return <User className="text-acclaim-teal h-4 w-4" />;
      case 'company':
        return <Building className="text-acclaim-teal h-4 w-4" />;
      case 'sole_trader':
        return <Store className="text-acclaim-teal h-4 w-4" />;
      case 'company_and_individual':
        return <UserCheck className="text-acclaim-teal h-4 w-4" />;
      default:
        return <User className="text-acclaim-teal h-4 w-4" />;
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
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const recentCases = cases?.slice(0, 3) || [];
  const recentMessages = messages?.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8) || [];

  const handleCaseClick = (caseData: any) => {
    setSelectedCase(caseData);
    setDialogOpen(true);
  };

  const handleMessageClick = (messageData: any) => {
    setSelectedMessage(messageData);
    setMessageDialogOpen(true);
  };

  const getCaseAccountNumber = (caseId: number) => {
    const caseData = cases?.find((c: any) => c.id === caseId);
    return caseData?.accountNumber || `Case #${caseId}`;
  };

  const handleCaseClickFromMessage = (caseId: number) => {
    const caseData = cases?.find((c: any) => c.id === caseId);
    if (caseData) {
      setMessageDialogOpen(false);
      setSelectedCase(caseData);
      setDialogOpen(true);
    }
  };

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back {user?.firstName ? `${user.firstName}` : 'User'}
          </p>
        </div>
        <Button 
          className="bg-acclaim-teal hover:bg-acclaim-teal/90 text-white"
          onClick={() => setLocation('/submit-case')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Submit New Case
        </Button>
      </div>

      {/* Live Cases Statistics */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <TrendingUp className="text-green-600 h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Live Cases Stats</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-[#f5e7006e]">
                  <FolderOpen className="text-acclaim-teal h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-600 text-sm">Active Cases</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statsLoading ? "..." : stats?.activeCases || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <PoundSterling className="text-blue-600 h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-600 text-sm">Total Outstanding</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statsLoading ? "..." : formatCurrency(stats?.totalOutstanding || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">*Active cases only</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <PoundSterling className="text-purple-600 h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-600 text-sm">Total Recovery</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statsLoading ? "..." : `£${parseFloat(stats?.totalRecovery || '0').toLocaleString()}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">*Active cases only</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="text-green-600 h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-600 text-sm">Closed Cases</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statsLoading ? "..." : stats?.closedCases || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">*For reference</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Recent Cases and Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Cases</CardTitle>
            </CardHeader>
            <CardContent>
              {casesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : recentCases.length > 0 ? (
                <div className="space-y-4">
                  {recentCases.map((case_: any) => (
                    <div
                      key={case_.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => handleCaseClick(case_)}
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#ffffff]">
                          {getDebtorIcon(case_.debtorType)}
                        </div>
                        <div className="ml-4">
                          <p className="font-medium text-gray-900">{case_.caseName}</p>
                          <p className="text-sm text-gray-600">Account: {case_.accountNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(case_.outstandingAmount)}
                        </p>
                        {getStatusBadge(case_.status, case_.stage)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No cases found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Messages */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Messages</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (setActiveSection) {
                      setActiveSection("messages");
                    }
                  }}
                  className="text-acclaim-teal border-acclaim-teal hover:bg-acclaim-teal hover:text-white"
                >
                  View All Messages
                </Button>
              </div>
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
              ) : recentMessages.length > 0 ? (
                <div className="space-y-4">
                  {recentMessages.map((message: any) => (
                    <div 
                      key={message.id} 
                      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                      onClick={() => handleMessageClick(message)}
                    >
                      <div className="w-8 h-8 bg-acclaim-teal bg-opacity-10 rounded-full flex items-center justify-center">
                        <User className="text-acclaim-teal h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {message.subject || "System Message"}
                          </p>
                          <p className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatDate(message.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-gray-500">
                            From: {message.senderName || message.senderEmail || 'Unknown'}
                          </p>
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                            {message.senderIsAdmin ? "Acclaim" : (message.senderOrganisationName || "User")}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">
                          {message.content}
                        </p>
                        {message.caseId && (
                          <p className="text-xs text-gray-500 mt-1">
                            Related to case
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No messages found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Case Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Case Details</DialogTitle>
          </DialogHeader>
          {selectedCase && (
            <CaseDetail case={selectedCase} />
          )}
        </DialogContent>
      </Dialog>

      {/* Message Detail Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedMessage.subject || "System Message"}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(selectedMessage.createdAt)}
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-900 whitespace-pre-wrap">
                  {selectedMessage.content}
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-acclaim-teal bg-opacity-10 rounded-full flex items-center justify-center">
                    <User className="text-acclaim-teal h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedMessage.senderIsAdmin ? 'From Acclaim Team' : 'From You'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedMessage.senderEmail || 'System Message'}
                    </p>
                  </div>
                </div>
              </div>
              
              {selectedMessage.caseId && (
                <div className="bg-gray-50 p-3 rounded-lg mt-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Related to case:</span>{" "}
                    <button
                      onClick={() => handleCaseClickFromMessage(selectedMessage.caseId)}
                      className="text-acclaim-teal hover:text-acclaim-teal/80 font-medium underline cursor-pointer"
                    >
                      {getCaseAccountNumber(selectedMessage.caseId)}
                    </button>
                    {(() => {
                      const caseData = cases?.find((c: any) => c.id === selectedMessage.caseId);
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
    </div>
  );
}
