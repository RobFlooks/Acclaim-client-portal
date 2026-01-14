import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, FileSpreadsheet, FileText, BarChart3, TrendingUp, PieChart, Calendar, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

export default function RecoveryAnalysisReport() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedOrganisation, setSelectedOrganisation] = useState<string>("all");

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

  const { data: organisations, isLoading: organisationsLoading } = useQuery({
    queryKey: ["/api/admin/organisations"],
    enabled: user?.isAdmin === true,
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
        description: "Failed to load organisations",
        variant: "destructive",
      });
    },
  });

  const filteredCases = useMemo(() => {
    if (!cases || !Array.isArray(cases)) return [];
    
    if (!user?.isAdmin || selectedOrganisation === "all") {
      return cases;
    }
    
    return cases.filter((c: any) => c.organisationId === parseInt(selectedOrganisation));
  }, [cases, selectedOrganisation, user?.isAdmin]);

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
    if (!filteredCases || !Array.isArray(filteredCases) || filteredCases.length === 0) return null;

    const metrics = filteredCases.reduce((acc: any, caseItem: any) => {
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
      // Use actual payments received, not calculated debt reduction
      const recovered = payments;
      // Calculate recovery rate based on original amount for more accurate representation
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
      acc.totalRecoveryRate = acc.totalDebt > 0 
        ? Math.min((acc.totalRecovered / acc.totalDebt) * 100, 100) 
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
      'new': { label: 'New', className: 'bg-blue-100 text-blue-800' },
      'active': { label: 'Active', className: 'bg-yellow-100 text-yellow-800' },
    };
    
    const config = statusConfig[statusLower as keyof typeof statusConfig] || 
                   { label: status?.charAt(0).toUpperCase() + status?.slice(1), className: 'bg-yellow-100 text-yellow-800' };
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getStageBadge = (stage: string) => {
    const getStageColor = (stage: string) => {
      const normalizedStage = stage?.toLowerCase().replace(/[_-]/g, '');
      
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
      const metrics = getRecoveryMetrics();
      const workbook = new ExcelJS.Workbook();
      
      // Case Details Sheet
      const caseSheet = workbook.addWorksheet('Case Details');
      
      // Define columns
      caseSheet.columns = [
        { header: 'Account Number', key: 'accountNumber', width: 15 },
        { header: 'Case Name', key: 'caseName', width: 25 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Stage', key: 'stage', width: 15 },
        { header: 'Original Amount', key: 'originalAmount', width: 12 },
        { header: 'Costs Added', key: 'costsAdded', width: 12 },
        { header: 'Interest Added', key: 'interestAdded', width: 12 },
        { header: 'Fees Added', key: 'feesAdded', width: 15 },
        { header: 'Total Debt', key: 'totalDebt', width: 15 },
        { header: 'Amount Recovered', key: 'amountRecovered', width: 18 },
        { header: 'Outstanding Amount', key: 'outstandingAmount', width: 15 },
        { header: 'Recovery Rate (%)', key: 'recoveryRate', width: 12 },
        { header: 'Created Date', key: 'createdDate', width: 12 },
        { header: 'Last Updated', key: 'lastUpdated', width: 12 }
      ];

      // Style header row
      const headerRow = caseSheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4A90E2' }
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center' };
      });

      // Add case data
      filteredCases.forEach((caseItem: any) => {
        const originalAmount = parseFloat(caseItem.originalAmount || 0);
        const costsAdded = parseFloat(caseItem.costsAdded || 0);
        const interestAdded = parseFloat(caseItem.interestAdded || 0);
        const feesAdded = parseFloat(caseItem.feesAdded || 0);
        const totalDebt = originalAmount + costsAdded + interestAdded + feesAdded;
        const outstanding = parseFloat(caseItem.outstandingAmount || 0);
        const payments = parseFloat(caseItem.totalPayments || 0);
        const recovered = payments;
        const recoveryRate = originalAmount > 0 ? Math.min((recovered / originalAmount) * 100, 100) : 0;

        const row = caseSheet.addRow({
          accountNumber: caseItem.accountNumber,
          caseName: caseItem.organisationName ? `${caseItem.caseName} (${caseItem.organisationName})` : caseItem.caseName,
          status: caseItem.status?.toLowerCase() === 'closed' ? 'Closed' : caseItem.status?.charAt(0).toUpperCase() + caseItem.status?.slice(1),
          stage: caseItem.stage ? caseItem.stage.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Not specified',
          originalAmount,
          costsAdded,
          interestAdded,
          feesAdded,
          totalDebt,
          amountRecovered: recovered,
          outstandingAmount: outstanding,
          recoveryRate: Math.round(recoveryRate),
          createdDate: formatDate(caseItem.createdAt),
          lastUpdated: formatDate(caseItem.updatedAt)
        });

        // Color code status column (column 3)
        const statusCell = row.getCell(3);
        let statusColor = 'FFFFFFFF';
        if (caseItem.status?.toLowerCase() === 'closed') statusColor = 'FFC8E6C9';
        else if (caseItem.status?.toLowerCase() === 'active') statusColor = 'FFFFF9C4';
        else if (caseItem.status?.toLowerCase() === 'new') statusColor = 'FFBBDEFB';
        
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: statusColor }
        };
        statusCell.alignment = { horizontal: 'center' };

        // Color code stage column (column 4)
        const stageCell = row.getCell(4);
        let stageColor = 'FFFFFFFF';
        if (caseItem.stage?.toLowerCase().includes('pre-legal')) stageColor = 'FFBBDEFB';
        else if (caseItem.stage?.toLowerCase().includes('payment') || caseItem.stage?.toLowerCase().includes('paid')) stageColor = 'FFC8E6C9';
        else if (caseItem.stage?.toLowerCase().includes('claim')) stageColor = 'FFFFF9C4';
        else if (caseItem.stage?.toLowerCase().includes('judgment')) stageColor = 'FFFFCC80';
        else if (caseItem.stage?.toLowerCase().includes('enforcement')) stageColor = 'FFFFCDD2';
        
        stageCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: stageColor }
        };
        stageCell.alignment = { horizontal: 'center' };
      });

      // Add autofilter
      caseSheet.autoFilter = {
        from: 'A1',
        to: 'N1'
      };

      // Summary Sheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 20 }
      ];

      // Style summary header
      const summaryHeaderRow = summarySheet.getRow(1);
      summaryHeaderRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2E7D32' }
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center' };
      });

      // Add summary data
      const summaryData = [
        { metric: 'Total Cases', value: metrics?.totalCases || 0 },
        { metric: 'Total Original Amount', value: metrics?.totalOriginalAmount || 0 },
        { metric: 'Total Debt (with costs)', value: metrics?.totalDebt || 0 },
        { metric: 'Total Recovered', value: metrics?.totalRecovered || 0 },
        { metric: 'Total Outstanding', value: metrics?.totalOutstanding || 0 },
      ];

      summaryData.forEach((item, index) => {
        const row = summarySheet.addRow(item);
        // Alternate row colors
        if (index % 2 === 0) {
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF5F5F5' }
            };
          });
        }
        row.getCell(1).font = { bold: true };
      });

      // Color Guide Sheet
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

      // Generate filename
      const now = new Date();
      const filename = `recovery-analysis-report-${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.xlsx`;

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
        description: "Recovery analysis report has been exported to Excel with colored cells!",
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
    if (!filteredCases || filteredCases.length === 0) {
      toast({
        title: "No Data",
        description: "No cases available to generate PDF.",
        variant: "destructive",
      });
      return;
    }

    try {
      const metrics = getRecoveryMetrics();
      const orgName = selectedOrganisation === "all" ? "All Organisations" : organisations?.find((o: any) => o.id === parseInt(selectedOrganisation))?.name || "Unknown";
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
            <h2>Financial Summary</h2>
            <div class="breakdown-grid">
              <div class="breakdown-card">
                <div class="breakdown-label">Debt Composition</div>
                <div class="breakdown-value">
                  <div style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                      <span>Total Original Amount:</span>
                      <span>${formatCurrency(metrics?.totalOriginalAmount || 0)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                      <span>Costs Added:</span>
                      <span>${formatCurrency(metrics?.totalCostsAdded || 0)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                      <span>Interest Added:</span>
                      <span>${formatCurrency(metrics?.totalInterestAdded || 0)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                      <span>Fees Added:</span>
                      <span>${formatCurrency(metrics?.totalFeesAdded || 0)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; font-weight: bold;">
                      <span>Total Debt:</span>
                      <span style="color: #7c3aed;">${formatCurrency(metrics?.totalDebt || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="breakdown-card">
                <div class="breakdown-label">Recovery Performance</div>
                <div class="breakdown-value">
                  <div style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                      <span>Amount Recovered:</span>
                      <span style="color: #2563eb;">${formatCurrency(metrics?.totalRecovered || 0)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                      <span>Amount Outstanding:</span>
                      <span style="color: #ea580c;">${formatCurrency(metrics?.totalOutstanding || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>Case Recovery Details</h2>
            <table>
              <thead>
                <tr>
                  <th>Account Number</th>
                  <th>Case Name</th>
                  <th>Status</th>
                  <th>Stage</th>
                  <th>Original Amount</th>
                  <th>Total Debt</th>
                  <th>Amount Recovered</th>
                  <th>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                ${filteredCases.map((caseItem: any) => {
                  const originalAmount = parseFloat(caseItem.originalAmount || 0);
                  const costsAdded = parseFloat(caseItem.costsAdded || 0);
                  const interestAdded = parseFloat(caseItem.interestAdded || 0);
                  const feesAdded = parseFloat(caseItem.feesAdded || 0);
                  const totalDebt = originalAmount + costsAdded + interestAdded + feesAdded;
                  const outstanding = parseFloat(caseItem.outstandingAmount || 0);
                  const payments = parseFloat(caseItem.totalPayments || 0);
                  const recovered = payments;
                  
                  return `
                    <tr>
                      <td>${caseItem.accountNumber || ''}</td>
                      <td>${caseItem.caseName || ''}${caseItem.organisationName ? ` <span style="font-size: 10px; color: #666;">(${caseItem.organisationName})</span>` : ''}</td>
                      <td>${caseItem.status?.toLowerCase() === 'closed' ? 'Closed' : (caseItem.status || '').charAt(0).toUpperCase() + (caseItem.status || '').slice(1)}</td>
                      <td>${caseItem.stage ? caseItem.stage.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Not specified'}</td>
                      <td class="currency">${formatCurrency(originalAmount)}</td>
                      <td class="currency">${formatCurrency(totalDebt)}</td>
                      <td class="currency">${formatCurrency(recovered)}</td>
                      <td class="currency">${formatCurrency(outstanding)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <p style="text-align: center; color: #666; font-size: 12px; margin-top: 40px;">
              All amounts are in GBP.
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Link href="/?section=reports">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Recovery Analysis Report</h1>
            <p className="text-sm text-gray-600">Generated on {formatDate(new Date().toISOString())}</p>
            <p className="text-xs sm:text-sm text-acclaim-teal font-medium">Comprehensive analysis of all cases</p>
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

      {/* Organisation Filter - Admin Only */}
      {user?.isAdmin && (
        <Card className="mb-6 border-amber-200 bg-amber-50/50">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-600" />
                <span className="font-medium text-amber-800">Filter by Organisation</span>
              </div>
              <Select value={selectedOrganisation} onValueChange={setSelectedOrganisation}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select organisation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organisations</SelectItem>
                  {organisations?.map((org: any) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="text-sm w-fit">
                {filteredCases?.length || 0} cases found
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-8">
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm text-gray-600">Amount Recovered</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center space-x-2">
              <PieChart className="h-5 w-5 sm:h-8 sm:w-8 text-blue-600 hidden sm:block" />
              <span className="text-xl sm:text-3xl font-bold text-blue-600">
                {formatCurrency(metrics?.totalRecovered || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm text-gray-600">Outstanding</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 sm:h-8 sm:w-8 text-orange-600 hidden sm:block" />
              <span className="text-xl sm:text-3xl font-bold text-orange-600">
                {formatCurrency(metrics?.totalOutstanding || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm text-gray-600">Total Cases</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 sm:h-8 sm:w-8 text-purple-600 hidden sm:block" />
              <span className="text-xl sm:text-3xl font-bold text-purple-600">
                {metrics?.totalCases || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card className="mb-4 sm:mb-8">
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
            <div>
              <h4 className="font-medium text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Debt Composition</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Original Amount</span>
                  <span className="font-medium text-xs sm:text-sm">{formatCurrency(metrics?.totalOriginalAmount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Costs Added</span>
                  <span className="font-medium text-xs sm:text-sm">{formatCurrency(metrics?.totalCostsAdded || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Interest Added</span>
                  <span className="font-medium text-xs sm:text-sm">{formatCurrency(metrics?.totalInterestAdded || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Fees Added</span>
                  <span className="font-medium text-xs sm:text-sm">{formatCurrency(metrics?.totalFeesAdded || 0)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-xs sm:text-sm font-medium text-gray-900">Total Debt</span>
                  <span className="font-bold text-purple-600 text-xs sm:text-sm">{formatCurrency(metrics?.totalDebt || 0)}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Recovery Performance</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Amount Recovered</span>
                  <span className="font-medium text-blue-600 text-xs sm:text-sm">{formatCurrency(metrics?.totalRecovered || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Amount Outstanding</span>
                  <span className="font-medium text-orange-600 text-xs sm:text-sm">{formatCurrency(metrics?.totalOutstanding || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Case Recovery Table */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Case Recovery Details</CardTitle>
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
                    Total Debt
                  </th>
                  <th className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-900 whitespace-nowrap">
                    Recovered
                  </th>
                  <th className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-900 whitespace-nowrap">
                    Outstanding
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCases?.map((caseItem: any) => {
                  const originalAmount = parseFloat(caseItem.originalAmount || 0);
                  const costsAdded = parseFloat(caseItem.costsAdded || 0);
                  const interestAdded = parseFloat(caseItem.interestAdded || 0);
                  const feesAdded = parseFloat(caseItem.feesAdded || 0);
                  const totalDebt = originalAmount + costsAdded + interestAdded + feesAdded;
                  const outstanding = parseFloat(caseItem.outstandingAmount || 0);
                  const payments = parseFloat(caseItem.totalPayments || 0);
                  const recovered = payments;
                  
                  return (
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
                        {formatCurrency(originalAmount)}
                      </td>
                      <td className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 font-medium text-purple-600 whitespace-nowrap">
                        {formatCurrency(totalDebt)}
                      </td>
                      <td className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 font-medium text-blue-600 whitespace-nowrap">
                        {formatCurrency(recovered)}
                      </td>
                      <td className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 font-medium text-orange-600 whitespace-nowrap">
                        {formatCurrency(outstanding)}
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

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>This report was generated on {formatDate(new Date().toISOString())} by Acclaim Credit Management & Recovery System</p>
        <p className="mt-2">All amounts are in GBP.</p>
      </div>
    </div>
  );
}