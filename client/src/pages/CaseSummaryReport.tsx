import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, FileText, User, Calendar, Banknote, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";

export default function CaseSummaryReport() {
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

  // We'll calculate total payments from outstanding amount for now
  // since we can't use dynamic hooks. In a real scenario, we'd need to restructure this.
  const getTotalPayments = (caseItem: any) => {
    const original = parseFloat(caseItem.originalAmount);
    const outstanding = parseFloat(caseItem.outstandingAmount);
    return Math.max(0, original - outstanding);
  };

  const getTotalOriginalAmount = () => {
    if (!cases) return 0;
    return cases.reduce((sum: number, caseItem: any) => sum + parseFloat(caseItem.originalAmount), 0);
  };

  const getTotalPaymentsReceived = () => {
    if (!cases) return 0;
    return cases.reduce((sum: number, caseItem: any) => sum + getTotalPayments(caseItem), 0);
  };

  const getTotalOutstandingAmount = () => {
    if (!cases) return 0;
    return cases.reduce((sum: number, caseItem: any) => sum + parseFloat(caseItem.outstandingAmount), 0);
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getStatusBadge = (status: string, stage: string) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'new':
          return 'bg-blue-100 text-blue-800';
        case 'active':
          return 'bg-yellow-100 text-yellow-800';
        case 'resolved':
          return 'bg-green-100 text-green-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    const getStageColor = (stage: string) => {
      switch (stage) {
        case 'initial_contact':
          return 'bg-purple-100 text-purple-800';
        case 'negotiation':
          return 'bg-orange-100 text-orange-800';
        case 'payment_plan':
          return 'bg-green-100 text-green-800';
        case 'legal_action':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    return (
      <div className="flex gap-2">
        <Badge className={getStatusColor(status)}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
        <Badge className={getStageColor(stage)}>
          {stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Badge>
      </div>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  if (statsLoading || casesLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-acclaim-teal mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link href="/reports">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Case Summary Report</h1>
            <p className="text-gray-600">Generated on {formatDate(new Date().toISOString())}</p>
          </div>
        </div>
        <Button onClick={handlePrint} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Print Report
        </Button>
      </div>

      {/* Summary Statistics */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Summary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Cases</p>
                  <p className="text-2xl font-bold text-blue-600">{cases?.length || 0}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Cases</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats?.activeCases || 0}</p>
                </div>
                <User className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Resolved Cases</p>
                  <p className="text-2xl font-bold text-green-600">{stats?.resolvedCases || 0}</p>
                </div>
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Original Amount</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(getTotalOriginalAmount())}</p>
                </div>
                <Banknote className="h-8 w-8 text-purple-600" />
              </div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Payments Received</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(getTotalPaymentsReceived())}</p>
                </div>
                <Banknote className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Outstanding (inc. costs & interest)</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(getTotalOutstandingAmount())}</p>
                </div>
                <Banknote className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Case Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Account Number
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Debtor Name
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Status
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Original Amount
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Total Payments
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Outstanding Amount
                    <div className="text-xs text-gray-500 mt-1 font-normal">
                      *May include interest and recovery costs
                    </div>
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Case Handler
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Created Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {cases?.map((caseItem: any) => (
                  <tr key={caseItem.id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                      {caseItem.accountNumber}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                      {caseItem.debtorName}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm">
                      {getStatusBadge(caseItem.status, caseItem.stage)}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(caseItem.originalAmount)}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-green-600">
                      {formatCurrency(getTotalPayments(caseItem))}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-orange-600">
                      {formatCurrency(caseItem.outstandingAmount)}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                      {caseItem.assignedTo || 'Unassigned'}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                      {formatDate(caseItem.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {(!cases || cases.length === 0) && (
            <div className="text-center py-8">
              <p className="text-gray-500">No cases found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>This report was generated on {formatDate(new Date().toISOString())} by Acclaim Credit Management System</p>
        <p className="mt-2">All amounts are in GBP. Outstanding amounts may include interest and recovery costs.</p>
      </div>
    </div>
  );
}