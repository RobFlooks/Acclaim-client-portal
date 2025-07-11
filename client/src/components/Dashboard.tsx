import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolderOpen, CheckCircle, PoundSterling, TrendingUp, User, Building, Factory, Clock, FileText, Check, AlertTriangle, Plus, Download, UserCog, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";
import { useState } from "react";

export default function Dashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showReportDialog, setShowReportDialog] = useState(false);

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
        return <UserCog className="text-acclaim-teal h-4 w-4" />;
      case 'company_and_individual':
        return <Users className="text-acclaim-teal h-4 w-4" />;
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
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const recentCases = cases?.slice(0, 3) || [];
  const recentMessages = messages?.slice(0, 3) || [];

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome to your debt recovery portal</p>
        </div>
        <Button 
          className="bg-acclaim-teal hover:bg-acclaim-teal/90 text-white"
          onClick={() => setLocation('/submit-case')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Submit New Case
        </Button>
      </div>

      {/* Statistics Cards */}
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
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="text-green-600 h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm">Resolved Cases</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? "..." : stats?.resolvedCases || 0}
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
                <p className="text-xs text-gray-500 mt-1">*May include interest and costs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="text-purple-600 h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm">Recovery Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? "..." : `${stats?.recoveryRate || 0}%`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Recent Cases and Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Cases */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Cases</CardTitle>
                <Button variant="ghost" size="sm" className="text-acclaim-teal hover:text-acclaim-teal">
                  View All
                </Button>
              </div>
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
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#ffffff]">
                          {getDebtorIcon(case_.debtorType)}
                        </div>
                        <div className="ml-4">
                          <p className="font-medium text-gray-900">{case_.debtorName}</p>
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
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Messages</CardTitle>
                <Button variant="ghost" size="sm" className="text-acclaim-teal hover:text-acclaim-teal">
                  View All
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
                    <div key={message.id} className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-acclaim-teal bg-opacity-10 rounded-full flex items-center justify-center">
                        <User className="text-acclaim-teal h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {message.subject || "System Message"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(message.createdAt)}
                        </p>
                        <p className="text-sm text-gray-700 mt-1 truncate">
                          {message.content}
                        </p>
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
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="flex items-center justify-center p-4 h-auto hover:bg-acclaim-teal hover:text-white border-acclaim-teal bg-[#008a8a59] text-[#0f766e]"
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              View All Cases
            </Button>
            <Button
              variant="outline"
              className="flex items-center justify-center p-4 h-auto bg-blue-50 hover:bg-blue-500 hover:text-white border-blue-500 text-blue-600"
            >
              <FileText className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
            <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center justify-center p-4 h-auto bg-green-50 hover:bg-green-500 hover:text-white border-green-500 text-green-600"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Download Report
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-7xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Comprehensive Case Report
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Total Cases: {cases?.length || 0}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        // In a real app, this would generate and download a CSV/PDF
                        toast({
                          title: "Download Started",
                          description: "Report is being generated...",
                        });
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                  {casesLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-acclaim-teal mx-auto"></div>
                      <p className="text-gray-500 mt-2">Loading report...</p>
                    </div>
                  ) : cases && cases.length > 0 ? (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account Number</TableHead>
                            <TableHead>Debtor Name</TableHead>
                            <TableHead>Outstanding Amount <span className="text-xs text-gray-500">*</span></TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Stage</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Created Date</TableHead>
                            <TableHead>Last Updated</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cases.map((case_: any) => (
                            <TableRow key={case_.id}>
                              <TableCell className="font-medium">{case_.accountNumber}</TableCell>
                              <TableCell>{case_.debtorName}</TableCell>
                              <TableCell>{formatCurrency(case_.outstandingAmount)}</TableCell>
                              <TableCell>
                                <Badge variant={getStatusVariant(case_.status)}>
                                  {case_.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {case_.stage}
                                </Badge>
                              </TableCell>
                              <TableCell>{case_.assignedTo || "Unassigned"}</TableCell>
                              <TableCell>{formatDate(case_.createdAt)}</TableCell>
                              <TableCell>{formatDate(case_.updatedAt)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="p-3 bg-gray-50 text-xs text-gray-500">
                        * Outstanding amounts may include interest and recovery costs
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No cases found to report</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              className="flex items-center justify-center p-4 h-auto bg-purple-50 hover:bg-purple-500 hover:text-white border-purple-500 text-purple-600"
            >
              <FileText className="mr-2 h-4 w-4" />
              Send Message
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
