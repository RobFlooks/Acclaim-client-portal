import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download, FileText, TrendingUp, PieChart, Calendar } from "lucide-react";
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



  const getStatusBreakdown = () => {
    if (!cases) return { active: 0, closed: 0, newMatter: 0 };
    
    return cases.reduce((acc: any, case_: any) => {
      const status = case_.status?.toLowerCase();
      if (status === 'closed') {
        acc.closed++;
      } else if (status === 'new matter') {
        acc.newMatter++;
      } else {
        acc.active++;
      }
      return acc;
    }, { active: 0, closed: 0, newMatter: 0 });
  };

  const getRecoveryAnalysis = () => {
    if (!cases) return { totalOriginal: 0, totalRecovered: 0, totalOutstanding: 0 };
    
    return cases.reduce((acc: any, case_: any) => {
      const original = parseFloat(case_.originalAmount);
      const outstanding = parseFloat(case_.outstandingAmount);
      const recovered = original - outstanding;
      
      acc.totalOriginal += original;
      acc.totalRecovered += recovered;
      acc.totalOutstanding += outstanding;
      
      return acc;
    }, { totalOriginal: 0, totalRecovered: 0, totalOutstanding: 0 });
  };

  const statusBreakdown = getStatusBreakdown();
  const recoveryAnalysis = getRecoveryAnalysis();

  return (
    <div className="space-y-6">
      {/* Report Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Report Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-[#008a8a57]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#313333]">Total Cases</p>
                  <p className="text-2xl font-bold text-[#0f766e]">
                    {casesLoading ? "..." : cases?.length || 0}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-acclaim-teal" />
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Recovered</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {casesLoading ? "..." : formatCurrency(recoveryAnalysis.totalRecovered)}
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
                    {casesLoading ? "..." : formatCurrency(recoveryAnalysis.totalOutstanding)}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Case Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Case Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Active Cases</span>
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {statusBreakdown.active}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">New Matter</span>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {statusBreakdown.newMatter}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Closed Cases</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {statusBreakdown.closed}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recovery Analysis</CardTitle>
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
                  <span className="text-sm font-medium text-gray-900">Recovery Rate</span>
                  <span className="text-lg font-bold text-acclaim-teal">
                    {recoveryAnalysis.totalOriginal > 0 
                      ? `${Math.round((recoveryAnalysis.totalRecovered / recoveryAnalysis.totalOriginal) * 100)}%`
                      : "0%"
                    }
                  </span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <h4 className="font-medium">Case Activity Report</h4>
                  <p className="text-sm text-gray-600">Timeline of all case activities</p>
                </div>
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
              <Button 
                onClick={() => handleDownloadReport("Case Activity")}
                variant="outline"
                className="w-full border-green-500 text-green-600 hover:bg-green-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
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
                onClick={() => handleDownloadReport("Monthly Statement")}
                variant="outline"
                className="w-full border-purple-500 text-purple-600 hover:bg-purple-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
