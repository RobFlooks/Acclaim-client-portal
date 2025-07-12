import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, FileText, User, Calendar, Banknote, TrendingUp, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
    return cases.reduce((sum: number, caseItem: any) => {
      const totalDebt = parseFloat(caseItem.originalAmount) + 
                        parseFloat(caseItem.costsAdded || 0) + 
                        parseFloat(caseItem.interestAdded || 0) + 
                        parseFloat(caseItem.feesAdded || 0);
      const totalPayments = getTotalPayments(caseItem);
      return sum + (totalDebt - totalPayments);
    }, 0);
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
          {status === 'resolved' ? 'Closed' : status.charAt(0).toUpperCase() + status.slice(1)}
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
      // Use browser's print functionality to generate PDF
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Could not open print window');
      }

      const currentDate = formatDate(new Date().toISOString());
      
      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Case Summary Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0; color: #666; }
            .section { margin-bottom: 30px; }
            .section h2 { font-size: 18px; margin-bottom: 15px; color: #333; }
            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
            .stat-card { padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            .stat-label { font-size: 12px; color: #666; margin-bottom: 5px; }
            .stat-value { font-size: 18px; font-weight: bold; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 8px; text-align: left; border: 1px solid #ddd; font-size: 10px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .currency { text-align: right; }
            .status-active { background-color: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 3px; }
            .status-resolved { background-color: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 3px; }
            .status-new { background-color: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 3px; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Case Summary Report</h1>
            <p>Generated on: ${currentDate}</p>
          </div>
          
          <div class="section">
            <h2>Summary Statistics</h2>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Total Cases</div>
                <div class="stat-value">${cases.length}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Active Cases</div>
                <div class="stat-value">${stats?.activeCases || 0}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Closed Cases</div>
                <div class="stat-value">${stats?.resolvedCases || 0}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total Original Amount</div>
                <div class="stat-value">${formatCurrency(getTotalOriginalAmount())}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total Payments Received</div>
                <div class="stat-value">${formatCurrency(getTotalPaymentsReceived())}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total Outstanding</div>
                <div class="stat-value">${formatCurrency(getTotalOutstandingAmount())}</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>Detailed Case Information</h2>
            <table>
              <thead>
                <tr>
                  <th>Account Number</th>
                  <th>Debtor Name</th>
                  <th>Status</th>
                  <th>Original Amount</th>
                  <th>Costs Added</th>
                  <th>Interest Added</th>
                  <th>Other Fees</th>
                  <th>Total Debt</th>
                  <th>Total Payments</th>
                  <th>Outstanding Amount</th>
                </tr>
              </thead>
              <tbody>
                ${cases.map((caseItem: any) => {
                  const totalDebt = parseFloat(caseItem.originalAmount || 0) + 
                                   parseFloat(caseItem.costsAdded || 0) + 
                                   parseFloat(caseItem.interestAdded || 0) + 
                                   parseFloat(caseItem.feesAdded || 0);
                  const payments = getTotalPayments(caseItem);
                  const outstanding = totalDebt - payments;
                  
                  return `
                    <tr>
                      <td>${caseItem.accountNumber || ''}</td>
                      <td>${caseItem.debtorName || ''}</td>
                      <td><span class="status-${caseItem.status}">${caseItem.status === 'resolved' ? 'Closed' : (caseItem.status || '').charAt(0).toUpperCase() + (caseItem.status || '').slice(1)}</span></td>
                      <td class="currency">${formatCurrency(caseItem.originalAmount || 0)}</td>
                      <td class="currency">${formatCurrency(caseItem.costsAdded || 0)}</td>
                      <td class="currency">${formatCurrency(caseItem.interestAdded || 0)}</td>
                      <td class="currency">${formatCurrency(caseItem.feesAdded || 0)}</td>
                      <td class="currency">${formatCurrency(totalDebt)}</td>
                      <td class="currency">${formatCurrency(payments)}</td>
                      <td class="currency">${formatCurrency(outstanding)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <p style="text-align: center; color: #666; font-size: 12px; margin-top: 40px;">
              This report was generated by Acclaim Credit Management System<br>
              All amounts are in GBP. Outstanding amounts include interest and recovery costs.
            </p>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      };
      
      toast({
        title: "PDF Print Dialog Opened",
        description: "Use your browser's print dialog to save as PDF.",
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
      // Prepare data for Excel export
      const excelData = cases.map((caseItem: any) => ({
        'Account Number': caseItem.accountNumber,
        'Debtor Name': caseItem.debtorName,
        'Status': caseItem.status === 'resolved' ? 'Closed' : caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1),
        'Stage': caseItem.stage.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        'Original Amount': parseFloat(caseItem.originalAmount),
        'Costs Added': parseFloat(caseItem.costsAdded || 0),
        'Interest Added': parseFloat(caseItem.interestAdded || 0),
        'Fees Added': parseFloat(caseItem.feesAdded || 0),
        'Total Additional Charges': parseFloat(caseItem.costsAdded || 0) + parseFloat(caseItem.interestAdded || 0) + parseFloat(caseItem.feesAdded || 0),
        'Total Debt': parseFloat(caseItem.originalAmount) + parseFloat(caseItem.costsAdded || 0) + parseFloat(caseItem.interestAdded || 0) + parseFloat(caseItem.feesAdded || 0),
        'Total Payments': getTotalPayments(caseItem),
        'Outstanding Amount': parseFloat(caseItem.originalAmount) + parseFloat(caseItem.costsAdded || 0) + parseFloat(caseItem.interestAdded || 0) + parseFloat(caseItem.feesAdded || 0) - getTotalPayments(caseItem)
      }));

      // Add summary row
      const summaryRow = {
        'Account Number': 'TOTALS',
        'Debtor Name': '',
        'Status': '',
        'Stage': '',
        'Original Amount': getTotalOriginalAmount(),
        'Costs Added': cases.reduce((sum: number, caseItem: any) => sum + parseFloat(caseItem.costsAdded || 0), 0),
        'Interest Added': cases.reduce((sum: number, caseItem: any) => sum + parseFloat(caseItem.interestAdded || 0), 0),
        'Fees Added': cases.reduce((sum: number, caseItem: any) => sum + parseFloat(caseItem.feesAdded || 0), 0),
        'Total Additional Charges': cases.reduce((sum: number, caseItem: any) => sum + parseFloat(caseItem.costsAdded || 0) + parseFloat(caseItem.interestAdded || 0) + parseFloat(caseItem.feesAdded || 0), 0),
        'Total Debt': getTotalOriginalAmount() + cases.reduce((sum: number, caseItem: any) => sum + parseFloat(caseItem.costsAdded || 0) + parseFloat(caseItem.interestAdded || 0) + parseFloat(caseItem.feesAdded || 0), 0),
        'Total Payments': getTotalPaymentsReceived(),
        'Outstanding Amount': getTotalOutstandingAmount()
      };

      excelData.push(summaryRow);

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Auto-size columns
      const colWidths = [
        { wch: 15 }, // Account Number
        { wch: 25 }, // Debtor Name
        { wch: 12 }, // Status
        { wch: 15 }, // Stage
        { wch: 15 }, // Original Amount
        { wch: 12 }, // Costs Added
        { wch: 12 }, // Interest Added
        { wch: 12 }, // Fees Added
        { wch: 18 }, // Total Additional Charges
        { wch: 15 }, // Total Debt
        { wch: 15 }, // Total Payments
        { wch: 18 }  // Outstanding Amount
      ];
      ws['!cols'] = colWidths;

      // Style the summary row
      const summaryRowIndex = excelData.length;
      const summaryRowRange = XLSX.utils.encode_range({
        s: { c: 0, r: summaryRowIndex },
        e: { c: 11, r: summaryRowIndex }
      });

      XLSX.utils.book_append_sheet(wb, ws, 'Case Summary Report');

      // Generate filename with current date
      const now = new Date();
      const filename = `case-summary-report-${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);

      toast({
        title: "Export Successful",
        description: "Case summary report has been exported to Excel.",
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export case summary report.",
        variant: "destructive",
      });
    }
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
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Case Summary Report</h1>
            <p className="text-gray-600">Generated on {formatDate(new Date().toISOString())}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportExcel} variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={handlePrint} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </div>
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
                  <p className="text-sm text-gray-600">Closed Cases</p>
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
                    Costs Added
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Interest Added
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Other Fees
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Total Debt
                    <div className="text-xs text-gray-500 mt-1 font-normal">
                      Original + Costs + Interest + Fees
                    </div>
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Total Payments
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Outstanding Amount
                    <div className="text-xs text-gray-500 mt-1 font-normal">
                      Total Debt - Total Payments
                    </div>
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
                    <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(caseItem.costsAdded || 0)}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(caseItem.interestAdded || 0)}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(caseItem.feesAdded || 0)}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-purple-600">
                      {formatCurrency(
                        parseFloat(caseItem.originalAmount) + 
                        parseFloat(caseItem.costsAdded || 0) + 
                        parseFloat(caseItem.interestAdded || 0) + 
                        parseFloat(caseItem.feesAdded || 0)
                      )}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-green-600">
                      {formatCurrency(getTotalPayments(caseItem))}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-orange-600">
                      {formatCurrency(
                        parseFloat(caseItem.originalAmount) + 
                        parseFloat(caseItem.costsAdded || 0) + 
                        parseFloat(caseItem.interestAdded || 0) + 
                        parseFloat(caseItem.feesAdded || 0) - 
                        getTotalPayments(caseItem)
                      )}
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