import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FolderOpen, CheckCircle, PoundSterling, TrendingUp, User, Building, Clock, FileText, Check, AlertTriangle, Store, UserCheck, Plus, Info, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";
import CaseDetail from "./CaseDetail";
import RefreshIndicator from "./RefreshIndicator";
import acclaimRoseLogo from "@assets/acclaim_rose_transparent_1768474381340.png";


interface DashboardProps {
  setActiveSection?: (section: string) => void;
}

export default function Dashboard({ setActiveSection }: DashboardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [dialogReplyMessage, setDialogReplyMessage] = useState("");
  const [showAccessibleOnly, setShowAccessibleOnly] = useState(false);

  // Check if user has any case restrictions
  const { data: restrictionStatus } = useQuery({
    queryKey: ["/api/user/has-case-restrictions"],
    enabled: !user?.isAdmin, // Only check for non-admin users
    staleTime: 30000,
  });

  const hasRestrictions = restrictionStatus?.hasRestrictions ?? false;

  const { data: stats, isLoading: statsLoading, isFetching: statsIsFetching, dataUpdatedAt: statsDataUpdatedAt } = useQuery({
    queryKey: ["/api/dashboard/stats", showAccessibleOnly ? "accessible" : "all"],
    queryFn: async () => {
      const url = showAccessibleOnly 
        ? "/api/dashboard/stats?accessibleOnly=true" 
        : "/api/dashboard/stats";
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    refetchInterval: 15000, // Refresh every 15 seconds for stats
    staleTime: 0, // Always consider stats data stale to ensure fresh data
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
    refetchInterval: 10000, // Refresh every 10 seconds for cases
    staleTime: 0, // Always consider cases data stale to ensure fresh data
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

  // Mutation to track message views (read receipts)
  const trackViewMutation = useMutation({
    mutationFn: async (messageId: number) => {
      await apiRequest("POST", "/api/track/view", { type: "message", id: messageId });
    },
  });

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Mutation to send message reply
  const sendReplyMutation = useMutation({
    mutationFn: async (data: { caseId: number; subject: string; content: string }) => {
      return await apiRequest("POST", "/api/messages", data);
    },
    onSuccess: () => {
      toast({
        title: "Reply Sent",
        description: "Your reply has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setDialogReplyMessage("");
      setMessageDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send reply. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStageBadge = (status: string, stage: string) => {
    if (status === "resolved" || status?.toLowerCase() === "closed") {
      return <Badge className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300"><Check className="w-3 h-3 mr-1" />Closed</Badge>;
    }
    
    // Normalize stage for consistent comparison
    const normalizedStage = stage?.toLowerCase().replace(/[_-\s]/g, '');
    
    switch (normalizedStage) {
      case "initialcontact":
      case "prelegal":
        return <Badge className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">Pre-Legal</Badge>;
      case "claim":
        return <Badge className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300">Claim</Badge>;
      case "judgment":
      case "judgement":
        return <Badge className="bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300">Judgment</Badge>;
      case "enforcement":
        return <Badge className="bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300">Enforcement</Badge>;
      case "paymentplan":
        return <Badge className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300">Payment Plan</Badge>;
      case "paid":
        return <Badge className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300">Paid</Badge>;
      case "legalaction":
        return <Badge className="bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300">Legal Action</Badge>;
      default:
        // Display the actual stage name, formatted nicely
        const formattedStage = stage?.replace(/[_-]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ') || 'Active';
        return <Badge className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">{formattedStage}</Badge>;
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
    const normalizedType = debtorType?.toLowerCase().replace(/[\s-]/g, '_') || '';
    switch (normalizedType) {
      case 'individual':
        return <User className="text-acclaim-teal h-4 w-4" />;
      case 'company':
        return <Building className="text-acclaim-teal h-4 w-4" />;
      case 'sole_trader':
      case 'soletrader':
        return <Store className="text-acclaim-teal h-4 w-4" />;
      case 'company_and_individual':
      case 'companyandindividual':
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
    
    // Compare calendar dates, not time differences
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((todayOnly.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
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

  const recentCases = cases?.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5) || [];
  const recentMessages = messages?.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8) || [];

  const handleCaseClick = (caseData: any) => {
    setSelectedCase(caseData);
    setDialogOpen(true);
  };

  const handleMessageClick = (messageData: any) => {
    setSelectedMessage(messageData);
    setMessageDialogOpen(true);
    setDialogReplyMessage("");
    // Track view for read receipts
    trackViewMutation.mutate(messageData.id);
  };

  // Format date for display
  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle reply from message dialog
  const handleDialogReply = () => {
    if (!dialogReplyMessage.trim() || !selectedMessage) return;
    
    const fromName = selectedMessage.senderName || selectedMessage.senderEmail || 'Unknown';
    const replyContent = `${dialogReplyMessage}\n\n--- Original Message ---\nFrom: ${fromName}\nDate: ${formatFullDate(selectedMessage.createdAt)}\nSubject: ${selectedMessage.subject}\n\n${selectedMessage.content}`;
    
    sendReplyMutation.mutate({
      caseId: selectedMessage.caseId,
      subject: `Re: ${selectedMessage.subject || 'Message'}`,
      content: replyContent,
    });
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome to your debt recovery portal</p>
        </div>
        {user?.canSubmitCases !== false && (
          <Button 
            className="bg-acclaim-teal hover:bg-acclaim-teal/90 text-white"
            onClick={() => setLocation("/submit-case")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Submit New Case
          </Button>
        )}
      </div>

      {/* Live Cases Statistics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
              <TrendingUp className="text-green-600 dark:text-green-400 h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Live Cases Stats</h2>
          </div>

        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                  <FolderOpen className="text-amber-600 dark:text-amber-400 h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Active Cases</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {statsLoading ? "..." : stats?.activeCases || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex-shrink-0">
                  <PoundSterling className="text-blue-600 dark:text-blue-400 h-6 w-6" />
                </div>
                <div className="ml-4 min-w-0 flex-1">
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Total Outstanding</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 break-all">
                    {statsLoading ? "..." : formatCurrency(stats?.totalOutstanding || 0)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">*Active cases only</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex-shrink-0">
                  <PoundSterling className="text-purple-600 dark:text-purple-400 h-6 w-6" />
                </div>
                <div className="ml-4 min-w-0 flex-1">
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Total Recovery</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 break-all">
                    {statsLoading ? "..." : `£${parseFloat(stats?.totalRecovery || '0').toLocaleString()}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">*Active cases only</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-lg">
                  <CheckCircle className="text-green-600 dark:text-green-400 h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Closed Cases</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {statsLoading ? "..." : stats?.closedCases || 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">*For reference</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="mt-2 text-center space-y-2">
          {hasRestrictions && !user?.isAdmin ? (
            <>
              <div className="flex items-center justify-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <Info className="h-3 w-3" />
                <span>
                  {showAccessibleOnly 
                    ? "Statistics are based on cases you have access to"
                    : "Statistics are based on all cases across your organisation(s) — may include cases which have not been made visible to you"}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Switch
                  id="accessible-only"
                  checked={showAccessibleOnly}
                  onCheckedChange={setShowAccessibleOnly}
                />
                <Label htmlFor="accessible-only" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                  Show only cases I have access to
                </Label>
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Statistics are based on all cases across your organisation(s)
            </p>
          )}
        </div>
      </div>
      {/* Recent Cases and Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
                      <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : recentCases.length > 0 ? (
                <div className="space-y-4">
                  {recentCases.map((case_: any) => (
                    <div
                      key={case_.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      onClick={() => handleCaseClick(case_)}
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-gray-700">
                          {getDebtorIcon(case_.debtorType)}
                        </div>
                        <div className="ml-4">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{case_.caseName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Account: {case_.accountNumber}</p>
                          {case_.organisationName && (
                            <p className="text-xs text-gray-500 dark:text-gray-500">{case_.organisationName}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(case_.outstandingAmount)}
                        </p>
                        {getStageBadge(case_.status, case_.stage)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No cases found</p>
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
                      <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
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
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${message.senderIsAdmin ? 'bg-white border-2 border-acclaim-teal' : 'bg-white border-2 border-blue-300'}`}>
                        {message.senderIsAdmin ? (
                          <img src={acclaimRoseLogo} alt="Acclaim" className="w-6 h-6 object-contain" />
                        ) : (
                          <User className="text-acclaim-teal h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
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
                          <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                            {message.senderIsAdmin ? "Acclaim" : (message.senderOrganisationName || "User")}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">
                          {message.content}
                        </p>
                        {message.caseId && (() => {
                          const caseData = cases?.find((c: any) => c.id === message.caseId);
                          return (
                            <p className="text-xs text-acclaim-teal mt-1 truncate">
                              {caseData?.caseName || getCaseAccountNumber(message.caseId)}
                              {caseData?.organisationName && (
                                <span className="text-gray-500"> ({caseData.organisationName})</span>
                              )}
                            </p>
                          );
                        })()}
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
            <DialogDescription>
              View comprehensive case information including timeline, documents, and messages.
            </DialogDescription>
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
              {/* Sender info at the top */}
              <div className="flex items-center space-x-3 pb-3 border-b">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${selectedMessage.senderIsAdmin ? 'bg-white border-2 border-acclaim-teal' : 'bg-acclaim-teal bg-opacity-10'}`}>
                  {selectedMessage.senderIsAdmin ? (
                    <img src={acclaimRoseLogo} alt="Acclaim" className="w-7 h-7 object-contain" />
                  ) : (
                    <User className="text-acclaim-teal h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedMessage.senderIsAdmin ? 'Acclaim Team' : (selectedMessage.senderName || 'You')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedMessage.senderEmail || 'System Message'} • {formatDate(selectedMessage.createdAt)}
                  </p>
                </div>
              </div>

              {/* Case info if linked */}
              {selectedMessage.caseId && (
                <div className="bg-acclaim-teal/5 border border-acclaim-teal/20 p-3 rounded-lg">
                  <p className="text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Case:</span>{" "}
                    <button
                      onClick={() => handleCaseClickFromMessage(selectedMessage.caseId)}
                      className="text-acclaim-teal hover:text-acclaim-teal/80 font-medium underline cursor-pointer"
                    >
                      {getCaseAccountNumber(selectedMessage.caseId)}
                    </button>
                    {(() => {
                      const caseData = cases?.find((c: any) => c.id === selectedMessage.caseId);
                      return caseData?.caseName ? (
                        <span className="text-gray-600 dark:text-gray-400 ml-1">
                          — {caseData.caseName}
                        </span>
                      ) : null;
                    })()}
                  </p>
                </div>
              )}

              {/* Subject and content */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedMessage.subject || "System Message"}
                </h3>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {selectedMessage.content}
                </p>
              </div>
              
              {/* Reply Section - only show if message has a case */}
              {selectedMessage.caseId && (
                <div className="mt-4 pt-4 border-t">
                  <Label className="text-sm font-medium">Reply</Label>
                  <Textarea
                    placeholder="Type your reply..."
                    value={dialogReplyMessage}
                    onChange={(e) => setDialogReplyMessage(e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                  <Button
                    onClick={handleDialogReply}
                    disabled={!dialogReplyMessage.trim() || sendReplyMutation.isPending}
                    className="mt-3 bg-acclaim-teal hover:bg-acclaim-teal/90 w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sendReplyMutation.isPending ? "Sending..." : "Send Reply"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
