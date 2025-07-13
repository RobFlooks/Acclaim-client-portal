import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, FileText, TrendingUp, Calendar, PoundSterling, User, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function MonthlyStatementReport() {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

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

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getMonthName = (monthStr: string) => {
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  // Generate available months (last 24 months)
  const availableMonths = useMemo(() => {
    const months = [];
    const currentDate = new Date();
    for (let i = 0; i < 24; i++) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() - i;
      const date = new Date(year, month, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        value: monthStr,
        label: date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      });
    }
    return months;
  }, []);

  // Filter cases and activities for selected month
  const monthlyData = useMemo(() => {
    if (!cases || !selectedMonth) return null;

    // Parse selected month and create date range using UTC to avoid timezone issues
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, 1)); // month - 1 because JS months are 0-indexed
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59)); // Last day of the month

    const filteredCases = cases.filter((case_: any) => {
      const caseDate = new Date(case_.createdAt);
      return caseDate >= startDate && caseDate <= endDate;
    });

    const paymentsInMonth = cases.reduce((acc: any[], case_: any) => {
      if (case_.payments) {
        const monthlyPayments = case_.payments.filter((payment: any) => {
          // Try different date fields for payments
          const paymentDate = new Date(payment.paymentDate || payment.createdAt);
          return paymentDate >= startDate && paymentDate <= endDate;
        });
        acc.push(...monthlyPayments.map((payment: any) => ({
          ...payment,
          accountNumber: case_.accountNumber,
          caseName: case_.caseName
        })));
      }
      return acc;
    }, []);

    const totalPayments = paymentsInMonth.reduce((sum: number, payment: any) => 
      sum + parseFloat(payment.amount), 0);

    return {
      filteredCases,
      paymentsInMonth,
      totalPayments,
      paymentsCount: paymentsInMonth.length,
      startDate,
      endDate
    };
  }, [cases, selectedMonth]);

  const handleExportExcel = () => {
    if (!monthlyData) return;

    const workbook = XLSX.utils.book_new();
    
    // Monthly Summary Sheet
    const summaryData = [
      ['Monthly Statement Report'],
      ['Month:', getMonthName(selectedMonth)],
      ['Generated:', new Date().toLocaleDateString('en-GB')],
      [''],
      ['Summary'],
      ['Total Payments', formatCurrency(monthlyData.totalPayments)],
      ['Number of Payments', monthlyData.paymentsCount],
      [''],
      ['Payments Received This Month']
    ];

    // Add payment headers
    summaryData.push(['Account Number', 'Debtor Name', 'Amount', 'Date', 'Method', 'Reference']);
    
    // Add payment data
    monthlyData.paymentsInMonth.forEach((payment: any) => {
      summaryData.push([
        payment.accountNumber,
        payment.caseName,
        formatCurrency(payment.amount),
        formatDate(payment.createdAt),
        payment.method || 'N/A',
        payment.reference || 'N/A'
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Statement');
    
    const filename = `monthly-statement-${selectedMonth}.xlsx`;
    XLSX.writeFile(workbook, filename);
    
    toast({
      title: "Export Successful",
      description: `Monthly statement exported as ${filename}`,
    });
  };

  const handleDownloadPDF = () => {
    if (!monthlyData) return;

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Could not open print window');
      }

      const currentDate = new Date().toLocaleDateString('en-GB');
      
      // Generate payments table rows
      const paymentsTableRows = monthlyData.paymentsInMonth.map((payment: any) => `
        <tr>
          <td>${payment.accountNumber}</td>
          <td>${payment.caseName}</td>
          <td class="currency">${formatCurrency(payment.amount)}</td>
          <td>${formatDate(payment.createdAt)}</td>
          <td>${payment.method || 'N/A'}</td>
          <td>${payment.reference || 'N/A'}</td>
        </tr>
      `).join('');
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Monthly Statement Report</title>
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
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 8px; text-align: left; border: 1px solid #ddd; font-size: 12px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .currency { text-align: right; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Monthly Statement Report</h1>
            <p>Month: ${getMonthName(selectedMonth)}</p>
            <p>Generated on: ${currentDate}</p>
          </div>
          
          <div class="section">
            <h2>Monthly Summary</h2>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">Total Payments</div>
                <div class="metric-value">${formatCurrency(monthlyData.totalPayments)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Number of Payments</div>
                <div class="metric-value">${monthlyData.paymentsCount}</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>Payments Received This Month</h2>
            ${monthlyData.paymentsInMonth.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Account Number</th>
                    <th>Debtor Name</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  ${paymentsTableRows}
                </tbody>
              </table>
            ` : `
              <p>No payments received in ${getMonthName(selectedMonth)}</p>
            `}
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
        description: `Monthly statement report for ${getMonthName(selectedMonth)} opened in new tab for viewing`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF report",
        variant: "destructive",
      });
    }
  };

  if (casesLoading || statsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-acclaim-teal mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading monthly statement...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Monthly Statement Report</h1>
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

      {/* Month Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Select Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex-1 max-w-xs">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month, index) => (
                    <SelectItem key={`${month.value}-${index}`} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-600">
              Showing data for {getMonthName(selectedMonth)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Monthly Summary - {getMonthName(selectedMonth)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Payments</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(monthlyData?.totalPayments || 0)}
                  </p>
                </div>
                <PoundSterling className="h-8 w-8 text-purple-600" />
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Number of Payments</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {monthlyData?.paymentsCount || 0}
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments This Month */}
      <Card>
        <CardHeader>
          <CardTitle>Payments Received - {getMonthName(selectedMonth)}</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData?.paymentsInMonth.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">Account Number</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Debtor Name</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Amount</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Date</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Method</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.paymentsInMonth.map((payment: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-2 font-medium">
                        {payment.accountNumber}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        {payment.caseName}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 font-medium text-green-600">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        {formatDate(payment.createdAt)}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        <Badge variant="outline">
                          {payment.paymentMethod || 'N/A'}
                        </Badge>
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        {payment.reference || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-green-800">Total Payments:</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(monthlyData.totalPayments)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No payments received in {getMonthName(selectedMonth)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}