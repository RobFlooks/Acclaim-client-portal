import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { ArrowLeft, Download, FileText, Users, Building, Activity, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface CrossOrgPerformance {
  organisationId: number;
  organisationName: string;
  totalCases: number;
  activeCases: number;
  closedCases: number;
  totalOutstanding: string;
  totalRecovered: string;
  recoveryRate: number;
  averageCaseAge: number;
  userCount: number;
}

interface UserActivity {
  userId: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
  organisationName: string;
  loginCount: number;
  lastLogin: Date;
  actionCount: number;
  casesCreated: number;
  messagesSent: number;
  documentsUploaded: number;
}

interface SystemHealth {
  metric: string;
  value: number;
  status: string;
  timestamp: Date;
}

interface CustomReportConfig {
  tables: string[];
  filters: Record<string, any>;
  groupBy?: string[];
  orderBy?: string;
  limit?: number;
}

export default function AdvancedReports() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [customConfig, setCustomConfig] = useState<CustomReportConfig>({
    tables: ['cases'],
    filters: {},
    limit: 100
  });
  const [customReportData, setCustomReportData] = useState<any[]>([]);
  const [isGeneratingCustomReport, setIsGeneratingCustomReport] = useState(false);

  // Check admin access
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user?.isAdmin)) {
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
  }, [isAuthenticated, isLoading, user, toast]);

  // Cross-organisation performance query
  const { data: crossOrgData = [], isLoading: isLoadingCrossOrg } = useQuery({
    queryKey: ['/api/admin/reports/cross-organisation'],
    retry: false
  });

  // User activity report query
  const { data: userActivityData = [], isLoading: isLoadingUserActivity } = useQuery({
    queryKey: ['/api/admin/reports/user-activity', dateRange],
    retry: false
  });

  // System health metrics query
  const { data: systemHealthData = [], isLoading: isLoadingSystemHealth } = useQuery({
    queryKey: ['/api/admin/reports/system-health'],
    retry: false
  });

  const generateCustomReport = async () => {
    setIsGeneratingCustomReport(true);
    try {
      const response = await apiRequest('POST', '/api/admin/reports/custom', customConfig);
      const data = await response.json();
      setCustomReportData(data);
      toast({
        title: "Success",
        description: "Custom report generated successfully",
      });
    } catch (error) {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to generate custom report",
          variant: "destructive",
        });
      }
    } finally {
      setIsGeneratingCustomReport(false);
    }
  };

  const exportToJSON = (data: any, filename: string) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };



  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'warning':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoading || !isAuthenticated || !user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-acclaim-teal mx-auto mb-4"></div>
          <p className="mt-2 text-gray-600">Loading advanced reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/?section=reports">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Advanced Reports</h1>
            <p className="text-gray-600">Comprehensive analytics and custom reporting</p>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="cross-org" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cross-org">Cross-Organisation</TabsTrigger>
          <TabsTrigger value="user-activity">User Activity</TabsTrigger>
          <TabsTrigger value="system-health">System Health</TabsTrigger>
          <TabsTrigger value="custom-reports">Custom Reports</TabsTrigger>
        </TabsList>

        {/* Cross-Organisation Performance */}
        <TabsContent value="cross-org" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    Cross-Organisation Performance
                  </CardTitle>
                  <CardDescription>Compare performance metrics across all organisations</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToJSON(crossOrgData, 'cross-organisation-performance')}
                  disabled={!crossOrgData}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingCrossOrg ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-acclaim-teal"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organisation</TableHead>
                        <TableHead>Total Cases</TableHead>
                        <TableHead>Active Cases</TableHead>
                        <TableHead>Closed Cases</TableHead>
                        <TableHead>Outstanding</TableHead>
                        <TableHead>Recovered</TableHead>
                        <TableHead>Recovery Rate</TableHead>
                        <TableHead>Avg Case Age</TableHead>
                        <TableHead>Users</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {crossOrgData?.map((org: CrossOrgPerformance) => (
                        <TableRow key={org.organisationId}>
                          <TableCell className="font-medium">{org.organisationName}</TableCell>
                          <TableCell>{org.totalCases}</TableCell>
                          <TableCell>{org.activeCases}</TableCell>
                          <TableCell>{org.closedCases}</TableCell>
                          <TableCell>£{parseFloat(org.totalOutstanding).toLocaleString()}</TableCell>
                          <TableCell>£{parseFloat(org.totalRecovered).toLocaleString()}</TableCell>
                          <TableCell>{org.recoveryRate.toFixed(1)}%</TableCell>
                          <TableCell>{Math.round(org.averageCaseAge)} days</TableCell>
                          <TableCell>{org.userCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Activity Report */}
        <TabsContent value="user-activity" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    User Activity Report
                  </CardTitle>
                  <CardDescription>Track user engagement and activity patterns</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <Input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                      className="w-40"
                    />
                    <Input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                      className="w-40"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportToJSON(userActivityData, 'user-activity-report')}
                    disabled={!userActivityData}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingUserActivity ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-acclaim-teal"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Organisation</TableHead>
                        <TableHead>Login Count</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Actions</TableHead>
                        <TableHead>Cases Created</TableHead>
                        <TableHead>Messages Sent</TableHead>
                        <TableHead>Documents Uploaded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userActivityData?.map((user: UserActivity) => (
                        <TableRow key={user.userId}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.userFirstName} {user.userLastName}</div>
                              <div className="text-sm text-gray-500">{user.userEmail}</div>
                            </div>
                          </TableCell>
                          <TableCell>{user.organisationName}</TableCell>
                          <TableCell>{user.loginCount}</TableCell>
                          <TableCell>
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                          </TableCell>
                          <TableCell>{user.actionCount}</TableCell>
                          <TableCell>{user.casesCreated}</TableCell>
                          <TableCell>{user.messageseSent}</TableCell>
                          <TableCell>{user.documentsUploaded}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Health Dashboard */}
        <TabsContent value="system-health" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    System Health Dashboard
                  </CardTitle>
                  <CardDescription>Monitor system performance and health metrics</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToJSON(systemHealthData, 'system-health-metrics')}
                  disabled={!systemHealthData}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSystemHealth ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-acclaim-teal"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {systemHealthData?.map((metric: SystemHealth, index: number) => (
                      <Card key={index}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(metric.status)}
                              <div>
                                <p className="text-sm font-medium">{metric.metric}</p>
                                <p className="text-2xl font-bold">{metric.value}</p>
                              </div>
                            </div>
                            {getStatusBadge(metric.status)}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Metric</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {systemHealthData?.map((metric: SystemHealth, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{metric.metric}</TableCell>
                            <TableCell>{metric.value}</TableCell>
                            <TableCell>{getStatusBadge(metric.status)}</TableCell>
                            <TableCell>{new Date(metric.timestamp).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Report Builder */}
        <TabsContent value="custom-reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Custom Report Builder
              </CardTitle>
              <CardDescription>Build custom reports with flexible data selection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tables</label>
                  <Select
                    value={customConfig.tables.join(',')}
                    onValueChange={(value) => setCustomConfig({
                      ...customConfig,
                      tables: value.split(',')
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tables" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cases">Cases</SelectItem>
                      <SelectItem value="users">Users</SelectItem>
                      <SelectItem value="cases,organisations">Cases & Organisations</SelectItem>
                      <SelectItem value="users,organisations">Users & Organisations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Limit</label>
                  <Input
                    type="number"
                    value={customConfig.limit}
                    onChange={(e) => setCustomConfig({
                      ...customConfig,
                      limit: parseInt(e.target.value) || 100
                    })}
                    placeholder="100"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status Filter</label>
                  <Select
                    value={customConfig.filters.status || 'all'}
                    onValueChange={(value) => setCustomConfig({
                      ...customConfig,
                      filters: { ...customConfig.filters, status: value === 'all' ? undefined : value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button 
                  onClick={generateCustomReport}
                  disabled={isGeneratingCustomReport}
                  className="bg-acclaim-teal hover:bg-acclaim-teal/90"
                >
                  {isGeneratingCustomReport ? 'Generating...' : 'Generate Report'}
                </Button>
                {customReportData.length > 0 && (
                  <Button 
                    variant="outline"
                    onClick={() => exportToJSON(customReportData, 'custom-report')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                )}
              </div>

              {customReportData.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(customReportData[0]).map((key) => (
                          <TableHead key={key}>{key}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customReportData.slice(0, 10).map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value: any, cellIndex) => (
                            <TableCell key={cellIndex}>
                              {typeof value === 'object' && value !== null
                                ? JSON.stringify(value)
                                : String(value)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {customReportData.length > 10 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Showing first 10 rows of {customReportData.length} total rows
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}