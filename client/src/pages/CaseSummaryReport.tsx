import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, User, Calendar, Banknote, TrendingUp, FileSpreadsheet, FileText, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useState, useMemo } from "react";

export default function CaseSummaryReport() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all"); // "all", "live", "closed"

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

  // Filter cases based on status filter
  const filteredCases = useMemo(() => {
    if (!cases) return [];
    
    if (statusFilter === "live") {
      return cases.filter((caseItem: any) => caseItem.status !== "Closed");
    } else if (statusFilter === "closed") {
      return cases.filter((caseItem: any) => caseItem.status === "Closed");
    }
    return cases; // "all" - show both live and closed
  }, [cases, statusFilter]);

  // Calculate filtered statistics
  const filteredStats = useMemo(() => {
    if (!filteredCases) return { activeCases: 0, closedCases: 0 };
    
    const activeCases = filteredCases.filter((caseItem: any) => caseItem.status !== "Closed").length;
    const closedCases = filteredCases.filter((caseItem: any) => caseItem.status === "Closed").length;
    
    return { activeCases, closedCases };
  }, [filteredCases]);

  // We'll calculate total payments from outstanding amount for now
  // since we can't use dynamic hooks. In a real scenario, we'd need to restructure this.
  const getTotalPayments = (caseItem: any) => {
    const original = parseFloat(caseItem.originalAmount);
    const outstanding = parseFloat(caseItem.outstandingAmount);
    return Math.max(0, original - outstanding);
  };

  const getTotalOriginalAmount = () => {
    if (!filteredCases) return 0;
    return filteredCases.reduce((sum: number, caseItem: any) => sum + parseFloat(caseItem.originalAmount), 0);
  };

  const getTotalPaymentsReceived = () => {
    if (!filteredCases) return 0;
    return filteredCases.reduce((sum: number, caseItem: any) => sum + getTotalPayments(caseItem), 0);
  };

  const getTotalOutstandingAmount = () => {
    if (!filteredCases) return 0;
    return filteredCases.reduce((sum: number, caseItem: any) => sum + parseFloat(caseItem.outstandingAmount || 0), 0);
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

  const getStatusBadge = (status: string) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'new':
          return 'bg-blue-100 text-blue-800';
        case 'active':
          return 'bg-yellow-100 text-yellow-800';
        case 'Closed':
          return 'bg-green-100 text-green-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    return (
      <Badge className={getStatusColor(status)}>
        {status === 'Closed' ? 'Closed' : status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getStageBadge = (stage: string) => {
    const getStageColor = (stage: string) => {
      const normalizedStage = stage.toLowerCase().replace(/[_-]/g, '');
      
      switch (normalizedStage) {
        case 'prelegal':
          return 'bg-blue-100 text-blue-800';
        case 'paymentplan':
        case 'paid':
          return 'bg-green-100 text-green-800';
        case 'claim':
          return 'bg-yellow-100 text-yellow-800';
        case 'judgment':
          return 'bg-orange-100 text-orange-800';
        case 'enforcement':
        case 'legalaction':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    const displayText = stage ? stage.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Not specified';
    
    return (
      <Badge className={getStageColor(stage)}>
        {displayText}
      </Badge>
    );
  };



  const handleDownloadPDF = () => {
    if (!filteredCases || filteredCases.length === 0) {
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
            .status-Closed { background-color: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 3px; }
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
                <div class="stat-value">${filteredCases.length}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Active Cases</div>
                <div class="stat-value">${stats?.activeCases || 0}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Closed Cases</div>
                <div class="stat-value">${stats?.closedCases || 0}</div>
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
                  <th>Case Name</th>
                  <th>Status</th>
                  <th>Stage</th>
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
                ${filteredCases.map((caseItem: any) => {
                  const totalDebt = parseFloat(caseItem.originalAmount || 0) + 
                                   parseFloat(caseItem.costsAdded || 0) + 
                                   parseFloat(caseItem.interestAdded || 0) + 
                                   parseFloat(caseItem.feesAdded || 0);
                  const payments = getTotalPayments(caseItem);
                  const outstanding = totalDebt - payments;
                  
                  return `
                    <tr>
                      <td>${caseItem.accountNumber || ''}</td>
                      <td>${caseItem.caseName || ''}</td>
                      <td><span class="status-${caseItem.status}">${caseItem.status === 'Closed' ? 'Closed' : (caseItem.status || '').charAt(0).toUpperCase() + (caseItem.status || '').slice(1)}</span></td>
                      <td>${caseItem.stage ? caseItem.stage.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Not specified'}</td>
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

  const handleExportExcel = async () => {
    if (!filteredCases || filteredCases.length === 0) {
      toast({
        title: "No Data",
        description: "No cases available to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Case Summary Report');

      // Define columns with proper widths
      worksheet.columns = [
        { header: 'Account Number', key: 'accountNumber', width: 15 },
        { header: 'Case Name', key: 'caseName', width: 25 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Stage', key: 'stage', width: 15 },
        { header: 'Original Amount', key: 'originalAmount', width: 15 },
        { header: 'Costs Added', key: 'costsAdded', width: 12 },
        { header: 'Interest Added', key: 'interestAdded', width: 12 },
        { header: 'Fees Added', key: 'feesAdded', width: 12 },
        { header: 'Total Additional Charges', key: 'totalAdditionalCharges', width: 18 },
        { header: 'Total Debt', key: 'totalDebt', width: 15 },
        { header: 'Total Payments', key: 'totalPayments', width: 15 },
        { header: 'Outstanding Amount', key: 'outstandingAmount', width: 18 }
      ];

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4A90E2' }
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center' };
      });

      // Add data rows
      filteredCases.forEach((caseItem: any) => {
        const row = worksheet.addRow({
          accountNumber: caseItem.accountNumber,
          caseName: caseItem.caseName,
          status: caseItem.status === 'Closed' ? 'Closed' : caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1),
          stage: caseItem.stage.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          originalAmount: parseFloat(caseItem.originalAmount),
          costsAdded: parseFloat(caseItem.costsAdded || 0),
          interestAdded: parseFloat(caseItem.interestAdded || 0),
          feesAdded: parseFloat(caseItem.feesAdded || 0),
          totalAdditionalCharges: parseFloat(caseItem.costsAdded || 0) + parseFloat(caseItem.interestAdded || 0) + parseFloat(caseItem.feesAdded || 0),
          totalDebt: parseFloat(caseItem.originalAmount) + parseFloat(caseItem.costsAdded || 0) + parseFloat(caseItem.interestAdded || 0) + parseFloat(caseItem.feesAdded || 0),
          totalPayments: getTotalPayments(caseItem),
          outstandingAmount: parseFloat(caseItem.originalAmount) + parseFloat(caseItem.costsAdded || 0) + parseFloat(caseItem.interestAdded || 0) + parseFloat(caseItem.feesAdded || 0) - getTotalPayments(caseItem)
        });

        // Color code status column (column 3)
        const statusCell = row.getCell(3);
        let statusColor = 'FFFFFFFF'; // Default white
        if (caseItem.status === 'Closed') statusColor = 'FFC8E6C9'; // Light green
        else if (caseItem.status === 'Active') statusColor = 'FFFFF9C4'; // Light yellow
        else if (caseItem.status === 'New') statusColor = 'FFBBDEFB'; // Light blue
        
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: statusColor }
        };
        statusCell.alignment = { horizontal: 'center' };

        // Color code stage column (column 4)
        const stageCell = row.getCell(4);
        let stageColor = 'FFFFFFFF'; // Default white
        if (caseItem.stage?.includes('Pre-Legal')) stageColor = 'FFBBDEFB'; // Light blue
        else if (caseItem.stage?.includes('Payment') || caseItem.stage?.includes('Paid')) stageColor = 'FFC8E6C9'; // Light green
        else if (caseItem.stage?.includes('Claim')) stageColor = 'FFFFF9C4'; // Light yellow
        else if (caseItem.stage?.includes('Judgment')) stageColor = 'FFFFCC80'; // Light orange
        else if (caseItem.stage?.includes('Enforcement')) stageColor = 'FFFFCDD2'; // Light red
        
        stageCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: stageColor }
        };
        stageCell.alignment = { horizontal: 'center' };
      });

      // Add summary row
      const summaryRow = worksheet.addRow({
        accountNumber: 'TOTALS',
        caseName: '',
        status: '',
        stage: '',
        originalAmount: getTotalOriginalAmount(),
        costsAdded: cases.reduce((sum: number, caseItem: any) => sum + parseFloat(caseItem.costsAdded || 0), 0),
        interestAdded: cases.reduce((sum: number, caseItem: any) => sum + parseFloat(caseItem.interestAdded || 0), 0),
        feesAdded: cases.reduce((sum: number, caseItem: any) => sum + parseFloat(caseItem.feesAdded || 0), 0),
        totalAdditionalCharges: cases.reduce((sum: number, caseItem: any) => sum + parseFloat(caseItem.costsAdded || 0) + parseFloat(caseItem.interestAdded || 0) + parseFloat(caseItem.feesAdded || 0), 0),
        totalDebt: getTotalOriginalAmount() + cases.reduce((sum: number, caseItem: any) => sum + parseFloat(caseItem.costsAdded || 0) + parseFloat(caseItem.interestAdded || 0) + parseFloat(caseItem.feesAdded || 0), 0),
        totalPayments: getTotalPaymentsReceived(),
        outstandingAmount: getTotalOutstandingAmount()
      });

      // Style summary row
      summaryRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0F0' }
        };
        cell.font = { bold: true };
        cell.border = {
          top: { style: 'thick', color: { argb: 'FF000000' } }
        };
      });

      // Add autofilter to header row
      worksheet.autoFilter = {
        from: 'A1',
        to: 'L1'
      };

      // Add Color Guide sheet
      const colorGuideSheet = workbook.addWorksheet('Color Guide');
      colorGuideSheet.columns = [
        { header: 'Color Guide', key: 'guide', width: 50 }
      ];

      const guideData = [
        'Status Colors in web interface:',
        'Green = Closed, Yellow = Active, Blue = New',
        '',
        'Stage Colors in web interface:',
        'Blue = Pre-Legal, Green = Payment Plan/Paid',
        'Yellow = Claim, Orange = Judgment, Red = Enforcement'
      ];

      guideData.forEach((text) => {
        colorGuideSheet.addRow({ guide: text });
      });

      // Generate filename with current date
      const now = new Date();
      const filename = `case-summary-report-${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.xlsx`;

      // Save the file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "Case summary report has been exported to Excel with colored cells!",
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
          <Link href="/?section=reports">
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

      {/* Filter Control */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Cases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Show:</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cases (Live & Closed)</SelectItem>
                <SelectItem value="live">Live Cases Only</SelectItem>
                <SelectItem value="closed">Closed Cases Only</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-600">
              Showing {filteredCases?.length || 0} of {cases?.length || 0} cases
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <p className="text-2xl font-bold text-blue-600">{filteredCases?.length || 0}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Cases</p>
                  <p className="text-2xl font-bold text-yellow-600">{filteredStats?.activeCases || 0}</p>
                </div>
                <User className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Closed Cases</p>
                  <p className="text-2xl font-bold text-green-600">{filteredStats?.closedCases || 0}</p>
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
                    Case Name
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Status
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Stage
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
                {filteredCases?.map((caseItem: any) => (
                  <tr key={caseItem.id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                      {caseItem.accountNumber}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                      {caseItem.caseName}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm">
                      {getStatusBadge(caseItem.status)}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm">
                      {getStageBadge(caseItem.stage)}
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