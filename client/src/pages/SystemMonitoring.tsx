import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Activity, Users, AlertTriangle, Shield, Clock, Download, Search, Filter } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

interface SystemAnalytics {
  totalUsers: number;
  activeUsers: number;
  totalCases: number;
  activeCases: number;
  totalOrganisations: number;
  recentActivity: number;
  failedLogins: number;
  systemHealth: string;
}

interface ActivityLog {
  id: number;
  userId: string;
  action: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
}

interface LoginAttempt {
  id: number;
  email: string;
  success: boolean;
  ipAddress: string;
  userAgent: string;
  failureReason?: string;
  timestamp: string;
}

interface SystemMetric {
  id: number;
  metricName: string;
  metricValue: number;
  recordedAt: string;
}

export default function SystemMonitoring() {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'logins' | 'metrics'>('overview');
  const [searchTerm, setSearchTerm] = useState("");
  const [limitResults, setLimitResults] = useState("100");
  const [filterUser, setFilterUser] = useState("");

  // Fetch system analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery<SystemAnalytics>({
    queryKey: ["/api/admin/system/analytics"],
    retry: false,
  });

  // Fetch activity logs
  const { data: activityLogs, isLoading: activityLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/admin/system/activity-logs", { userId: filterUser || undefined, limit: limitResults }],
    retry: false,
  });

  // Fetch login attempts
  const { data: loginAttempts, isLoading: loginAttemptsLoading } = useQuery<LoginAttempt[]>({
    queryKey: ["/api/admin/system/login-attempts", { limit: limitResults }],
    retry: false,
  });

  // Fetch failed logins
  const { data: failedLogins, isLoading: failedLoginsLoading } = useQuery<LoginAttempt[]>({
    queryKey: ["/api/admin/system/failed-logins", { limit: limitResults }],
    retry: false,
  });

  // Fetch system metrics
  const { data: systemMetrics, isLoading: metricsLoading } = useQuery<SystemMetric[]>({
    queryKey: ["/api/admin/system/metrics", { limit: limitResults }],
    retry: false,
  });

  const getHealthBadgeColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filterActivityLogs = (logs: ActivityLog[]) => {
    if (!searchTerm) return logs;
    return logs.filter(log => 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filterLoginAttempts = (attempts: LoginAttempt[]) => {
    if (!searchTerm) return attempts;
    return attempts.filter(attempt => 
      attempt.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attempt.ipAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attempt.failureReason?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const exportData = (data: any[], filename: string) => {
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Monitoring</h1>
              <p className="text-gray-600 dark:text-gray-300">Monitor system health, user activity, and security</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Real-time Monitoring</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity Logs</TabsTrigger>
            <TabsTrigger value="logins">Login Attempts</TabsTrigger>
            <TabsTrigger value="metrics">System Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {analytics?.activeUsers || 0} active in last 30 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.totalCases || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {analytics?.activeCases || 0} active cases
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Organisations</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.totalOrganisations || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Active organisations
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Health</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <Badge className={`${getHealthBadgeColor(analytics?.systemHealth || 'unknown')} text-white`}>
                    {analytics?.systemHealth || 'Unknown'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    {analytics?.failedLogins || 0} failed logins today
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Activity in the last 24 hours: {analytics?.recentActivity || 0} actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activityLogs?.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{log.action}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {log.userEmail} • {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security Alerts</CardTitle>
                  <CardDescription>
                    Failed login attempts: {analytics?.failedLogins || 0}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {failedLogins?.slice(0, 5).map((attempt) => (
                      <div key={attempt.id} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Failed login attempt</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {attempt.email} from {attempt.ipAddress} • {format(new Date(attempt.timestamp), 'MMM d, HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>User Activity Logs</CardTitle>
                <CardDescription>
                  Complete log of user actions and system events
                </CardDescription>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    <Input
                      placeholder="Search activities..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <Input
                      placeholder="Filter by user ID..."
                      value={filterUser}
                      onChange={(e) => setFilterUser(e.target.value)}
                      className="w-48"
                    />
                  </div>
                  <Select value={limitResults} onValueChange={setLimitResults}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50 results</SelectItem>
                      <SelectItem value="100">100 results</SelectItem>
                      <SelectItem value="200">200 results</SelectItem>
                      <SelectItem value="500">500 results</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={() => exportData(activityLogs || [], 'activity-logs')}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Loading activity logs...
                          </TableCell>
                        </TableRow>
                      ) : (
                        filterActivityLogs(activityLogs || []).map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{log.userFirstName} {log.userLastName}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{log.userEmail}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.action}</Badge>
                            </TableCell>
                            <TableCell className="max-w-md truncate">{log.details}</TableCell>
                            <TableCell className="font-mono text-sm">{log.ipAddress}</TableCell>
                            <TableCell>{format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logins">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Login Attempts</CardTitle>
                  <CardDescription>
                    Complete log of successful and failed login attempts
                  </CardDescription>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      <Input
                        placeholder="Search logins..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-64"
                      />
                    </div>
                    <Button 
                      onClick={() => exportData(loginAttempts || [], 'login-attempts')}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loginAttemptsLoading ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8">
                              Loading login attempts...
                            </TableCell>
                          </TableRow>
                        ) : (
                          filterLoginAttempts(loginAttempts || []).map((attempt) => (
                            <TableRow key={attempt.id}>
                              <TableCell>{attempt.email}</TableCell>
                              <TableCell>
                                <Badge variant={attempt.success ? "default" : "destructive"}>
                                  {attempt.success ? "Success" : "Failed"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{attempt.ipAddress}</TableCell>
                              <TableCell>{format(new Date(attempt.timestamp), 'MMM d, yyyy HH:mm:ss')}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Failed Login Attempts</CardTitle>
                  <CardDescription>
                    Security monitoring for failed authentication attempts
                  </CardDescription>
                  <div className="flex items-center gap-4 mt-4">
                    <Button 
                      onClick={() => exportData(failedLogins || [], 'failed-logins')}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {failedLoginsLoading ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8">
                              Loading failed logins...
                            </TableCell>
                          </TableRow>
                        ) : (
                          filterLoginAttempts(failedLogins || []).map((attempt) => (
                            <TableRow key={attempt.id}>
                              <TableCell>{attempt.email}</TableCell>
                              <TableCell>
                                <Badge variant="destructive">
                                  {attempt.failureReason || "Unknown"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{attempt.ipAddress}</TableCell>
                              <TableCell>{format(new Date(attempt.timestamp), 'MMM d, yyyy HH:mm:ss')}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="metrics">
            <Card>
              <CardHeader>
                <CardTitle>System Metrics</CardTitle>
                <CardDescription>
                  Performance and system health metrics over time
                </CardDescription>
                <div className="flex items-center gap-4 mt-4">
                  <Button 
                    onClick={() => exportData(systemMetrics || [], 'system-metrics')}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric Name</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Recorded At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metricsLoading ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8">
                            Loading system metrics...
                          </TableCell>
                        </TableRow>
                      ) : (
                        (systemMetrics || []).map((metric) => (
                          <TableRow key={metric.id}>
                            <TableCell>
                              <Badge variant="outline">{metric.metricName}</Badge>
                            </TableCell>
                            <TableCell className="font-mono">{metric.metricValue}</TableCell>
                            <TableCell>{format(new Date(metric.recordedAt), 'MMM d, yyyy HH:mm:ss')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}