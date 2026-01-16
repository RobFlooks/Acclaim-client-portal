import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Activity, Users, AlertTriangle, Shield, Clock, Download, Search, Filter, CheckCircle, AlertCircle, XCircle, Lock, Unlock, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  createdAt: string;
}

interface SystemMetric {
  id: number;
  metricName: string;
  metricValue: number;
  recordedAt: string;
}

interface SystemHealth {
  metric: string;
  value: number;
  status: string;
  timestamp: Date;
}

interface RateLimitStats {
  totalTracked: number;
  currentlyLocked: number;
  maxAttempts: number;
  lockoutMinutes: number;
}

interface LockedAccount {
  identifier: string;
  username?: string;
  attempts: number;
  lockedUntil: string;
  remainingMinutes: number;
}

interface RateLimitAttempt {
  identifier: string;
  username?: string;
  attempts: number;
  lockedUntil: string | null;
  lastAttempt: string;
}

export default function SystemMonitoring() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'logins' | 'metrics' | 'security'>('overview');
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
    queryKey: ["/api/admin/system/activity-logs", filterUser, limitResults],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterUser) params.append('userId', filterUser);
      params.append('limit', limitResults);
      
      const response = await fetch(`/api/admin/system/activity-logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }
      return response.json();
    },
    retry: false,
  });

  // Fetch login attempts
  const { data: loginAttempts, isLoading: loginAttemptsLoading } = useQuery<LoginAttempt[]>({
    queryKey: ["/api/admin/system/login-attempts", limitResults],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', limitResults);
      
      const response = await fetch(`/api/admin/system/login-attempts?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch login attempts');
      }
      return response.json();
    },
    retry: false,
  });

  // Fetch failed logins
  const { data: failedLogins, isLoading: failedLoginsLoading } = useQuery<LoginAttempt[]>({
    queryKey: ["/api/admin/system/failed-logins", limitResults],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', limitResults);
      
      const response = await fetch(`/api/admin/system/failed-logins?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch failed logins');
      }
      return response.json();
    },
    retry: false,
  });

  // Fetch system metrics
  const { data: systemMetrics, isLoading: metricsLoading } = useQuery<SystemMetric[]>({
    queryKey: ["/api/admin/system/metrics", limitResults],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', limitResults);
      
      const response = await fetch(`/api/admin/system/metrics?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch system metrics');
      }
      return response.json();
    },
    retry: false,
  });

  // Fetch system health metrics (from Advanced Reports) - auto-refresh every 30 seconds
  const { data: systemHealthData = [], isLoading: isLoadingSystemHealth } = useQuery<SystemHealth[]>({
    queryKey: ['/api/admin/reports/system-health'],
    retry: false,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch rate limit stats
  const { data: rateLimitStats, isLoading: rateLimitStatsLoading, refetch: refetchRateLimitStats } = useQuery<RateLimitStats>({
    queryKey: ["/api/admin/system/rate-limit/stats"],
    retry: false,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch locked accounts
  const { data: lockedAccounts = [], isLoading: lockedAccountsLoading, refetch: refetchLockedAccounts } = useQuery<LockedAccount[]>({
    queryKey: ["/api/admin/system/rate-limit/locked"],
    retry: false,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch all rate limit attempts
  const { data: rateLimitAttempts = [], isLoading: rateLimitAttemptsLoading, refetch: refetchRateLimitAttempts } = useQuery<RateLimitAttempt[]>({
    queryKey: ["/api/admin/system/rate-limit/attempts"],
    retry: false,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Unlock account mutation
  const unlockMutation = useMutation({
    mutationFn: async (identifier: string) => {
      const res = await apiRequest("POST", "/api/admin/system/rate-limit/unlock", { identifier });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Account Unlocked",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system/rate-limit/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system/rate-limit/locked"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system/rate-limit/attempts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Unlock Failed",
        description: error.message,
        variant: "destructive",
      });
    },
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'critical':
        return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const formatDateTime = (dateValue: string | Date | null | undefined): string => {
    if (!dateValue) return 'No timestamp';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'Invalid date';
      return format(date, 'MMM d, yyyy HH:mm:ss');
    } catch (error) {
      return 'Invalid date';
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
        <div className="flex flex-col space-y-4 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">System Monitoring</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">Monitor system health, user activity, and security</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Real-time Monitoring</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="logins">Logins</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
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
                            {attempt.email} from {attempt.ipAddress} • {formatDateTime(attempt.createdAt).split(' ').slice(0, 3).join(' ')}
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
                      ) : filterActivityLogs(activityLogs || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            No activity logs found
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
                        ) : filterLoginAttempts(loginAttempts || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                              No login attempts found
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
                              <TableCell>{formatDateTime(attempt.createdAt)}</TableCell>
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
                        ) : filterLoginAttempts(failedLogins || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                              No failed login attempts found
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
                              <TableCell>{formatDateTime(attempt.createdAt)}</TableCell>
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

          <TabsContent value="metrics" className="space-y-6">
            {/* System Health Dashboard */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                    onClick={() => exportData(systemHealthData, 'system-health-metrics')}
                    disabled={!systemHealthData || systemHealthData.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Health Data
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingSystemHealth ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : systemHealthData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No system health metrics available
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {systemHealthData.map((metric: SystemHealth, index: number) => (
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
                    
                    <div className="overflow-x-auto rounded-md border">
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
                          {systemHealthData.map((metric: SystemHealth, index: number) => (
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

            {/* System Metrics Table */}
            <Card>
              <CardHeader>
                <CardTitle>Historical System Metrics</CardTitle>
                <CardDescription>
                  Performance and system metrics recorded over time
                </CardDescription>
                <div className="flex items-center gap-4 mt-4">
                  <Button 
                    onClick={() => exportData(systemMetrics || [], 'system-metrics')}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Metrics
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
                      ) : (systemMetrics || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                            No system metrics found
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

          {/* Security Tab - Rate Limiting & Lockouts */}
          <TabsContent value="security">
            <div className="space-y-6">
              {/* Rate Limit Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Currently Locked</CardTitle>
                    <Lock className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {rateLimitStatsLoading ? "..." : rateLimitStats?.currentlyLocked || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Accounts locked out</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Tracked IPs</CardTitle>
                    <Shield className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {rateLimitStatsLoading ? "..." : rateLimitStats?.totalTracked || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">IPs with failed attempts</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Max Attempts</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {rateLimitStatsLoading ? "..." : rateLimitStats?.maxAttempts || 5}
                    </div>
                    <p className="text-xs text-muted-foreground">Before lockout</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Lockout Duration</CardTitle>
                    <Clock className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {rateLimitStatsLoading ? "..." : rateLimitStats?.lockoutMinutes || 15} min
                    </div>
                    <p className="text-xs text-muted-foreground">Auto-unlock period</p>
                  </CardContent>
                </Card>
              </div>

              {/* Locked Accounts Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-red-500" />
                        Currently Locked Accounts
                      </CardTitle>
                      <CardDescription>
                        Accounts that have exceeded the maximum failed login attempts
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        refetchRateLimitStats();
                        refetchLockedAccounts();
                        refetchRateLimitAttempts();
                      }}
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Failed Attempts</TableHead>
                          <TableHead>Locked Until</TableHead>
                          <TableHead>Remaining</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lockedAccountsLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : lockedAccounts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                              <div className="flex flex-col items-center gap-2">
                                <CheckCircle className="h-8 w-8 text-green-500" />
                                <span>No accounts are currently locked</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          lockedAccounts.map((account) => (
                            <TableRow key={account.identifier}>
                              <TableCell className="font-mono text-sm">{account.identifier}</TableCell>
                              <TableCell>
                                {account.username ? (
                                  <Badge variant="secondary">{account.username}</Badge>
                                ) : (
                                  <span className="text-gray-400 italic">Unknown</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="destructive">{account.attempts}</Badge>
                              </TableCell>
                              <TableCell>{format(new Date(account.lockedUntil), 'HH:mm:ss')}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-orange-600">
                                  {account.remainingMinutes} min
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => unlockMutation.mutate(account.identifier)}
                                  disabled={unlockMutation.isPending}
                                >
                                  {unlockMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Unlock className="h-4 w-4 mr-1" />
                                      Unlock
                                    </>
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* All Rate Limit Attempts Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Failed Login Attempts Tracker
                  </CardTitle>
                  <CardDescription>
                    All IP addresses with failed login attempts (clears on server restart)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Failed Attempts</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Attempt</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rateLimitAttemptsLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : rateLimitAttempts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                              No failed login attempts recorded
                            </TableCell>
                          </TableRow>
                        ) : (
                          rateLimitAttempts.map((attempt) => (
                            <TableRow key={attempt.identifier}>
                              <TableCell className="font-mono text-sm">{attempt.identifier}</TableCell>
                              <TableCell>
                                {attempt.username ? (
                                  <Badge variant="secondary">{attempt.username}</Badge>
                                ) : (
                                  <span className="text-gray-400 italic">Unknown</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={attempt.attempts >= (rateLimitStats?.maxAttempts || 5) ? "destructive" : "secondary"}>
                                  {attempt.attempts}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {attempt.lockedUntil ? (
                                  <Badge className="bg-red-100 text-red-800">Locked</Badge>
                                ) : (
                                  <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
                                )}
                              </TableCell>
                              <TableCell>{format(new Date(attempt.lastAttempt), 'HH:mm:ss')}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => unlockMutation.mutate(attempt.identifier)}
                                  disabled={unlockMutation.isPending}
                                >
                                  {unlockMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Clear
                                    </>
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">Rate Limiting Information</h4>
                      <ul className="mt-2 text-sm text-blue-800 dark:text-blue-200 space-y-1">
                        <li>• Failed login attempts are tracked by IP address</li>
                        <li>• After {rateLimitStats?.maxAttempts || 5} failed attempts, the IP is locked for {rateLimitStats?.lockoutMinutes || 15} minutes</li>
                        <li>• Lockouts automatically expire after the duration period</li>
                        <li>• Rate limit data is stored in memory and clears on server restart</li>
                        <li>• All lockout events are logged to the System Audit for tracking</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}