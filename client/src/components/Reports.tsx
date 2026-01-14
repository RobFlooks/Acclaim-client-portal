import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Download, FileText, TrendingUp, PieChart, CreditCard, Calendar, Lightbulb, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const AVAILABLE_FIELDS = [
  { id: "accountNumber", label: "Account Number", category: "case" },
  { id: "caseName", label: "Case Name", category: "case" },
  { id: "externalReference", label: "External Reference", category: "case" },
  { id: "debtorType", label: "Debtor Type", category: "case" },
  { id: "status", label: "Status", category: "case" },
  { id: "stage", label: "Stage", category: "case" },
  { id: "debtorName", label: "Debtor Name", category: "debtor" },
  { id: "originalAmount", label: "Original Amount", category: "financial" },
  { id: "totalDebt", label: "Total Debt", category: "financial" },
  { id: "costsAdded", label: "Costs Added", category: "financial" },
  { id: "interestAdded", label: "Interest Added", category: "financial" },
  { id: "feesAdded", label: "Fees Added", category: "financial" },
  { id: "outstandingAmount", label: "Outstanding Amount", category: "financial" },
  { id: "totalPayments", label: "Total Payments", category: "financial" },
  { id: "paymentCount", label: "Payment Count", category: "financial" },
  { id: "lastActivityDate", label: "Last Activity Date", category: "dates" },
  { id: "organisationName", label: "Organisation Name", category: "case" },
];

export default function Reports() {
  const { toast } = useToast();
  const [selectedFields, setSelectedFields] = useState<string[]>(["accountNumber", "caseName", "status", "outstandingAmount"]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleViewReport = (reportType: string) => {
    if (reportType === "Case Summary Report") {
      // Navigate to case summary report page
      window.location.href = '/case-summary-report';
    } else if (reportType === "Recovery Analysis") {
      // Navigate to recovery analysis report page
      window.location.href = '/recovery-analysis-report';
    } else if (reportType === "Monthly Statement") {
      // Navigate to monthly statement report page
      window.location.href = '/monthly-statement-report';
    } else if (reportType === "Payment Performance") {
      // Navigate to payment performance report page
      window.location.href = '/payment-performance-report';
    } else {
      toast({
        title: "Report View",
        description: `${reportType} report view is not yet implemented.`,
      });
    }
  };

  const handleDownloadReport = (reportType: string) => {
    toast({
      title: "Download Report",
      description: `${reportType} report download is not yet implemented.`,
    });
  };



  const getStageBreakdown = () => {
    if (!cases || !Array.isArray(cases)) return { preLegal: 0, claim: 0, judgment: 0, enforcement: 0 };
    
    return cases.reduce((acc: any, case_: any) => {
      const stage = case_.stage?.toLowerCase();
      if (stage === 'pre-legal') {
        acc.preLegal++;
      } else if (stage === 'claim') {
        acc.claim++;
      } else if (stage === 'judgment') {
        acc.judgment++;
      } else if (stage === 'enforcement') {
        acc.enforcement++;
      }
      return acc;
    }, { preLegal: 0, claim: 0, judgment: 0, enforcement: 0 });
  };

  const getRecoveryAnalysis = () => {
    if (!cases || !Array.isArray(cases)) return { totalOriginal: 0, totalRecovered: 0, totalOutstanding: 0 };
    
    return cases.reduce((acc: any, case_: any) => {
      const original = parseFloat(case_.originalAmount || 0);
      const outstanding = parseFloat(case_.outstandingAmount || 0);
      // Use actual payments received, not calculated debt reduction
      const recovered = parseFloat(case_.totalPayments || 0);
      
      acc.totalOriginal += original;
      acc.totalRecovered += recovered;
      acc.totalOutstanding += outstanding;
      
      return acc;
    }, { totalOriginal: 0, totalRecovered: 0, totalOutstanding: 0 });
  };

  // Get active cases only for Report Summary
  const getActiveCasesAnalysis = () => {
    if (!cases || !Array.isArray(cases)) return { totalCases: 0, totalRecovered: 0, totalOutstanding: 0 };
    
    const activeCases = cases.filter((case_: any) => case_.status?.toLowerCase() !== 'closed');
    
    return activeCases.reduce((acc: any, case_: any) => {
      const outstanding = parseFloat(case_.outstandingAmount || 0);
      // Use actual payments received, not calculated debt reduction
      const recovered = parseFloat(case_.totalPayments || 0);
      
      acc.totalRecovered += recovered;
      acc.totalOutstanding += outstanding;
      
      return acc;
    }, { totalCases: activeCases.length, totalRecovered: 0, totalOutstanding: 0 });
  };

  const stageBreakdown = getStageBreakdown();
  const recoveryAnalysis = getRecoveryAnalysis();
  const activeCasesAnalysis = getActiveCasesAnalysis();

  // Filter cases for custom report
  const filteredCases = useMemo(() => {
    if (!cases || !Array.isArray(cases)) return [];
    if (statusFilter === "all") return cases;
    return cases.filter((c: any) => c.status?.toLowerCase() === statusFilter.toLowerCase());
  }, [cases, statusFilter]);

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(f => f !== fieldId)
        : [...prev, fieldId]
    );
  };

  const selectAllFields = () => {
    setSelectedFields(AVAILABLE_FIELDS.map(f => f.id));
  };

  const clearAllFields = () => {
    setSelectedFields([]);
  };

  const getCaseFieldValue = (caseItem: any, fieldId: string): string => {
    const originalAmount = parseFloat(caseItem.originalAmount || 0);
    const costsAdded = parseFloat(caseItem.costsAdded || 0);
    const interestAdded = parseFloat(caseItem.interestAdded || 0);
    const feesAdded = parseFloat(caseItem.feesAdded || 0);
    const totalDebt = originalAmount + costsAdded + interestAdded + feesAdded;

    switch (fieldId) {
      case "accountNumber": return caseItem.accountNumber || "";
      case "caseName": return caseItem.caseName || "";
      case "externalReference": return caseItem.externalReference || "";
      case "debtorType": return caseItem.debtorType || "";
      case "status": return caseItem.status || "";
      case "stage": return caseItem.stage || "";
      case "debtorName": return caseItem.debtorName || "";
      case "originalAmount": return formatCurrency(originalAmount);
      case "totalDebt": return formatCurrency(totalDebt);
      case "costsAdded": return formatCurrency(costsAdded);
      case "interestAdded": return formatCurrency(interestAdded);
      case "feesAdded": return formatCurrency(feesAdded);
      case "outstandingAmount": return formatCurrency(parseFloat(caseItem.outstandingAmount || 0));
      case "totalPayments": return formatCurrency(parseFloat(caseItem.totalPayments || 0));
      case "paymentCount": return String(caseItem.paymentCount || 0);
      case "lastActivityDate": 
        return caseItem.lastActivityDate 
          ? new Date(caseItem.lastActivityDate).toLocaleDateString('en-GB')
          : "";
      case "organisationName": return caseItem.organisationName || "";
      default: return "";
    }
  };

  const handleExportCustomExcel = async () => {
    if (selectedFields.length === 0) {
      toast({
        title: "No fields selected",
        description: "Please select at least one field to include in your report.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Custom Report');

      // Add headers
      const headers = selectedFields.map(fieldId => 
        AVAILABLE_FIELDS.find(f => f.id === fieldId)?.label || fieldId
      );
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { bold: true };
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0D9488' },
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'left' };
      });

      // Add data rows
      filteredCases.forEach((caseItem: any) => {
        const rowData = selectedFields.map(fieldId => getCaseFieldValue(caseItem, fieldId));
        worksheet.addRow(rowData);
      });

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        column.width = 18;
      });

      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Custom_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Report downloaded",
        description: `Custom report with ${filteredCases.length} cases exported to Excel.`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to generate Excel report.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCustomPDF = async () => {
    if (selectedFields.length === 0) {
      toast({
        title: "No fields selected",
        description: "Please select at least one field to include in your report.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const doc = new jsPDF({ orientation: selectedFields.length > 5 ? 'landscape' : 'portrait' });
      
      // Header
      doc.setFillColor(13, 148, 136);
      doc.rect(0, 0, doc.internal.pageSize.width, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('Custom Report', 14, 16);
      
      // Report info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 35);
      doc.text(`Total Cases: ${filteredCases.length}`, 14, 42);
      doc.text(`Status Filter: ${statusFilter === 'all' ? 'All Statuses' : statusFilter}`, 14, 49);

      // Table headers
      const headers = selectedFields.map(fieldId => 
        AVAILABLE_FIELDS.find(f => f.id === fieldId)?.label || fieldId
      );

      // Table data
      const tableData = filteredCases.map((caseItem: any) => 
        selectedFields.map(fieldId => getCaseFieldValue(caseItem, fieldId))
      );

      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 55,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { 
          fillColor: [13, 148, 136],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      doc.save(`Custom_Report_${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: "Report downloaded",
        description: `Custom report with ${filteredCases.length} cases exported to PDF.`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to generate PDF report.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Report Summary
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-muted-foreground mt-1">Active cases only</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-teal-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Cases</p>
                  <p className="text-2xl font-bold text-teal-700">
                    {casesLoading ? "..." : activeCasesAnalysis.totalCases}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-acclaim-teal" />
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Recovery</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {casesLoading ? "..." : formatCurrency(activeCasesAnalysis.totalRecovered)}
                  </p>
                </div>
                <PieChart className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Outstanding</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {casesLoading ? "..." : formatCurrency(activeCasesAnalysis.totalOutstanding)}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Case Stage Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Case Stage Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Pre-Legal</span>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {stageBreakdown.preLegal}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Claim</span>
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {stageBreakdown.claim}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Judgment</span>
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  {stageBreakdown.judgment}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Enforcement</span>
                </div>
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {stageBreakdown.enforcement}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
              Portal Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-teal-700">1</span>
                </div>
                <p className="text-sm text-gray-600">Use the <strong>Messages</strong> tab or send messages directly from within a case to communicate with our team.</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-teal-700">2</span>
                </div>
                <p className="text-sm text-gray-600">Upload documents directly to cases for faster processing and a complete audit trail.</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-teal-700">3</span>
                </div>
                <p className="text-sm text-gray-600">Track case progress in real-time through the <strong>Timeline</strong> on each case.</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-teal-700">4</span>
                </div>
                <p className="text-sm text-gray-600">Download reports and statements anytime from this Reports section.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Custom Report Builder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings2 className="h-5 w-5 mr-2" />
            Custom Report Builder
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-muted-foreground mt-1">
            Select the fields you want to include and download a custom report
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Status Filter</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on hold">On Hold</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="settled">Settled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllFields}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearAllFields}>
                  Clear All
                </Button>
              </div>
              <div className="text-sm text-gray-500">
                {filteredCases.length} cases • {selectedFields.length} fields selected
              </div>
            </div>

            {/* Field Selection */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-3 text-gray-700 dark:text-gray-300">Case Information</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {AVAILABLE_FIELDS.filter(f => f.category === "case").map((field) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.id}
                        checked={selectedFields.includes(field.id)}
                        onCheckedChange={() => toggleField(field.id)}
                      />
                      <Label htmlFor={field.id} className="text-sm cursor-pointer">
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-3 text-gray-700 dark:text-gray-300">Debtor Information</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {AVAILABLE_FIELDS.filter(f => f.category === "debtor").map((field) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.id}
                        checked={selectedFields.includes(field.id)}
                        onCheckedChange={() => toggleField(field.id)}
                      />
                      <Label htmlFor={field.id} className="text-sm cursor-pointer">
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-3 text-gray-700 dark:text-gray-300">Financial Details</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {AVAILABLE_FIELDS.filter(f => f.category === "financial").map((field) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.id}
                        checked={selectedFields.includes(field.id)}
                        onCheckedChange={() => toggleField(field.id)}
                      />
                      <Label htmlFor={field.id} className="text-sm cursor-pointer">
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-3 text-gray-700 dark:text-gray-300">Dates</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {AVAILABLE_FIELDS.filter(f => f.category === "dates").map((field) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.id}
                        checked={selectedFields.includes(field.id)}
                        onCheckedChange={() => toggleField(field.id)}
                      />
                      <Label htmlFor={field.id} className="text-sm cursor-pointer">
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <Button 
                onClick={handleExportCustomExcel}
                disabled={isGenerating || selectedFields.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                {isGenerating ? "Generating..." : "Download Excel"}
              </Button>
              <Button 
                onClick={handleExportCustomPDF}
                disabled={isGenerating || selectedFields.length === 0}
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50"
              >
                <Download className="h-4 w-4 mr-2" />
                {isGenerating ? "Generating..." : "Download PDF"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Reports */}
      <Card>
        <CardHeader>
          <CardTitle>View Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">Case Summary Report</h4>
                  <p className="text-sm text-gray-600">Overview of all cases</p>
                </div>
                <FileText className="h-8 w-8 text-acclaim-teal" />
              </div>
              <Button 
                onClick={() => handleViewReport("Case Summary Report")}
                className="w-full bg-acclaim-teal hover:bg-acclaim-teal/90"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Report
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">Payment Performance</h4>
                  <p className="text-sm text-gray-600">Payment patterns and trends</p>
                </div>
                <CreditCard className="h-8 w-8 text-green-600" />
              </div>
              <Button 
                onClick={() => handleViewReport("Payment Performance")}
                variant="outline"
                className="w-full border-green-500 text-green-600 hover:bg-green-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Report
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">Monthly Statement</h4>
                  <p className="text-sm text-gray-600">Monthly account activity</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <Button 
                onClick={() => handleViewReport("Monthly Statement")}
                variant="outline"
                className="w-full border-purple-500 text-purple-600 hover:bg-purple-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
