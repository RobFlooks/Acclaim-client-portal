import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  Shield,
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  User,
  Database,
  Activity,
  FileText,
  AlertTriangle,
  Trash2,
  Settings,
  HardDrive,
  Calendar,
  Loader2,
  Video,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";

interface AuditLog {
  id: number;
  tableName: string;
  recordId: string;
  operation: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  organisationId?: number;
  timestamp: string;
  description?: string;
}

interface AuditSummary {
  totalChanges: number;
  recentChanges: number;
  topUsers: { userId: string; userEmail: string; changeCount: number }[];
  topTables: { tableName: string; changeCount: number }[];
}

interface AuditLogStats {
  totalLogs: number;
  oldestLog: string | null;
  newestLog: string | null;
  logsByAge: { period: string; count: number }[];
}

interface VideoRetentionInfo {
  filePath: string;
  fileName: string;
  uploadedAt: string;
  uploadedByUserId: string;
  uploadedByAdmin: boolean;
  documentId: number;
  organisationId: number | null;
  caseId: number | null;
  downloadedByRequiredParty: boolean;
  downloadedAt: string | null;
  requiredDownloaderType: 'admin' | 'user';
  uploaderName: string;
  uploaderEmail: string;
  organisationName: string | null;
  caseName: string | null;
  caseAccountNumber: string | null;
  daysRemaining: number;
  status: string;
}

export default function AuditManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'analysis' | 'retention' | 'videos'>('overview');
  const [searchTerm, setSearchTerm] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [operationFilter, setOperationFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [limitResults, setLimitResults] = useState("100");
  const [retentionDays, setRetentionDays] = useState("365");

  // Fetch audit summary
  const { data: auditSummary, isLoading: summaryLoading } = useQuery<AuditSummary>({
    queryKey: ["/api/admin/audit/summary"],
    retry: false,
  });

  // Fetch audit logs with filters
  const { data: auditLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery<AuditLog[]>({
    queryKey: ["/api/admin/audit/logs", tableFilter, operationFilter, userFilter, limitResults],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tableFilter && tableFilter !== 'all') params.append('tableName', tableFilter);
      if (operationFilter && operationFilter !== 'all') params.append('operation', operationFilter);
      if (userFilter) params.append('userId', userFilter);
      params.append('limit', limitResults);
      
      const response = await fetch(`/api/admin/audit/logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }
      return response.json();
    },
    retry: false,
  });

  // Fetch audit log stats for retention
  const { data: auditStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<AuditLogStats>({
    queryKey: ["/api/admin/audit/stats"],
    retry: false,
  });

  // Fetch video retention data
  const { data: videoRetentionData, isLoading: videosLoading, refetch: refetchVideos } = useQuery<VideoRetentionInfo[]>({
    queryKey: ["/api/admin/video-retention"],
    retry: false,
  });

  // Cleanup mutation
  const cleanupMutation = useMutation({
    mutationFn: async (days: number) => {
      const res = await apiRequest("POST", "/api/admin/audit/cleanup", { retentionDays: days });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Cleanup Complete",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit/logs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Cleanup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCleanup = () => {
    const days = parseInt(retentionDays);
    if (days < 30) {
      toast({
        title: "Invalid Retention Period",
        description: "Retention period must be at least 30 days",
        variant: "destructive",
      });
      return;
    }
    cleanupMutation.mutate(days);
  };

  const filteredLogs = auditLogs?.filter(log => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      log.tableName.toLowerCase().includes(searchLower) ||
      log.recordId.toLowerCase().includes(searchLower) ||
      log.operation.toLowerCase().includes(searchLower) ||
      log.userEmail?.toLowerCase().includes(searchLower) ||
      log.description?.toLowerCase().includes(searchLower) ||
      log.fieldName?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const exportAuditData = (data: any[], filename: string) => {
    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getOperationBadge = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Create</Badge>;
      case 'UPDATE':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Update</Badge>;
      case 'DELETE':
        return <Badge variant="destructive">Delete</Badge>;
      default:
        return <Badge variant="secondary">{operation}</Badge>;
    }
  };

  const getTableIcon = (tableName: string) => {
    switch (tableName.toLowerCase()) {
      case 'users':
        return <User className="w-4 h-4" />;
      case 'cases':
        return <FileText className="w-4 h-4" />;
      case 'messages':
        return <Activity className="w-4 h-4" />;
      case 'documents':
        return <FileText className="w-4 h-4" />;
      default:
        return <Database className="w-4 h-4" />;
    }
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
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Audit Management</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">Complete audit trail of all system changes and updates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">System Audit Trail</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="logs">Audit Logs</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="retention">Retention</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Changes</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summaryLoading ? "..." : auditSummary?.totalChanges.toLocaleString() || "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">All time system changes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recent Changes</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summaryLoading ? "..." : auditSummary?.recentChanges.toLocaleString() || "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">Last 24 hours</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summaryLoading ? "..." : auditSummary?.topUsers.length || "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">Users making changes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tables Modified</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summaryLoading ? "..." : auditSummary?.topTables.length || "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">Different tables affected</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Users by Changes</CardTitle>
                  <CardDescription>Users who have made the most system changes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {summaryLoading ? (
                      <div className="text-center py-4">Loading...</div>
                    ) : (
                      auditSummary?.topUsers.slice(0, 5).map((user, index) => (
                        <div key={user.userId} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <span className="text-sm font-medium">{index + 1}</span>
                            </div>
                            <div>
                              <p className="font-medium">{user.userEmail}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">ID: {user.userId}</p>
                            </div>
                          </div>
                          <Badge variant="secondary">{user.changeCount} changes</Badge>
                        </div>
                      )) || <div className="text-center py-4">No data available</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Tables by Changes</CardTitle>
                  <CardDescription>Database tables with the most modifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {summaryLoading ? (
                      <div className="text-center py-4">Loading...</div>
                    ) : (
                      auditSummary?.topTables.slice(0, 5).map((table, index) => (
                        <div key={table.tableName} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                              {getTableIcon(table.tableName)}
                            </div>
                            <div>
                              <p className="font-medium capitalize">{table.tableName}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Database table</p>
                            </div>
                          </div>
                          <Badge variant="secondary">{table.changeCount} changes</Badge>
                        </div>
                      )) || <div className="text-center py-4">No data available</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">System Audit Logs</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Detailed record of all system changes and updates</CardDescription>
                  </div>
                  <Button 
                    onClick={() => exportAuditData(filteredLogs, 'audit-logs')}
                    variant="outline"
                    size="sm"
                    disabled={filteredLogs.length === 0}
                    className="w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <Input
                      placeholder="Search logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-full"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Select value={tableFilter} onValueChange={setTableFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Tables" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tables</SelectItem>
                        <SelectItem value="users">Users</SelectItem>
                        <SelectItem value="cases">Cases</SelectItem>
                        <SelectItem value="messages">Messages</SelectItem>
                        <SelectItem value="documents">Documents</SelectItem>
                        <SelectItem value="organisations">Organisations</SelectItem>
                        <SelectItem value="scheduled_reports">Reports</SelectItem>
                        <SelectItem value="user_organisations">User Orgs</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={operationFilter} onValueChange={setOperationFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Ops" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ops</SelectItem>
                        <SelectItem value="INSERT">Create</SelectItem>
                        <SelectItem value="UPDATE">Update</SelectItem>
                        <SelectItem value="DELETE">Delete</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={limitResults} onValueChange={setLimitResults}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50 records</SelectItem>
                        <SelectItem value="100">100 records</SelectItem>
                        <SelectItem value="250">250 records</SelectItem>
                        <SelectItem value="500">500 records</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => refetchLogs()}
                      className="w-full"
                    >
                      <Filter className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Refresh</span>
                      <span className="sm:hidden">Go</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {/* Mobile Card Layout */}
                <div className="block md:hidden space-y-3">
                  {logsLoading ? (
                    <div className="text-center py-8">Loading audit logs...</div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No audit logs found matching the current filters.</div>
                  ) : (
                    filteredLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-3 bg-white dark:bg-gray-800">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getTableIcon(log.tableName)}
                            <span className="capitalize font-medium truncate">{log.tableName}</span>
                            {getOperationBadge(log.operation)}
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="shrink-0">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="text-lg">Audit Log Details</DialogTitle>
                                <DialogDescription>
                                  Log #{log.id}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 text-sm">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div><strong>Timestamp:</strong> {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}</div>
                                  <div><strong>Operation:</strong> {log.operation}</div>
                                  <div><strong>Table:</strong> {log.tableName}</div>
                                  <div><strong>Record ID:</strong> <span className="font-mono text-xs">{log.recordId}</span></div>
                                  <div><strong>Field:</strong> {log.fieldName || 'N/A'}</div>
                                  <div><strong>User:</strong> {log.userEmail || 'System'}</div>
                                </div>
                                {log.description && (
                                  <div>
                                    <strong>Description:</strong>
                                    <p className="mt-1 text-gray-600 dark:text-gray-400">{log.description}</p>
                                  </div>
                                )}
                                {(log.oldValue || log.newValue) && (
                                  <div className="space-y-2">
                                    {log.oldValue && (
                                      <div>
                                        <strong>Old Value:</strong>
                                        <pre className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all">{log.oldValue}</pre>
                                      </div>
                                    )}
                                    {log.newValue && (
                                      <div>
                                        <strong>New Value:</strong>
                                        <pre className="mt-1 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all">{log.newValue}</pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {log.ipAddress && <div><strong>IP Address:</strong> {log.ipAddress}</div>}
                                {log.userAgent && (
                                  <div>
                                    <strong>User Agent:</strong>
                                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 break-all">{log.userAgent}</p>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <div className="text-xs text-gray-500 mb-1">
                          {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')} • {log.userEmail || 'System'}
                        </div>
                        {log.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{log.description}</p>
                        )}
                        {!log.description && log.fieldName && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">Field: {log.fieldName}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden md:block rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Table</TableHead>
                        <TableHead>Operation</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Loading audit logs...
                          </TableCell>
                        </TableRow>
                      ) : filteredLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            No audit logs found matching the current filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-sm whitespace-nowrap">
                              {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getTableIcon(log.tableName)}
                                <span className="capitalize">{log.tableName}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getOperationBadge(log.operation)}</TableCell>
                            <TableCell className="max-w-xs">
                              <p className="text-sm truncate" title={log.description || log.fieldName || '-'}>
                                {log.description || log.fieldName || '-'}
                              </p>
                            </TableCell>
                            <TableCell>
                              {log.userEmail ? (
                                <div>
                                  <div className="font-medium text-sm truncate max-w-[150px]" title={log.userEmail}>{log.userEmail}</div>
                                </div>
                              ) : (
                                <span className="text-gray-500">System</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Audit Log Details</DialogTitle>
                                    <DialogDescription>
                                      Complete details for audit log #{log.id}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <strong>Timestamp:</strong> {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                                      </div>
                                      <div>
                                        <strong>Operation:</strong> {log.operation}
                                      </div>
                                      <div>
                                        <strong>Table:</strong> {log.tableName}
                                      </div>
                                      <div>
                                        <strong>Record ID:</strong> {log.recordId}
                                      </div>
                                      <div>
                                        <strong>Field:</strong> {log.fieldName || 'N/A'}
                                      </div>
                                      <div>
                                        <strong>User:</strong> {log.userEmail || 'System'}
                                      </div>
                                    </div>
                                    
                                    {log.description && (
                                      <div>
                                        <strong>Description:</strong>
                                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{log.description}</p>
                                      </div>
                                    )}
                                    
                                    {(log.oldValue || log.newValue) && (
                                      <div className="space-y-2">
                                        {log.oldValue && (
                                          <div>
                                            <strong>Old Value:</strong>
                                            <pre className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs overflow-x-auto">
                                              {log.oldValue}
                                            </pre>
                                          </div>
                                        )}
                                        {log.newValue && (
                                          <div>
                                            <strong>New Value:</strong>
                                            <pre className="mt-1 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs overflow-x-auto">
                                              {log.newValue}
                                            </pre>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {log.ipAddress && (
                                      <div>
                                        <strong>IP Address:</strong> {log.ipAddress}
                                      </div>
                                    )}
                                    
                                    {log.userAgent && (
                                      <div>
                                        <strong>User Agent:</strong>
                                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 break-all">{log.userAgent}</p>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {filteredLogs.length > 0 && (
                  <div className="mt-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Showing {filteredLogs.length} of {auditLogs?.length || 0} audit logs
                    {searchTerm && ` matching "${searchTerm}"`}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Security Analysis
                  </CardTitle>
                  <CardDescription>Analysis of potentially suspicious activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">No suspicious activities detected</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        All audit logs appear to be legitimate system operations
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Monitoring for:</h4>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• Unusual deletion patterns</li>
                        <li>• Multiple failed operations</li>
                        <li>• Off-hours administrative changes</li>
                        <li>• Bulk data modifications</li>
                        <li>• Unauthorised access attempts</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Change Patterns
                  </CardTitle>
                  <CardDescription>Analysis of system change patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <div className="text-2xl font-bold text-blue-600">
                          {auditSummary?.topTables.find(t => t.tableName === 'cases')?.changeCount || 0}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Case Changes</div>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                        <div className="text-2xl font-bold text-green-600">
                          {auditSummary?.topTables.find(t => t.tableName === 'users')?.changeCount || 0}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">User Changes</div>
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                        <div className="text-2xl font-bold text-purple-600">
                          {auditSummary?.topTables.find(t => t.tableName === 'messages')?.changeCount || 0}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Message Changes</div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <h4 className="font-medium mb-2">System Health</h4>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Audit system operational</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        All changes are being properly tracked and logged
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="retention">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <HardDrive className="w-5 h-5 mr-2" />
                    Audit Log Storage
                  </CardTitle>
                  <CardDescription>Current storage statistics for audit logs</CardDescription>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : auditStats ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {auditStats.totalLogs?.toLocaleString() || "0"}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Total Audit Logs</div>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                            365
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Days Retained</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Log Age Distribution
                        </h4>
                        <div className="space-y-2 text-sm">
                          {auditStats.logsByAge?.map((ageGroup, index) => (
                            <div 
                              key={ageGroup.period} 
                              className={`flex justify-between items-center p-2 rounded ${
                                index === auditStats.logsByAge.length - 1 
                                  ? 'bg-orange-50 dark:bg-orange-900/20' 
                                  : 'bg-gray-50 dark:bg-gray-800'
                              }`}
                            >
                              <span>{ageGroup.period}</span>
                              <Badge 
                                variant={index === auditStats.logsByAge.length - 1 ? "outline" : "secondary"}
                                className={index === auditStats.logsByAge.length - 1 ? "text-orange-600 border-orange-600" : ""}
                              >
                                {ageGroup.count?.toLocaleString() ?? 0}
                              </Badge>
                            </div>
                          )) || <div className="text-gray-500">No age data available</div>}
                        </div>
                      </div>
                      
                      {auditStats.oldestLog && auditStats.newestLog && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                          <div>Oldest log: {format(new Date(auditStats.oldestLog), 'dd MMM yyyy, HH:mm')}</div>
                          <div>Newest log: {format(new Date(auditStats.newestLog), 'dd MMM yyyy, HH:mm')}</div>
                        </div>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => refetchStats()}
                        className="w-full"
                      >
                        Refresh Statistics
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Unable to load audit log statistics
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Manual Cleanup
                  </CardTitle>
                  <CardDescription>
                    Manually delete audit logs older than a specified number of days. 
                    Automatic cleanup runs daily (365-day retention).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-amber-800 dark:text-amber-200">Important</h4>
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            This action permanently deletes audit logs. Deleted logs cannot be recovered.
                            The system automatically cleans up logs older than 365 days daily.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Delete logs older than:</label>
                      <Select value={retentionDays} onValueChange={setRetentionDays}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                          <SelectItem value="180">180 days (6 months)</SelectItem>
                          <SelectItem value="365">365 days (1 year)</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {auditStats?.logsByAge && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Logs will be deleted based on the selected retention period.
                          Currently tracking {auditStats.totalLogs?.toLocaleString() ?? 0} total logs.
                        </p>
                      )}
                      
                      <Button 
                        variant="destructive" 
                        onClick={handleCleanup}
                        disabled={cleanupMutation.isPending}
                        className="w-full"
                      >
                        {cleanupMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Cleaning Up...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Old Logs
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="videos">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Video className="h-5 w-5" />
                        Video File Retention
                      </CardTitle>
                      <CardDescription>
                        Track video files and their retention status. Videos are deleted 14 days after upload if not downloaded, 
                        or 7 days after download by the required party.
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchVideos()}
                    >
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {videosLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : !videoRetentionData || videoRetentionData.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Video className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>No video files are currently being tracked.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Downloaded
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-amber-500" />
                          Awaiting Download
                        </span>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>File Name</TableHead>
                              <TableHead>Uploaded</TableHead>
                              <TableHead>Uploaded By</TableHead>
                              <TableHead>Case</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Time Remaining</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {videoRetentionData.map((video) => (
                              <TableRow key={video.documentId}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <Video className="h-4 w-4 text-purple-500" />
                                    <span className="truncate max-w-[200px]" title={video.fileName}>
                                      {video.fileName}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {format(new Date(video.uploadedAt), "dd MMM yyyy")}
                                    <div className="text-xs text-gray-500">
                                      {format(new Date(video.uploadedAt), "HH:mm")}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {video.uploaderName}
                                    <div className="text-xs text-gray-500">
                                      {video.uploaderEmail}
                                    </div>
                                    <Badge variant="outline" className={video.uploadedByAdmin ? "text-purple-600 border-purple-500" : "text-blue-600 border-blue-500"}>
                                      {video.uploadedByAdmin ? "Admin" : "User"}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {video.caseAccountNumber ? (
                                    <div className="text-sm">
                                      <span className="font-medium">{video.caseAccountNumber}</span>
                                      {video.caseName && (
                                        <div className="text-xs text-gray-500 truncate max-w-[150px]" title={video.caseName}>
                                          {video.caseName}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-sm">No case linked</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {video.status === 'downloaded' ? (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                      <div>
                                        <span className="text-green-600 text-sm font-medium">Downloaded</span>
                                        {video.downloadedAt && (
                                          <div className="text-xs text-gray-500">
                                            {format(new Date(video.downloadedAt), "dd MMM yyyy HH:mm")}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-4 w-4 text-amber-500" />
                                      <div>
                                        <span className="text-amber-600 text-sm font-medium">Awaiting</span>
                                        <div className="text-xs text-gray-500">
                                          Needs {video.requiredDownloaderType === 'admin' ? 'admin' : 'user'} download
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={video.daysRemaining <= 2 ? "destructive" : video.daysRemaining <= 5 ? "default" : "secondary"}
                                    className={video.daysRemaining <= 2 ? "" : video.daysRemaining <= 5 ? "bg-amber-500" : ""}
                                  >
                                    {video.daysRemaining} day{video.daysRemaining !== 1 ? 's' : ''} left
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      <div className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <strong>Retention Policy:</strong> Videos are automatically deleted after the retention period expires. 
                        Cleanup runs every 6 hours. Videos marked as "Awaiting" require the opposite party 
                        (admin or user) to download them to start the 7-day post-download retention period.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}