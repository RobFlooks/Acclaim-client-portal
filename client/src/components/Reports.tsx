import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, FileText, TrendingUp, PieChart, CreditCard, Calendar, PoundSterling, Building2, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Reports() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [orgFilter, setOrgFilter] = useState<string>("all");

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
        description: "Failed to load statistics",
        variant: "destructive",
      });
    },
  });

  const { data: cases, isLoading: casesLoading } = useQuery({
    queryKey: user?.isAdmin ? ["/api/admin/cases"] : ["/api/cases"],
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

  const { data: payments } = useQuery({
    queryKey: ["/api/payments"],
  });

  // Fetch all organisations for admin filtering
  const { data: allOrganisations } = useQuery<any[]>({
    queryKey: ["/api/admin/organisations"],
    enabled: user?.isAdmin === true,
  });

  // Fetch user's organisations for filtering (non-admin users)
  const { data: userOrganisations } = useQuery<any[]>({
    queryKey: ["/api/user/organisations"],
    enabled: user?.isAdmin !== true,
  });

  // For admin users, show all organisations; for regular users, show their organisations
  const organisations = user?.isAdmin ? allOrganisations : userOrganisations;

  // Check if organisation filter should be shown (admin users always see it, regular users only if they have multiple orgs)
  const showOrgFilter = user?.isAdmin || (userOrganisations && userOrganisations.length > 1);

  // Filter cases based on organisation filter
  const filteredCases = useMemo(() => {
    if (!cases) return [];
    if (orgFilter === "all") return cases;
    return cases.filter((c: any) => c.organisationId === parseInt(orgFilter));
  }, [cases, orgFilter]);

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Filter payments based on filtered cases
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    if (orgFilter === "all") return payments;
    const caseIds = new Set(filteredCases.map((c: any) => c.id));
    return payments.filter((p: any) => caseIds.has(p.caseId));
  }, [payments, filteredCases, orgFilter]);

  // Get recent payments with case info
  const recentPayments = useMemo(() => {
    if (!filteredPayments || !filteredCases) return [];
    
    // Sort by date, most recent first, and take top 3
    const sortedPayments = [...filteredPayments].sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 3);
    
    // Enrich with case info
    return sortedPayments.map((payment: any) => {
      const caseItem = filteredCases.find((c: any) => c.id === payment.caseId);
      return {
        ...payment,
        caseName: caseItem?.caseName || 'Unknown',
        accountNumber: caseItem?.accountNumber || 'N/A',
        organisationName: caseItem?.organisationName
      };
    });
  }, [filteredPayments, filteredCases]);

  const handleViewReport = (reportType: string) => {
    if (reportType === "Case Summary Report") {
      // Navigate to case summary report page
      window.location.href = '/case-summary-report';
    } else if (reportType === "Recovery Analysis") {
      // Navigate to recovery analysis report page
      window.location.href = '/recovery-analysis-report';
    } else if (reportType === "Monthly Statement") {
      // Navigate to monthly statement report page
      window.location.href = '/monthly-statement-report';
    } else if (reportType === "Payment Performance") {
      // Navigate to payment performance report page
      window.location.href = '/payment-performance-report';
    } else {
      toast({
        title: "Report View",
        description: `${reportType} report view is not yet implemented.`,
      });
    }
  };

  const handleDownloadReport = (reportType: string) => {
    toast({
      title: "Download Report",
      description: `${reportType} report download is not yet implemented.`,
    });
  };



  const getStageBreakdown = () => {
    if (!filteredCases || !Array.isArray(filteredCases)) return { preLegal: 0, claim: 0, judgment: 0, enforcement: 0 };
    
    return filteredCases.reduce((acc: any, case_: any) => {
      const stage = case_.stage?.toLowerCase();
      if (stage === 'pre-legal') {
        acc.preLegal++;
      } else if (stage === 'claim') {
        acc.claim++;
      } else if (stage === 'judgment') {
        acc.judgment++;
      } else if (stage === 'enforcement') {
        acc.enforcement++;
      }
      return acc;
    }, { preLegal: 0, claim: 0, judgment: 0, enforcement: 0 });
  };

  const getRecoveryAnalysis = () => {
    if (!filteredCases || !Array.isArray(filteredCases)) return { totalOriginal: 0, totalRecovered: 0, totalOutstanding: 0 };
    
    return filteredCases.reduce((acc: any, case_: any) => {
      const original = parseFloat(case_.originalAmount || 0);
      const outstanding = parseFloat(case_.outstandingAmount || 0);
      // Use actual payments received, not calculated debt reduction
      const recovered = parseFloat(case_.totalPayments || 0);
      
      acc.totalOriginal += original;
      acc.totalRecovered += recovered;
      acc.totalOutstanding += outstanding;
      
      return acc;
    }, { totalOriginal: 0, totalRecovered: 0, totalOutstanding: 0 });
  };

  // Get active cases only for Report Summary
  const getActiveCasesAnalysis = () => {
    if (!filteredCases || !Array.isArray(filteredCases)) return { totalCases: 0, totalRecovered: 0, totalOutstanding: 0 };
    
    const activeCases = filteredCases.filter((case_: any) => case_.status?.toLowerCase() !== 'closed');
    
    return activeCases.reduce((acc: any, case_: any) => {
      const outstanding = parseFloat(case_.outstandingAmount || 0);
      // Use actual payments received, not calculated debt reduction
      const recovered = parseFloat(case_.totalPayments || 0);
      
      acc.totalRecovered += recovered;
      acc.totalOutstanding += outstanding;
      
      return acc;
    }, { totalCases: activeCases.length, totalRecovered: 0, totalOutstanding: 0 });
  };

  const stageBreakdown = getStageBreakdown();
  const recoveryAnalysis = getRecoveryAnalysis();
  const activeCasesAnalysis = getActiveCasesAnalysis();

  return (
    <div className="space-y-6">
      {/* Organisation Filter - Show for admin users or multi-org users */}
      {showOrgFilter && (
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
              Filter by Organisation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Building2 className="h-4 w-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Organisation:</label>
                <Select value={orgFilter} onValueChange={setOrgFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="All Organisations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Organisations</SelectItem>
                    {organisations?.map((org: any) => (
                      <SelectItem key={org.id} value={String(org.id)}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                Showing {filteredCases?.length || 0} cases
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Report Summary
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-muted-foreground mt-1">Active cases only</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-teal-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Cases</p>
                  <p className="text-2xl font-bold text-teal-700">
                    {casesLoading ? "..." : activeCasesAnalysis.totalCases}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-acclaim-teal" />
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Recovery</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {casesLoading ? "..." : formatCurrency(activeCasesAnalysis.totalRecovered)}
                  </p>
                </div>
                <PieChart className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Outstanding</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {casesLoading ? "..." : formatCurrency(activeCasesAnalysis.totalOutstanding)}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Case Stage Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-acclaim-teal" />
              Case Stage Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Pre-Legal</span>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {stageBreakdown.preLegal}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Claim</span>
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {stageBreakdown.claim}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Judgment</span>
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  {stageBreakdown.judgment}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Enforcement</span>
                </div>
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {stageBreakdown.enforcement}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-semibold tracking-tight flex items-center text-[24px]">
              <PoundSterling className="h-6 w-6 mr-2 text-green-600" />
              Recent Payments Received
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recentPayments.length > 0 ? (
              <div className="space-y-2">
                {recentPayments.map((payment: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {payment.caseName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {payment.accountNumber} · {formatDate(payment.createdAt)}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-semibold text-xs ml-2">
                      {formatCurrency(payment.amount)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-2 text-gray-500 text-sm">
                No recent payments to display
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-acclaim-teal" />
            View Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">Case Summary Report</h4>
                  <p className="text-sm text-gray-600">Overview of all cases</p>
                </div>
                <FileText className="h-8 w-8 text-acclaim-teal" />
              </div>
              <Button 
                onClick={() => handleViewReport("Case Summary Report")}
                className="w-full bg-acclaim-teal hover:bg-acclaim-teal/90"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Report
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">Payment Performance</h4>
                  <p className="text-sm text-gray-600">Payment patterns and trends</p>
                </div>
                <CreditCard className="h-8 w-8 text-green-600" />
              </div>
              <Button 
                onClick={() => handleViewReport("Payment Performance")}
                variant="outline"
                className="w-full border-green-500 text-green-600 hover:bg-green-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Report
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">Monthly Statement</h4>
                  <p className="text-sm text-gray-600">Monthly account activity</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <Button 
                onClick={() => handleViewReport("Monthly Statement")}
                variant="outline"
                className="w-full border-purple-500 text-purple-600 hover:bg-purple-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
