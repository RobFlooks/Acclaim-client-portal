import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, FileSpreadsheet, FileText, BarChart3, TrendingUp, PieChart, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";
import * as XLSX from 'xlsx';

export default function RecoveryAnalysisReport() {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  // Calculate recovery metrics
  const getRecoveryMetrics = () => {
    if (!cases || !Array.isArray(cases)) return null;

    const metrics = cases.reduce((acc: any, caseItem: any) => {
      const originalAmount = parseFloat(caseItem.originalAmount || 0);
      const costsAdded = parseFloat(caseItem.costsAdded || 0);
      const interestAdded = parseFloat(caseItem.interestAdded || 0);
      const feesAdded = parseFloat(caseItem.feesAdded || 0);
      const totalDebt = originalAmount + costsAdded + interestAdded + feesAdded;
      
      // Use backend-calculated payments or fallback to calculating from payments array
      const payments = parseFloat(caseItem.totalPayments || '0') || 
                      (caseItem.payments?.reduce((sum: number, payment: any) => {
                        return sum + parseFloat(payment.amount || 0);
                      }, 0) || 0);

      const outstanding = parseFloat(caseItem.outstandingAmount || 0);
      const recovered = payments;
      // Calculate recovery rate based on original amount, capped at 100%
      const recoveryRate = originalAmount > 0 ? Math.min((recovered / originalAmount) * 100, 100) : 0;

      acc.totalOriginalAmount += originalAmount;
      acc.totalCostsAdded += costsAdded;
      acc.totalInterestAdded += interestAdded;
      acc.totalFeesAdded += feesAdded;
      acc.totalDebt += totalDebt;
      acc.totalRecovered += recovered;
      acc.totalOutstanding += outstanding;
      acc.totalCases += 1;

      // Track by status
      const status = caseItem.status?.toLowerCase();
      if (status === 'closed') {
        acc.closedCases += 1;
        acc.closedAmount += recovered;
      } else if (status === 'new matter') {
        acc.newMatterCases += 1;
        acc.newMatterAmount += recovered;
      } else {
        acc.activeCases += 1;
        acc.activeAmount += recovered;
      }

      // Track by recovery rate ranges
      if (recoveryRate >= 90) {
        acc.highRecovery += 1;
      } else if (recoveryRate >= 50) {
        acc.mediumRecovery += 1;
      } else if (recoveryRate > 0) {
        acc.lowRecovery += 1;
      } else {
        acc.noRecovery += 1;
      }
      
      // Calculate overall recovery rate for totals
      acc.totalRecoveryRate = acc.totalOriginalAmount > 0 
        ? Math.min((acc.totalRecovered / acc.totalOriginalAmount) * 100, 100) 
        : 0;

      return acc;
    }, {
      totalOriginalAmount: 0,
      totalCostsAdded: 0,
      totalInterestAdded: 0,
      totalFeesAdded: 0,
      totalDebt: 0,
      totalRecovered: 0,
      totalOutstanding: 0,
      totalCases: 0,
      closedCases: 0,
      activeCases: 0,
      newMatterCases: 0,
      closedAmount: 0,
      activeAmount: 0,
      newMatterAmount: 0,
      highRecovery: 0,
      mediumRecovery: 0,
      lowRecovery: 0,
      noRecovery: 0,
      totalRecoveryRate: 0,
    });

    // Remove recovery rate calculations

    return metrics;
  };

  const getTotalPayments = (caseItem: any) => {
    // Use backend-calculated payments or fallback to calculating from payments array
    return parseFloat(caseItem.totalPayments || '0') || 
           (caseItem.payments?.reduce((sum: number, payment: any) => {
             return sum + parseFloat(payment.amount || 0);
           }, 0) || 0);
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase();
    const statusConfig = {
      'closed': { label: 'Closed', className: 'bg-green-100 text-green-800' },
      'new matter': { label: 'New Matter', className: 'bg-blue-100 text-blue-800' },
    };
    
    const config = statusConfig[statusLower as keyof typeof statusConfig] || 
                   { label: status?.charAt(0).toUpperCase() + status?.slice(1), className: 'bg-yellow-100 text-yellow-800' };
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const handleExportExcel = () => {
    if (!cases || cases.length === 0) {
      toast({
        title: "No Data",
        description: "No cases available to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      const metrics = getRecoveryMetrics();
      
      // Create detailed case data
      const caseData = cases.map((caseItem: any) => {
        const originalAmount = parseFloat(caseItem.originalAmount || 0);
        const costsAdded = parseFloat(caseItem.costsAdded || 0);
        const interestAdded = parseFloat(caseItem.interestAdded || 0);
        const feesAdded = parseFloat(caseItem.feesAdded || 0);
        const totalDebt = originalAmount + costsAdded + interestAdded + feesAdded;
        const payments = getTotalPayments(caseItem);
        const outstanding = totalDebt - payments;
        const recoveryRate = originalAmount > 0 ? Math.min((payments / originalAmount) * 100, 100) : 0;

        return {
          'Account Number': caseItem.accountNumber,
          'Debtor Name': caseItem.debtorName,
          'Status': caseItem.status?.toLowerCase() === 'closed' ? 'Closed' : caseItem.status?.charAt(0).toUpperCase() + caseItem.status?.slice(1),
          'Original Amount': originalAmount,
          'Costs Added': costsAdded,
          'Interest Added': interestAdded,
          'Fees Added': feesAdded,
          'Total Debt': totalDebt,
          'Amount Recovered': payments,
          'Outstanding Amount': outstanding,
          'Recovery Rate (%)': Math.round(recoveryRate),
          'Created Date': formatDate(caseItem.createdAt),
          'Last Updated': formatDate(caseItem.updatedAt),
        };
      });

      // Add summary data
      const summaryData = [
        { 'Metric': 'Total Cases', 'Value': metrics?.totalCases || 0 },
        { 'Metric': 'Total Original Amount', 'Value': metrics?.totalOriginalAmount || 0 },
        { 'Metric': 'Total Debt (with costs)', 'Value': metrics?.totalDebt || 0 },
        { 'Metric': 'Total Recovered', 'Value': metrics?.totalRecovered || 0 },
        { 'Metric': 'Total Outstanding', 'Value': metrics?.totalOutstanding || 0 },
        { 'Metric': 'Overall Recovery Rate (%)', 'Value': Math.round(metrics?.totalRecoveryRate || 0) },
      ];

      // Create workbook with multiple sheets
      const wb = XLSX.utils.book_new();
      
      // Case Details Sheet
      const caseSheet = XLSX.utils.json_to_sheet(caseData);
      XLSX.utils.book_append_sheet(wb, caseSheet, 'Case Details');
      
      // Summary Sheet
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

      // Auto-size columns
      const caseColWidths = [
        { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, 
        { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 12 }
      ];
      caseSheet['!cols'] = caseColWidths;
      
      const summaryColWidths = [{ wch: 30 }, { wch: 20 }];
      summarySheet['!cols'] = summaryColWidths;

      // Generate filename
      const now = new Date();
      const filename = `recovery-analysis-report-${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.xlsx`;

      XLSX.writeFile(wb, filename);

      toast({
        title: "Export Successful",
        description: "Recovery analysis report has been exported to Excel.",
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export recovery analysis report.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = () => {
    if (!cases || cases.length === 0) {
      toast({
        title: "No Data",
        description: "No cases available to generate PDF.",
        variant: "destructive",
      });
      return;
    }

    try {
      const metrics = getRecoveryMetrics();
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Could not open print window');
      }

      const currentDate = formatDate(new Date().toISOString());
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Recovery Analysis Report</title>
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
            th, td { padding: 8px; text-align: left; border: 1px solid #ddd; font-size: 10px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .currency { text-align: right; }
            .percentage { text-align: center; font-weight: bold; }
            .high-recovery { color: #10b981; }
            .medium-recovery { color: #f59e0b; }
            .low-recovery { color: #ef4444; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Recovery Analysis Report</h1>
            <p>Generated on: ${currentDate}</p>
          </div>
          
          <div class="section">
            <h2>Key Performance Metrics</h2>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">Overall Recovery Rate</div>
                <div class="metric-value">${formatPercentage(metrics?.totalRecoveryRate || 0)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Total Amount Recovered</div>
                <div class="metric-value">${formatCurrency(metrics?.totalRecovered || 0)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Total Outstanding</div>
                <div class="metric-value">${formatCurrency(metrics?.totalOutstanding || 0)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Total Cases</div>
                <div class="metric-value">${metrics?.totalCases || 0}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Recovery Performance Breakdown</h2>
            <div class="breakdown-grid">
              <div class="breakdown-card">
                <div class="breakdown-label">High Recovery (90%+)</div>
                <div class="breakdown-value high-recovery">${metrics?.highRecovery || 0}</div>
              </div>
              <div class="breakdown-card">
                <div class="breakdown-label">Medium Recovery (50-89%)</div>
                <div class="breakdown-value medium-recovery">${metrics?.mediumRecovery || 0}</div>
              </div>
              <div class="breakdown-card">
                <div class="breakdown-label">Low Recovery (1-49%)</div>
                <div class="breakdown-value low-recovery">${metrics?.lowRecovery || 0}</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>Case Recovery Details</h2>
            <table>
              <thead>
                <tr>
                  <th>Account Number</th>
                  <th>Debtor Name</th>
                  <th>Status</th>
                  <th>Original Amount</th>
                  <th>Total Debt</th>
                  <th>Amount Recovered</th>
                  <th>Outstanding</th>
                  <th>Recovery Rate</th>
                </tr>
              </thead>
              <tbody>
                ${cases.map((caseItem: any) => {
                  const originalAmount = parseFloat(caseItem.originalAmount || 0);
                  const costsAdded = parseFloat(caseItem.costsAdded || 0);
                  const interestAdded = parseFloat(caseItem.interestAdded || 0);
                  const feesAdded = parseFloat(caseItem.feesAdded || 0);
                  const totalDebt = originalAmount + costsAdded + interestAdded + feesAdded;
                  const payments = getTotalPayments(caseItem);
                  const outstanding = totalDebt - payments;
                  const recoveryRate = originalAmount > 0 ? Math.min((payments / originalAmount) * 100, 100) : 0;
                  
                  let rateClass = 'low-recovery';
                  if (recoveryRate >= 90) rateClass = 'high-recovery';
                  else if (recoveryRate >= 50) rateClass = 'medium-recovery';
                  
                  return `
                    <tr>
                      <td>${caseItem.accountNumber || ''}</td>
                      <td>${caseItem.debtorName || ''}</td>
                      <td>${caseItem.status?.toLowerCase() === 'closed' ? 'Closed' : (caseItem.status || '').charAt(0).toUpperCase() + (caseItem.status || '').slice(1)}</td>
                      <td class="currency">${formatCurrency(originalAmount)}</td>
                      <td class="currency">${formatCurrency(totalDebt)}</td>
                      <td class="currency">${formatCurrency(payments)}</td>
                      <td class="currency">${formatCurrency(outstanding)}</td>
                      <td class="percentage ${rateClass}">${formatPercentage(recoveryRate)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <p style="text-align: center; color: #666; font-size: 12px; margin-top: 40px;">
              This report was generated by Acclaim Credit Management System<br>
              All amounts are in GBP. Recovery rates are calculated based on original debt amount and capped at 100%.
            </p>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Don't auto-print, just open for viewing
      printWindow.onload = () => {
        // Focus the new window
        printWindow.focus();
      };
      
      toast({
        title: "Report Opened",
        description: "The report has been opened in a new tab for viewing. You can print it from there if needed.",
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

  const metrics = getRecoveryMetrics();

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
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recovery Analysis Report</h1>
            <p className="text-gray-600">Generated on {formatDate(new Date().toISOString())}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportExcel} variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            View PDF Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Overall Recovery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <span className="text-3xl font-bold text-green-600">
                {formatPercentage(metrics?.totalRecoveryRate || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Total Amount Recovered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <PieChart className="h-8 w-8 text-blue-600" />
              <span className="text-3xl font-bold text-blue-600">
                {formatCurrency(metrics?.totalRecovered || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-orange-600" />
              <span className="text-3xl font-bold text-orange-600">
                {formatCurrency(metrics?.totalOutstanding || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Total Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-purple-600" />
              <span className="text-3xl font-bold text-purple-600">
                {metrics?.totalCases || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recovery Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Recovery Performance Breakdown</CardTitle>
            <p className="text-sm text-gray-600">Based on original amount (max 100%)</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">High Recovery (90-100%)</span>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  {metrics?.highRecovery || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Medium Recovery (50-89%)</span>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800">
                  {metrics?.mediumRecovery || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Low Recovery (1-49%)</span>
                </div>
                <Badge className="bg-red-100 text-red-800">
                  {metrics?.lowRecovery || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">No Recovery (0%)</span>
                </div>
                <Badge className="bg-gray-100 text-gray-800">
                  {metrics?.noRecovery || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status-Based Recovery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Closed Cases</span>
                <div className="text-right">
                  <div className="font-medium">{metrics?.closedCases || 0} cases</div>
                  <div className="text-sm text-green-600">{formatCurrency(metrics?.closedAmount || 0)}</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Cases</span>
                <div className="text-right">
                  <div className="font-medium">{metrics?.activeCases || 0} cases</div>
                  <div className="text-sm text-yellow-600">{formatCurrency(metrics?.activeAmount || 0)}</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">New Matter</span>
                <div className="text-right">
                  <div className="font-medium">{metrics?.newMatterCases || 0} cases</div>
                  <div className="text-sm text-blue-600">{formatCurrency(metrics?.newMatterAmount || 0)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Case Recovery Table */}
      <Card>
        <CardHeader>
          <CardTitle>Case Recovery Details</CardTitle>
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
                    Total Debt
                    <div className="text-xs text-gray-500 mt-1 font-normal">
                      Original + Costs + Interest + Fees
                    </div>
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Amount Recovered
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Outstanding
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Recovery Rate
                    <div className="text-xs text-gray-500 mt-1 font-normal">
                      Based on Original Amount (Max 100%)
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cases?.map((caseItem: any) => {
                  const originalAmount = parseFloat(caseItem.originalAmount || 0);
                  const costsAdded = parseFloat(caseItem.costsAdded || 0);
                  const interestAdded = parseFloat(caseItem.interestAdded || 0);
                  const feesAdded = parseFloat(caseItem.feesAdded || 0);
                  const totalDebt = originalAmount + costsAdded + interestAdded + feesAdded;
                  const payments = getTotalPayments(caseItem);
                  const outstanding = totalDebt - payments;
                  // Calculate recovery rate based on original amount, capped at 100%
                  const recoveryRate = originalAmount > 0 ? Math.min((payments / originalAmount) * 100, 100) : 0;
                  
                  let rateColorClass = 'text-red-600';
                  if (recoveryRate >= 90) rateColorClass = 'text-green-600';
                  else if (recoveryRate >= 50) rateColorClass = 'text-yellow-600';
                  
                  return (
                    <tr key={caseItem.id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                        {caseItem.accountNumber}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                        {caseItem.debtorName}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        {getStatusBadge(caseItem.status)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(originalAmount)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-purple-600">
                        {formatCurrency(totalDebt)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-blue-600">
                        {formatCurrency(payments)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-orange-600">
                        {formatCurrency(outstanding)}
                      </td>
                      <td className={`border border-gray-200 px-4 py-3 text-sm font-bold ${rateColorClass}`}>
                        {formatPercentage(recoveryRate)}
                      </td>
                    </tr>
                  );
                })}
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

      {/* Summary Financial Breakdown */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Debt Composition</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Original Amount</span>
                  <span className="font-medium">{formatCurrency(metrics?.totalOriginalAmount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Costs Added</span>
                  <span className="font-medium">{formatCurrency(metrics?.totalCostsAdded || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Interest Added</span>
                  <span className="font-medium">{formatCurrency(metrics?.totalInterestAdded || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Fees Added</span>
                  <span className="font-medium">{formatCurrency(metrics?.totalFeesAdded || 0)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium text-gray-900">Total Debt</span>
                  <span className="font-bold text-purple-600">{formatCurrency(metrics?.totalDebt || 0)}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Recovery Performance</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount Recovered</span>
                  <span className="font-medium text-blue-600">{formatCurrency(metrics?.totalRecovered || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount Outstanding</span>
                  <span className="font-medium text-orange-600">{formatCurrency(metrics?.totalOutstanding || 0)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium text-gray-900">Recovery Rate (vs Original)</span>
                  <span className="font-bold text-green-600">{formatPercentage(metrics?.overallRecoveryRate || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-900">Recovery Rate (vs Total Debt)</span>
                  <span className="font-bold text-green-600">{formatPercentage(metrics?.debtRecoveryRate || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>This report was generated on {formatDate(new Date().toISOString())} by Acclaim Credit Management System</p>
        <p className="mt-2">All amounts are in GBP. Recovery rates are calculated based on original debt amount.</p>
      </div>
    </div>
  );
}