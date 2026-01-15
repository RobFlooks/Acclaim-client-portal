import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, User, Calendar, Banknote, TrendingUp, FileSpreadsheet, FileText, Filter, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useState, useMemo } from "react";

export default function CaseSummaryReport() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all"); // "all", "live", "closed"
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

  // Filter cases based on status filter and organisation filter
  const filteredCases = useMemo(() => {
    if (!cases) return [];
    
    let result = cases;
    
    // Apply organisation filter if not "all"
    if (orgFilter !== "all") {
      result = result.filter((caseItem: any) => caseItem.organisationId === parseInt(orgFilter));
    }
    
    // Apply status filter
    if (statusFilter === "live") {
      result = result.filter((caseItem: any) => caseItem.status !== "Closed");
    } else if (statusFilter === "closed") {
      result = result.filter((caseItem: any) => caseItem.status === "Closed");
    }
    
    return result;
  }, [cases, statusFilter, orgFilter]);

  // Calculate filtered statistics
  const filteredStats = useMemo(() => {
    if (!filteredCases) return { activeCases: 0, closedCases: 0 };
    
    const activeCases = filteredCases.filter((caseItem: any) => caseItem.status !== "Closed").length;
    const closedCases = filteredCases.filter((caseItem: any) => caseItem.status === "Closed").length;
    
    return { activeCases, closedCases };
  }, [filteredCases]);

  // Calculate total payments based on the difference between total debt and outstanding amount
  const getTotalPayments = (caseItem: any) => {
    // Use actual payments received, not calculated debt reduction
    return parseFloat(caseItem.totalPayments || 0);
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
                <div class="stat-value">${filteredStats?.activeCases || 0}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Closed Cases</div>
                <div class="stat-value">${filteredStats?.closedCases || 0}</div>
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
                  const outstanding = parseFloat(caseItem.outstandingAmount || 0);
                  const payments = parseFloat(caseItem.totalPayments || 0);
                  
                  return `
                    <tr>
                      <td>${caseItem.accountNumber || ''}</td>
                      <td>${caseItem.caseName || ''}${caseItem.organisationName ? ` <span style="font-size: 10px; color: #666;">(${caseItem.organisationName})</span>` : ''}</td>
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
          caseName: caseItem.organisationName ? `${caseItem.caseName} (${caseItem.organisationName})` : caseItem.caseName,
          status: caseItem.status === 'Closed' ? 'Closed' : caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1),
          stage: caseItem.stage.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          originalAmount: parseFloat(caseItem.originalAmount),
          costsAdded: parseFloat(caseItem.costsAdded || 0),
          interestAdded: parseFloat(caseItem.interestAdded || 0),
          feesAdded: parseFloat(caseItem.feesAdded || 0),
          totalAdditionalCharges: parseFloat(caseItem.costsAdded || 0) + parseFloat(caseItem.interestAdded || 0) + parseFloat(caseItem.feesAdded || 0),
          totalDebt: parseFloat(caseItem.originalAmount) + parseFloat(caseItem.costsAdded || 0) + parseFloat(caseItem.interestAdded || 0) + parseFloat(caseItem.feesAdded || 0),
          totalPayments: getTotalPayments(caseItem),
          outstandingAmount: parseFloat(caseItem.outstandingAmount || 0)
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Link href="/?section=reports">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Case Summary Report</h1>
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

      {/* Filter Control */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            Filter Cases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            {showOrgFilter && (
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
            )}
            <div className="flex items-center gap-2 flex-1">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Show:</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cases (Live & Closed)</SelectItem>
                  <SelectItem value="live">Live Cases Only</SelectItem>
                  <SelectItem value="closed">Closed Cases Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs sm:text-sm text-gray-600">
              Showing {filteredCases?.length || 0} of {cases?.length || 0} cases
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card className="mb-4 sm:mb-8">
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Summary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
            <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Total Cases</p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-600">{filteredCases?.length || 0}</p>
                </div>
                <FileText className="h-5 w-5 sm:h-8 sm:w-8 text-blue-600 hidden sm:block" />
              </div>
            </div>
            <div className="p-3 sm:p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Active Cases</p>
                  <p className="text-lg sm:text-2xl font-bold text-yellow-600">{filteredStats?.activeCases || 0}</p>
                </div>
                <User className="h-5 w-5 sm:h-8 sm:w-8 text-yellow-600 hidden sm:block" />
              </div>
            </div>
            <div className="p-3 sm:p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Closed Cases</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">{filteredStats?.closedCases || 0}</p>
                </div>
                <Calendar className="h-5 w-5 sm:h-8 sm:w-8 text-green-600 hidden sm:block" />
              </div>
            </div>
            <div className="p-3 sm:p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Original Amount</p>
                  <p className="text-lg sm:text-2xl font-bold text-purple-600">{formatCurrency(getTotalOriginalAmount())}</p>
                </div>
                <Banknote className="h-5 w-5 sm:h-8 sm:w-8 text-purple-600 hidden sm:block" />
              </div>
            </div>
            <div className="p-3 sm:p-4 bg-emerald-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Payments Received</p>
                  <p className="text-lg sm:text-2xl font-bold text-emerald-600">{formatCurrency(getTotalPaymentsReceived())}</p>
                </div>
                <Banknote className="h-5 w-5 sm:h-8 sm:w-8 text-emerald-600 hidden sm:block" />
              </div>
            </div>
            <div className="p-3 sm:p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Outstanding</p>
                  <p className="text-lg sm:text-2xl font-bold text-orange-600">{formatCurrency(getTotalOutstandingAmount())}</p>
                </div>
                <Banknote className="h-5 w-5 sm:h-8 sm:w-8 text-orange-600 hidden sm:block" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cases Table */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Detailed Case Information</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full border-collapse border border-gray-200 text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-900 whitespace-nowrap">
                    Account
                  </th>
                  <th className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-900">
                    Case Name
                  </th>
                  <th className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-900">
                    Status
                  </th>
                  <th className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-900">
                    Stage
                  </th>
                  <th className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-900 whitespace-nowrap">
                    Original
                  </th>
                  <th className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-900 whitespace-nowrap">
                    Costs
                  </th>
                  <th className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-900 whitespace-nowrap">
                    Interest
                  </th>
                  <th className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-900 whitespace-nowrap">
                    Fees
                  </th>
                  <th className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-900 whitespace-nowrap">
                    Total Debt
                  </th>
                  <th className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-900 whitespace-nowrap">
                    Payments
                  </th>
                  <th className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-900 whitespace-nowrap">
                    Outstanding
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCases?.map((caseItem: any) => (
                  <tr key={caseItem.id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 text-gray-900 whitespace-nowrap">
                      {caseItem.accountNumber}
                    </td>
                    <td className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 text-gray-900">
                      <div>
                        {caseItem.caseName}
                        {caseItem.organisationName && (
                          <div className="text-xs text-gray-500">({caseItem.organisationName})</div>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3">
                      {getStatusBadge(caseItem.status)}
                    </td>
                    <td className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3">
                      {getStageBadge(caseItem.stage)}
                    </td>
                    <td className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-900 whitespace-nowrap">
                      {formatCurrency(caseItem.originalAmount)}
                    </td>
                    <td className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-900 whitespace-nowrap">
                      {formatCurrency(caseItem.costsAdded || 0)}
                    </td>
                    <td className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-900 whitespace-nowrap">
                      {formatCurrency(caseItem.interestAdded || 0)}
                    </td>
                    <td className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-900 whitespace-nowrap">
                      {formatCurrency(caseItem.feesAdded || 0)}
                    </td>
                    <td className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 font-medium text-purple-600 whitespace-nowrap">
                      {formatCurrency(
                        parseFloat(caseItem.originalAmount) + 
                        parseFloat(caseItem.costsAdded || 0) + 
                        parseFloat(caseItem.interestAdded || 0) + 
                        parseFloat(caseItem.feesAdded || 0)
                      )}
                    </td>
                    <td className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 font-medium text-green-600 whitespace-nowrap">
                      {formatCurrency(getTotalPayments(caseItem))}
                    </td>
                    <td className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 font-medium text-orange-600 whitespace-nowrap">
                      {formatCurrency(caseItem.outstandingAmount || 0)}
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
        <p>All amounts are in GBP. Outstanding amounts may include interest and recovery costs.</p>
      </div>
    </div>
  );
}