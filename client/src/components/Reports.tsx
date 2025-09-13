import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download, FileText, TrendingUp, PieChart, CreditCard, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Reports() {
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
        description: "Failed to load statistics",
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

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(num);
  };

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
    if (!cases || !Array.isArray(cases)) return { preLegal: 0, claim: 0, judgment: 0, enforcement: 0 };
    
    return cases.reduce((acc: any, case_: any) => {
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
    if (!cases || !Array.isArray(cases)) return { totalOriginal: 0, totalRecovered: 0, totalOutstanding: 0 };
    
    return cases.reduce((acc: any, case_: any) => {
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
    if (!cases || !Array.isArray(cases)) return { totalCases: 0, totalRecovered: 0, totalOutstanding: 0 };
    
    const activeCases = cases.filter((case_: any) => case_.status?.toLowerCase() !== 'closed');
    
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
      {/* Report Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Report Summary
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">Active cases only</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-[#008a8a57]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#313333]">Active Cases</p>
                  <p className="text-2xl font-bold text-[#0f766e]">
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
            <CardTitle>Case Stage Breakdown</CardTitle>
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
          <CardHeader>
            <CardTitle>Recovery Analysis</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Comprehensive data for all active and closed cases</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Original Debt</span>
                <span className="font-medium">{formatCurrency(recoveryAnalysis.totalOriginal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Amount Recovered</span>
                <span className="font-medium text-green-600">{formatCurrency(recoveryAnalysis.totalRecovered)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Still Outstanding</span>
                <span className="font-medium text-orange-600">{formatCurrency(recoveryAnalysis.totalOutstanding)}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* View Reports */}
      <Card>
        <CardHeader>
          <CardTitle>View Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">Case Summary Report</h4>
                  <p className="text-sm text-gray-600">Overview of all cases with key metrics</p>
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
                  <h4 className="font-medium">Recovery Analysis Report</h4>
                  <p className="text-sm text-gray-600">Detailed breakdown of recovery performance</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <Button 
                onClick={() => handleViewReport("Recovery Analysis")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Report
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">Payment Performance Report</h4>
                  <p className="text-sm text-gray-600">Analysis of payment patterns and trends</p>
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
                  <p className="text-sm text-gray-600">Monthly summary of account activity</p>
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
