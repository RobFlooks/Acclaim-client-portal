import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, FileSpreadsheet, FileText, TrendingUp, Calendar, Clock, CreditCard, Building2, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";
import * as XLSX from 'xlsx';

export default function PaymentPerformanceReport() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [orgFilter, setOrgFilter] = useState<string>("all");

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

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/payments"],
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
        description: "Failed to load payments",
        variant: "destructive",
      });
    },
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

  // Filter payments based on filtered cases
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    if (orgFilter === "all") return payments;
    const caseIds = new Set(filteredCases.map((c: any) => c.id));
    return payments.filter((p: any) => caseIds.has(p.caseId));
  }, [payments, filteredCases, orgFilter]);

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

  const getPaymentMetrics = () => {
    if (!filteredPayments || !filteredCases) return null;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const last30Days = filteredPayments.filter((p: any) => new Date(p.createdAt) >= thirtyDaysAgo);
    const last60Days = filteredPayments.filter((p: any) => new Date(p.createdAt) >= sixtyDaysAgo);
    const last90Days = filteredPayments.filter((p: any) => new Date(p.createdAt) >= ninetyDaysAgo);

    const totalPayments = filteredPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
    const avgPaymentAmount = filteredPayments.length > 0 ? totalPayments / filteredPayments.length : 0;

    // Payment method breakdown
    const methodBreakdown = filteredPayments.reduce((acc: any, payment: any) => {
      const method = payment.paymentMethod || 'Not Specified';
      acc[method] = (acc[method] || 0) + parseFloat(payment.amount);
      return acc;
    }, {});

    // Monthly payment trends
    const monthlyTrends = filteredPayments.reduce((acc: any, payment: any) => {
      const month = new Date(payment.createdAt).toLocaleString('en-GB', { month: 'short', year: 'numeric' });
      if (!acc[month]) {
        acc[month] = { total: 0, count: 0 };
      }
      acc[month].total += parseFloat(payment.amount);
      acc[month].count += 1;
      return acc;
    }, {});



    return {
      totalPayments,
      totalPaymentCount: filteredPayments.length,
      avgPaymentAmount,
      last30DaysTotal: last30Days.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0),
      last30DaysCount: last30Days.length,
      last60DaysTotal: last60Days.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0),
      last90DaysTotal: last90Days.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0),
      methodBreakdown,
      monthlyTrends,

    };
  };

  const handleExportExcel = () => {
    if (!filteredPayments || filteredPayments.length === 0) {
      toast({
        title: "No Data",
        description: "No payment data available to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      const metrics = getPaymentMetrics();
      
      // Payment details sheet
      const paymentDetailsData = filteredPayments.map((payment: any) => {
        const case_ = filteredCases.find((c: any) => c.id === payment.caseId);
        return {
          'Account Number': case_?.accountNumber || 'N/A',
          'Case Name': case_?.organisationName ? `${case_.caseName} (${case_.organisationName})` : (case_?.caseName || 'N/A'),
          'Payment Amount': parseFloat(payment.amount),
          'Payment Date': formatDate(payment.createdAt),
          'Payment Method': payment.paymentMethod || 'Not Specified',

          'Case Status': case_?.status || 'N/A',
          'Original Amount': case_ ? parseFloat(case_.originalAmount) : 0,
          'Outstanding Amount': case_ ? parseFloat(case_.outstandingAmount) : 0,
        };
      });

      // Summary sheet
      const summaryData = [
        ['Metric', 'Value'],
        ['Total Payments', formatCurrency(metrics?.totalPayments || 0)],
        ['Total Payment Count', metrics?.totalPaymentCount || 0],
        ['Average Payment Amount', formatCurrency(metrics?.avgPaymentAmount || 0)],
        ['Last 30 Days Total', formatCurrency(metrics?.last30DaysTotal || 0)],
        ['Last 30 Days Count', metrics?.last30DaysCount || 0],
        ['Last 60 Days Total', formatCurrency(metrics?.last60DaysTotal || 0)],
        ['Last 90 Days Total', formatCurrency(metrics?.last90DaysTotal || 0)],

      ];

      // Method breakdown sheet
      const methodData = Object.entries(metrics?.methodBreakdown || {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([method, amount]) => [
        method,
        formatCurrency(amount as number),
      ]);

      // Monthly trends sheet
      const monthlyData = Object.entries(metrics?.monthlyTrends || {}).map(([month, data]: [string, any]) => [
        month,
        formatCurrency(data.total),
        data.count,
        formatCurrency(data.total / data.count),
      ]);

      const wb = XLSX.utils.book_new();
      
      // Add sheets
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
      
      const paymentDetailsWs = XLSX.utils.json_to_sheet(paymentDetailsData);
      XLSX.utils.book_append_sheet(wb, paymentDetailsWs, 'Payment Details');
      
      if (methodData.length > 0) {
        const methodWs = XLSX.utils.aoa_to_sheet([['Payment Method', 'Total Amount'], ...methodData]);
        XLSX.utils.book_append_sheet(wb, methodWs, 'Payment Methods');
      }
      
      if (monthlyData.length > 0) {
        const monthlyWs = XLSX.utils.aoa_to_sheet([['Month', 'Total Amount', 'Payment Count', 'Average Amount'], ...monthlyData]);
        XLSX.utils.book_append_sheet(wb, monthlyWs, 'Monthly Trends');
      }

      // Generate filename
      const now = new Date();
      const filename = `payment-performance-report-${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.xlsx`;

      XLSX.writeFile(wb, filename);

      toast({
        title: "Export Successful",
        description: "Payment performance report has been exported to Excel.",
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export payment performance report.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = () => {
    if (!payments || !cases) {
      toast({
        title: "No Data",
        description: "No payment data available to generate PDF.",
        variant: "destructive",
      });
      return;
    }

    try {
      const metrics = getPaymentMetrics();
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Could not open print window');
      }

      const currentDate = formatDate(new Date().toISOString());
      
      // Generate method breakdown table
      const methodRows = Object.entries(metrics?.methodBreakdown || {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([method, amount]) => `
        <tr>
          <td>${method}</td>
          <td class="currency">${formatCurrency(amount as number)}</td>
        </tr>
      `).join('');

      // Generate monthly trends table
      const monthlyRows = Object.entries(metrics?.monthlyTrends || {}).map(([month, data]: [string, any]) => `
        <tr>
          <td>${month}</td>
          <td class="currency">${formatCurrency(data.total)}</td>
          <td class="center">${data.count}</td>
          <td class="currency">${formatCurrency(data.total / data.count)}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Performance Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; color: #0f766e; }
            .header p { margin: 5px 0; color: #666; }
            .section { margin-bottom: 30px; }
            .section h2 { font-size: 18px; margin-bottom: 15px; color: #333; }
            .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
            .metric-card { padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            .metric-label { font-size: 14px; color: #666; margin-bottom: 5px; }
            .metric-value { font-size: 24px; font-weight: bold; color: #0f766e; }
            .breakdown-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
            .breakdown-card { padding: 15px; border: 1px solid #ddd; border-radius: 5px; text-align: center; }
            .breakdown-label { font-size: 12px; color: #666; margin-bottom: 5px; }
            .breakdown-value { font-size: 18px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 8px; text-align: left; border: 1px solid #ddd; font-size: 12px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .currency { text-align: right; }
            .center { text-align: center; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Payment Performance Report</h1>
            <p>Generated on: ${currentDate}</p>
          </div>
          
          <div class="section">
            <h2>Key Performance Metrics</h2>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">Total Payments</div>
                <div class="metric-value">${formatCurrency(metrics?.totalPayments || 0)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Average Payment Amount</div>
                <div class="metric-value">${formatCurrency(metrics?.avgPaymentAmount || 0)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Total Payment Count</div>
                <div class="metric-value">${metrics?.totalPaymentCount || 0}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Average Days to Payment</div>
                <div class="metric-value">${metrics?.avgDaysToPayment || 0} days</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Recent Payment Trends</h2>
            <div class="breakdown-grid">
              <div class="breakdown-card">
                <div class="breakdown-label">Last 30 Days</div>
                <div class="breakdown-value">${formatCurrency(metrics?.last30DaysTotal || 0)}</div>
                <div class="breakdown-label">${metrics?.last30DaysCount || 0} payments</div>
              </div>
              <div class="breakdown-card">
                <div class="breakdown-label">Last 60 Days</div>
                <div class="breakdown-value">${formatCurrency(metrics?.last60DaysTotal || 0)}</div>
              </div>
              <div class="breakdown-card">
                <div class="breakdown-label">Last 90 Days</div>
                <div class="breakdown-value">${formatCurrency(metrics?.last90DaysTotal || 0)}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Payment Method Breakdown</h2>
            <table>
              <thead>
                <tr>
                  <th>Payment Method</th>
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                ${methodRows}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Monthly Payment Trends</h2>
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Total Amount</th>
                  <th>Payment Count</th>
                  <th>Average Amount</th>
                </tr>
              </thead>
              <tbody>
                ${monthlyRows}
              </tbody>
            </table>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Focus the new window
      printWindow.onload = () => {
        printWindow.focus();
      };
      
      toast({
        title: "Report Opened",
        description: "The payment performance report has been opened in a new tab for viewing.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Generation Failed",
        description: "Failed to generate PDF report. Please try the Excel export instead.",
        variant: "destructive",
      });
    }
  };

  const metrics = getPaymentMetrics();

  if (casesLoading || paymentsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-acclaim-teal mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment performance data...</p>
        </div>
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Payment Data Available</h2>
          <p className="text-gray-600">No payments have been recorded yet. This report will be available once payments are made.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Link href="/?section=reports">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Payment Performance Report</h1>
            <p className="text-sm text-gray-600">Generated on {formatDate(new Date().toISOString())}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportExcel} variant="outline" size="sm" className="flex-1 sm:flex-none bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-700">
            <FileSpreadsheet className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="sm:hidden text-xs font-semibold">XLS</span>
            <span className="hidden sm:inline">Export to Excel</span>
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="flex-1 sm:flex-none bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-700">
            <FileText className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="sm:hidden text-xs font-semibold">PDF</span>
            <span className="hidden sm:inline">View PDF Report</span>
          </Button>
        </div>
      </div>

      {/* Organisation Filter - Show for admin users or multi-org users */}
      {showOrgFilter && (
        <Card className="mb-4 sm:mb-6">
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
                Showing {filteredPayments?.length || 0} payments
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-8">
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm text-gray-600">Total Payments</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 sm:h-8 sm:w-8 text-green-600 hidden sm:block" />
              <span className="text-xl sm:text-3xl font-bold text-green-600">
                {formatCurrency(metrics?.totalPayments || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm text-gray-600">Avg Payment</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 sm:h-8 sm:w-8 text-blue-600 hidden sm:block" />
              <span className="text-xl sm:text-3xl font-bold text-blue-600">
                {formatCurrency(metrics?.avgPaymentAmount || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm text-gray-600">Payment Count</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 sm:h-8 sm:w-8 text-purple-600 hidden sm:block" />
              <span className="text-xl sm:text-3xl font-bold text-purple-600">
                {metrics?.totalPaymentCount || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Trends */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-8">
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="flex items-center text-sm sm:text-base">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Last 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs sm:text-sm text-gray-600">Total:</span>
                <span className="font-bold text-green-600 text-sm sm:text-base">{formatCurrency(metrics?.last30DaysTotal || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs sm:text-sm text-gray-600">Payments:</span>
                <span className="font-bold text-sm sm:text-base">{metrics?.last30DaysCount || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="flex items-center text-sm sm:text-base">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Last 60 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs sm:text-sm text-gray-600">Total:</span>
                <span className="font-bold text-blue-600 text-sm sm:text-base">{formatCurrency(metrics?.last60DaysTotal || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="flex items-center text-sm sm:text-base">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Last 90 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs sm:text-sm text-gray-600">Total:</span>
                <span className="font-bold text-purple-600 text-sm sm:text-base">{formatCurrency(metrics?.last90DaysTotal || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Method Breakdown */}
      <Card className="mb-4 sm:mb-8">
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Payment Method Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {Object.entries(metrics?.methodBreakdown || {})
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([method, amount]) => (
              <div key={method} className="p-2 sm:p-4 border rounded-lg">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <span className="text-xs sm:text-sm font-medium">{method}</span>
                  <span className="text-sm sm:text-lg font-bold text-acclaim-teal">
                    {formatCurrency(amount as number)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Monthly Payment Trends</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Month</th>
                  <th className="text-right p-2 font-medium whitespace-nowrap">Total</th>
                  <th className="text-center p-2 font-medium">Count</th>
                  <th className="text-right p-2 font-medium whitespace-nowrap">Average</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(metrics?.monthlyTrends || {}).map(([month, data]: [string, any]) => (
                  <tr key={month} className="border-b">
                    <td className="p-2 font-medium whitespace-nowrap">{month}</td>
                    <td className="p-2 text-right font-bold text-green-600 whitespace-nowrap">
                      {formatCurrency(data.total)}
                    </td>
                    <td className="p-2 text-center">{data.count}</td>
                    <td className="p-2 text-right whitespace-nowrap">
                      {formatCurrency(data.total / data.count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}