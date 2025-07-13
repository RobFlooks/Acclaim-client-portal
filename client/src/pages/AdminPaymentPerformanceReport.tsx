import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, FileText, TrendingUp, CreditCard, PoundSterling, User, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function AdminPaymentPerformanceReport() {
  const { toast } = useToast();
  const [selectedOrganization, setSelectedOrganization] = useState<string>("all");

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

  const { data: cases, isLoading: casesLoading } = useQuery({
    queryKey: ["/api/admin/cases"],
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

  const { data: organizations, isLoading: organizationsLoading } = useQuery({
    queryKey: ["/api/admin/organisations"],
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
        description: "Failed to load organizations",
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const filteredPayments = useMemo(() => {
    if (!payments || !cases) return [];
    
    if (selectedOrganization === "all") {
      return payments;
    }
    
    const orgCases = cases.filter(c => c.organisationId === parseInt(selectedOrganization));
    const orgCaseIds = orgCases.map(c => c.id);
    
    return payments.filter(p => orgCaseIds.includes(p.caseId));
  }, [payments, cases, selectedOrganization]);

  const getPaymentMetrics = () => {
    if (!filteredPayments || !cases) return null;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const payments30Days = filteredPayments.filter(p => new Date(p.paymentDate) >= thirtyDaysAgo);
    const payments60Days = filteredPayments.filter(p => new Date(p.paymentDate) >= sixtyDaysAgo);
    const payments90Days = filteredPayments.filter(p => new Date(p.paymentDate) >= ninetyDaysAgo);

    const totalAmount = filteredPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const averageAmount = filteredPayments.length > 0 ? totalAmount / filteredPayments.length : 0;



    return {
      totalPayments: filteredPayments.length,
      totalAmount,
      averageAmount,
      payments30Days: payments30Days.length,
      payments60Days: payments60Days.length,
      payments90Days: payments90Days.length,
      amount30Days: payments30Days.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      amount60Days: payments60Days.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      amount90Days: payments90Days.reduce((sum, p) => sum + parseFloat(p.amount), 0),
    };
  };

  const getMonthlyTrends = () => {
    if (!filteredPayments) return [];

    const monthlyData = {};
    
    filteredPayments.forEach(payment => {
      const date = new Date(payment.paymentDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          count: 0,
          amount: 0,
        };
      }
      
      monthlyData[monthKey].count++;
      monthlyData[monthKey].amount += parseFloat(payment.amount);
    });

    return Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  };

  const getPaymentMethodBreakdown = () => {
    if (!filteredPayments) return {};

    const breakdown = {};
    
    filteredPayments.forEach(payment => {
      const method = payment.paymentMethod || 'Not Specified';
      if (!breakdown[method]) {
        breakdown[method] = {
          count: 0,
          amount: 0,
        };
      }
      breakdown[method].count++;
      breakdown[method].amount += parseFloat(payment.amount);
    });

    return breakdown;
  };

  const handleExportExcel = () => {
    if (!filteredPayments) return;

    const metrics = getPaymentMetrics();
    const monthlyTrends = getMonthlyTrends();
    const methodBreakdown = getPaymentMethodBreakdown();

    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Payment Performance Report'],
      ['Generated on:', new Date().toLocaleDateString('en-GB')],
      ['Organization:', selectedOrganization === "all" ? "All Organizations" : organizations?.find(o => o.id === parseInt(selectedOrganization))?.name || "Unknown"],
      [''],
      ['Key Metrics'],
      ['Total Payments:', metrics?.totalPayments || 0],
      ['Total Amount:', formatCurrency(metrics?.totalAmount || 0)],
      ['Average Payment:', formatCurrency(metrics?.averageAmount || 0)],
      ['Average Days to Payment:', `${metrics?.averageDaysToPayment || 0} days`],
      [''],
      ['Recent Activity'],
      ['Last 30 Days:', `${metrics?.payments30Days || 0} payments (${formatCurrency(metrics?.amount30Days || 0)})`],
      ['Last 60 Days:', `${metrics?.payments60Days || 0} payments (${formatCurrency(metrics?.amount60Days || 0)})`],
      ['Last 90 Days:', `${metrics?.payments90Days || 0} payments (${formatCurrency(metrics?.amount90Days || 0)})`],
    ];

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Monthly trends sheet
    const monthlyHeaders = ['Month', 'Payment Count', 'Total Amount'];
    const monthlyRows = monthlyTrends.map(trend => [
      trend.month,
      trend.count,
      trend.amount
    ]);
    const monthlyData = [monthlyHeaders, ...monthlyRows];
    const monthlyWs = XLSX.utils.aoa_to_sheet(monthlyData);
    XLSX.utils.book_append_sheet(wb, monthlyWs, 'Monthly Trends');

    // Payment method breakdown sheet
    const methodHeaders = ['Payment Method', 'Count', 'Total Amount', 'Average Amount'];
    const methodRows = Object.entries(methodBreakdown).map(([method, data]) => [
      method,
      data.count,
      data.amount,
      data.amount / data.count
    ]);
    const methodData = [methodHeaders, ...methodRows];
    const methodWs = XLSX.utils.aoa_to_sheet(methodData);
    XLSX.utils.book_append_sheet(wb, methodWs, 'Payment Methods');

    // Payment details sheet
    const detailHeaders = ['Payment ID', 'Case ID', 'Amount', 'Payment Date', 'Payment Method', 'Reference'];
    const detailRows = filteredPayments.map(payment => [
      payment.id,
      payment.caseId,
      parseFloat(payment.amount),
      formatDate(payment.paymentDate),
      payment.paymentMethod || 'Not Specified',
      payment.reference || ''
    ]);
    const detailData = [detailHeaders, ...detailRows];
    const detailWs = XLSX.utils.aoa_to_sheet(detailData);
    XLSX.utils.book_append_sheet(wb, detailWs, 'Payment Details');

    // Save the file
    const orgName = selectedOrganization === "all" ? "All-Organizations" : organizations?.find(o => o.id === parseInt(selectedOrganization))?.name?.replace(/\s+/g, '-') || "Unknown";
    const fileName = `Admin-Payment-Performance-${orgName}-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast({
      title: "Export Successful",
      description: "Payment performance report exported to Excel",
    });
  };

  const handleDownloadPDF = () => {
    if (!filteredPayments) return;

    const metrics = getPaymentMetrics();
    const monthlyTrends = getMonthlyTrends();
    const methodBreakdown = getPaymentMethodBreakdown();

    // Create HTML content for PDF
    const orgName = selectedOrganization === "all" ? "All Organizations" : organizations?.find(o => o.id === parseInt(selectedOrganization))?.name || "Unknown";
    
    const htmlContent = `
      <html>
        <head>
          <title>Admin Payment Performance Report - ${orgName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .metrics { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .metric-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; width: 30%; }
            .metric-title { font-size: 14px; color: #666; margin-bottom: 5px; }
            .metric-value { font-size: 24px; font-weight: bold; color: #333; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .text-right { text-align: right; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Admin Payment Performance Report</h1>
            <p><strong>Organization:</strong> ${orgName}</p>
            <p><strong>Generated on:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
          </div>
          
          <div class="metrics">
            <div class="metric-card">
              <div class="metric-title">Total Payments</div>
              <div class="metric-value">${metrics?.totalPayments || 0}</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">Total Amount</div>
              <div class="metric-value">${formatCurrency(metrics?.totalAmount || 0)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">Average Payment</div>
              <div class="metric-value">${formatCurrency(metrics?.averageAmount || 0)}</div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Payment Activity Summary</div>
            <table>
              <tr>
                <th>Period</th>
                <th>Payment Count</th>
                <th>Total Amount</th>
              </tr>
              <tr>
                <td>Last 30 Days</td>
                <td>${metrics?.payments30Days || 0}</td>
                <td class="text-right">${formatCurrency(metrics?.amount30Days || 0)}</td>
              </tr>
              <tr>
                <td>Last 60 Days</td>
                <td>${metrics?.payments60Days || 0}</td>
                <td class="text-right">${formatCurrency(metrics?.amount60Days || 0)}</td>
              </tr>
              <tr>
                <td>Last 90 Days</td>
                <td>${metrics?.payments90Days || 0}</td>
                <td class="text-right">${formatCurrency(metrics?.amount90Days || 0)}</td>
              </tr>
            </table>
          </div>
          
          <div class="section">
            <div class="section-title">Payment Method Breakdown</div>
            <table>
              <tr>
                <th>Payment Method</th>
                <th>Count</th>
                <th>Total Amount</th>
                <th>Average Amount</th>
              </tr>
              ${Object.entries(methodBreakdown).map(([method, data]) => `
                <tr>
                  <td>${method}</td>
                  <td>${data.count}</td>
                  <td class="text-right">${formatCurrency(data.amount)}</td>
                  <td class="text-right">${formatCurrency(data.amount / data.count)}</td>
                </tr>
              `).join('')}
            </table>
          </div>
          
          <div class="section">
            <div class="section-title">Monthly Payment Trends</div>
            <table>
              <tr>
                <th>Month</th>
                <th>Payment Count</th>
                <th>Total Amount</th>
              </tr>
              ${monthlyTrends.map(trend => `
                <tr>
                  <td>${trend.month}</td>
                  <td>${trend.count}</td>
                  <td class="text-right">${formatCurrency(trend.amount)}</td>
                </tr>
              `).join('')}
            </table>
          </div>
          
          <div class="footer">
            <p>Report generated by Acclaim Credit Management System</p>
          </div>
        </body>
      </html>
    `;

    // Open in new window for printing/saving
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();

    toast({
      title: "PDF Report Generated",
      description: "Payment performance report opened in new tab",
    });
  };

  const metrics = getPaymentMetrics();
  const monthlyTrends = getMonthlyTrends();
  const methodBreakdown = getPaymentMethodBreakdown();

  if (paymentsLoading || casesLoading || organizationsLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-acclaim-teal mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading payment performance data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Payment Performance Report</h1>
            <p className="text-gray-600">Generated on {new Date().toLocaleDateString('en-GB')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportExcel} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            View PDF Report
          </Button>
        </div>
      </div>

      {/* Organization Filter */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Filter by Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {organizations?.map((org) => (
                  <SelectItem key={org.id} value={org.id.toString()}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-sm">
              {filteredPayments?.length || 0} payments found
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalPayments || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <PoundSterling className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.totalAmount || 0)}</div>
            <p className="text-xs text-muted-foreground">All payments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Payment</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.averageAmount || 0)}</div>
            <p className="text-xs text-muted-foreground">Per payment</p>
          </CardContent>
        </Card>
        

      </div>

      {/* Recent Activity */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Payment Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metrics?.payments30Days || 0}</div>
              <div className="text-sm text-gray-600">Last 30 Days</div>
              <div className="text-lg font-semibold">{formatCurrency(metrics?.amount30Days || 0)}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics?.payments60Days || 0}</div>
              <div className="text-sm text-gray-600">Last 60 Days</div>
              <div className="text-lg font-semibold">{formatCurrency(metrics?.amount60Days || 0)}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics?.payments90Days || 0}</div>
              <div className="text-sm text-gray-600">Last 90 Days</div>
              <div className="text-lg font-semibold">{formatCurrency(metrics?.amount90Days || 0)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Breakdown */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Payment Method Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(methodBreakdown).map(([method, data]) => (
              <div key={method} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{method}</div>
                  <div className="text-sm text-gray-600">{data.count} payments</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(data.amount)}</div>
                  <div className="text-sm text-gray-600">Avg: {formatCurrency(data.amount / data.count)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Payment Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyTrends.map((trend) => (
              <div key={trend.month} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{trend.month}</div>
                  <div className="text-sm text-gray-600">{trend.count} payments</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(trend.amount)}</div>
                  <div className="text-sm text-gray-600">Avg: {formatCurrency(trend.amount / trend.count)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}