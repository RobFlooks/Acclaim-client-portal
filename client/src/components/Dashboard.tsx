import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, CheckCircle, PoundSterling, TrendingUp, User, Building, Factory, Clock, FileText, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Dashboard() {
  const { toast } = useToast();

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

  const getDebtorIcon = (debtorName: string) => {
    if (debtorName.toLowerCase().includes("tech") || debtorName.toLowerCase().includes("solutions")) {
      return <User className="text-acclaim-teal h-4 w-4" />;
    }
    if (debtorName.toLowerCase().includes("manufacturing") || debtorName.toLowerCase().includes("factory")) {
      return <Factory className="text-acclaim-teal h-4 w-4" />;
    }
    return <Building className="text-acclaim-teal h-4 w-4" />;
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
                        <div className="w-10 h-10 bg-acclaim-teal bg-opacity-10 rounded-full flex items-center justify-center">
                          {getDebtorIcon(case_.debtorName)}
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
              className="flex items-center justify-center p-4 h-auto bg-acclaim-teal bg-opacity-10 hover:bg-acclaim-teal hover:text-white border-acclaim-teal text-acclaim-teal"
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
            <Button
              variant="outline"
              className="flex items-center justify-center p-4 h-auto bg-green-50 hover:bg-green-500 hover:text-white border-green-500 text-green-600"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Download Report
            </Button>
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
