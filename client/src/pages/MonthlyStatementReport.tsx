import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, FileText, TrendingUp, Calendar, PoundSterling, User } from "lucide-react";
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
          debtorName: case_.debtorName
        })));
      }
      return acc;
    }, []);

    const totalPayments = paymentsInMonth.reduce((sum: number, payment: any) => 
      sum + parseFloat(payment.amount), 0);

    const newCasesCount = filteredCases.length;
    const closedCasesCount = cases.filter((case_: any) => {
      const updatedDate = new Date(case_.updatedAt);
      return case_.status === 'closed' && updatedDate >= startDate && updatedDate <= endDate;
    }).length;

    return {
      filteredCases,
      paymentsInMonth,
      totalPayments,
      newCasesCount,
      closedCasesCount,
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
      ['New Cases', monthlyData.newCasesCount],
      ['Closed Cases', monthlyData.closedCasesCount],
      ['Total Payments', formatCurrency(monthlyData.totalPayments)],
      [''],
      ['Cases Created This Month']
    ];

    // Add case headers
    summaryData.push(['Account Number', 'Debtor Name', 'Original Amount', 'Outstanding Amount', 'Status', 'Created Date']);
    
    // Add case data
    monthlyData.filteredCases.forEach((case_: any) => {
      summaryData.push([
        case_.accountNumber,
        case_.debtorName,
        formatCurrency(case_.originalAmount),
        formatCurrency(case_.outstandingAmount),
        case_.status,
        formatDate(case_.createdAt)
      ]);
    });

    // Add payments section
    if (monthlyData.paymentsInMonth.length > 0) {
      summaryData.push([''], ['Payments Received This Month']);
      summaryData.push(['Account Number', 'Debtor Name', 'Amount', 'Date', 'Method', 'Reference']);
      
      monthlyData.paymentsInMonth.forEach((payment: any) => {
        summaryData.push([
          payment.accountNumber,
          payment.debtorName,
          formatCurrency(payment.amount),
          formatDate(payment.createdAt),
          payment.paymentMethod || 'N/A',
          payment.reference || 'N/A'
        ]);
      });
    }

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
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Monthly Statement Report', 20, 20);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Month: ${getMonthName(selectedMonth)}`, 20, 35);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 20, 45);
      
      // Summary section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Monthly Summary', 20, 65);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`New Cases: ${monthlyData.newCasesCount}`, 20, 80);
      doc.text(`Closed Cases: ${monthlyData.closedCasesCount}`, 20, 90);
      doc.text(`Total Payments: ${formatCurrency(monthlyData.totalPayments)}`, 20, 100);
      
      let yPosition = 120;
      
      // New Cases Table
      if (monthlyData.filteredCases.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('New Cases This Month', 20, yPosition);
        yPosition += 10;
        
        const caseTableData = monthlyData.filteredCases.map((case_: any) => [
          case_.accountNumber,
          case_.debtorName,
          formatCurrency(case_.originalAmount),
          formatCurrency(case_.outstandingAmount),
          case_.status,
          formatDate(case_.createdAt)
        ]);
        
        (doc as any).autoTable({
          head: [['Account Number', 'Debtor Name', 'Original Amount', 'Outstanding', 'Status', 'Created Date']],
          body: caseTableData,
          startY: yPosition,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [15, 118, 110] },
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 20;
      }
      
      // Payments Table
      if (monthlyData.paymentsInMonth.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Payments Received This Month', 20, yPosition);
        yPosition += 10;
        
        const paymentsTableData = monthlyData.paymentsInMonth.map((payment: any) => [
          payment.accountNumber,
          payment.debtorName,
          formatCurrency(payment.amount),
          formatDate(payment.createdAt),
          payment.paymentMethod || 'N/A',
          payment.reference || 'N/A'
        ]);
        
        (doc as any).autoTable({
          head: [['Account Number', 'Debtor Name', 'Amount', 'Date', 'Method', 'Reference']],
          body: paymentsTableData,
          startY: yPosition,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [15, 118, 110] },
        });
      }
      
      doc.save(`monthly-statement-${selectedMonth}.pdf`);
      
      toast({
        title: "PDF Downloaded",
        description: `Monthly statement PDF for ${getMonthName(selectedMonth)} downloaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF",
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
            Download PDF
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">New Cases</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {monthlyData?.newCasesCount || 0}
                  </p>
                </div>
                <User className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Closed Cases</p>
                  <p className="text-2xl font-bold text-green-600">
                    {monthlyData?.closedCasesCount || 0}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
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
          </div>
        </CardContent>
      </Card>

      {/* New Cases This Month */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>New Cases - {getMonthName(selectedMonth)}</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData?.filteredCases.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">Account Number</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Debtor Name</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Original Amount</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Outstanding Amount</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Status</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Created Date</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.filteredCases.map((case_: any) => (
                    <tr key={case_.id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-2 font-medium">
                        {case_.accountNumber}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        {case_.debtorName}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        {formatCurrency(case_.originalAmount)}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        {formatCurrency(case_.outstandingAmount)}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        <Badge variant={case_.status === 'closed' ? 'secondary' : 'default'}>
                          {case_.status}
                        </Badge>
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        {formatDate(case_.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No new cases created in {getMonthName(selectedMonth)}
            </div>
          )}
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
                        {payment.debtorName}
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