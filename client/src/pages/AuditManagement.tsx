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
import { Checkbox } from "@/components/ui/checkbox";
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

interface VideoFile {
  id: number;
  fileName: string;
  fileSize: number | null;
  fileType: string | null;
  caseId: number | null;
  caseName: string | null;
  organisationId: number | null;
  organisationName: string;
  uploadedBy: string | null;
  uploaderName: string;
  uploaderEmail: string;
  uploaderIsAdmin: boolean;
  createdAt: string | null;
  downloaded: boolean;
  downloadInfo: {
    downloadedAt: string;
    downloadedBy: string;
    downloadedByEmail: string;
  } | null;
  totalDownloads: number;
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

  // Fetch video files with download status
  const { data: videoFiles, isLoading: videosLoading } = useQuery<VideoFile[]>({
    queryKey: ["/api/admin/audit/videos"],
    retry: false,
  });

  // State for video search and filtering
  const [videoSearchTerm, setVideoSearchTerm] = useState("");
  const [videoStatusFilter, setVideoStatusFilter] = useState<'all' | 'downloaded' | 'not_downloaded'>('all');
  const [videoUploadDateFilter, setVideoUploadDateFilter] = useState("");
  const [videoDownloadDateFilter, setVideoDownloadDateFilter] = useState("");
  const [selectedVideos, setSelectedVideos] = useState<Set<number>>(new Set());
  const [deletingVideos, setDeletingVideos] = useState(false);

  // Delete video mutation
  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: number) => {
      const res = await apiRequest("DELETE", `/api/documents/${videoId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete video");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Bulk delete videos
  const handleBulkDeleteVideos = async () => {
    if (selectedVideos.size === 0) {
      toast({
        title: "No Videos Selected",
        description: "Please select at least one video to delete",
        variant: "destructive",
      });
      return;
    }

    setDeletingVideos(true);
    let successCount = 0;
    let failCount = 0;

    for (const videoId of selectedVideos) {
      try {
        await deleteVideoMutation.mutateAsync(videoId);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setDeletingVideos(false);
    setSelectedVideos(new Set());
    
    toast({
      title: "Bulk Delete Complete",
      description: `Successfully deleted ${successCount} video(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
    });
  };

  // Toggle video selection
  const toggleVideoSelection = (videoId: number) => {
    const newSelection = new Set(selectedVideos);
    if (newSelection.has(videoId)) {
      newSelection.delete(videoId);
    } else {
      newSelection.add(videoId);
    }
    setSelectedVideos(newSelection);
  };

  // Select all filtered videos
  const selectAllFilteredVideos = (filteredVideos: VideoFile[]) => {
    const newSelection = new Set(filteredVideos.map(v => v.id));
    setSelectedVideos(newSelection);
  };

  // Clear all selections
  const clearVideoSelection = () => {
    setSelectedVideos(new Set());
  };

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
            <TabsTrigger value="videos">
              <Video className="w-4 h-4 mr-1" />
              Videos
            </TabsTrigger>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Video File Tracking
                </CardTitle>
                <CardDescription>
                  Track video file uploads and downloads. Select videos to delete individually or in bulk.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search and filter controls */}
                <div className="space-y-4 mb-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search by filename, case, organisation, or uploader..."
                        value={videoSearchTerm}
                        onChange={(e) => setVideoSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={videoStatusFilter} onValueChange={(value) => setVideoStatusFilter(value as any)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Videos</SelectItem>
                        <SelectItem value="downloaded">Downloaded</SelectItem>
                        <SelectItem value="not_downloaded">Not Downloaded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Date filters */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                        Uploaded before:
                      </label>
                      <Input
                        type="date"
                        value={videoUploadDateFilter}
                        onChange={(e) => setVideoUploadDateFilter(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                        Downloaded before (for downloaded videos):
                      </label>
                      <Input
                        type="date"
                        value={videoDownloadDateFilter}
                        onChange={(e) => setVideoDownloadDateFilter(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setVideoUploadDateFilter("");
                          setVideoDownloadDateFilter("");
                          setVideoSearchTerm("");
                          setVideoStatusFilter("all");
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                </div>

                {videosLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : !videoFiles || videoFiles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No video files have been uploaded yet.</p>
                  </div>
                ) : (
                  <>
                    {/* Summary stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {videoFiles.length}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Total Videos</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {videoFiles.filter(v => v.downloaded).length}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Downloaded</div>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                          {videoFiles.filter(v => !v.downloaded).length}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Pending</div>
                      </div>
                    </div>

                    {/* Selection controls */}
                    {(() => {
                      const filteredVideos = videoFiles.filter(video => {
                        if (videoSearchTerm) {
                          const search = videoSearchTerm.toLowerCase();
                          const matches = 
                            video.fileName.toLowerCase().includes(search) ||
                            video.caseName?.toLowerCase().includes(search) ||
                            video.organisationName.toLowerCase().includes(search) ||
                            video.uploaderName.toLowerCase().includes(search) ||
                            video.uploaderEmail.toLowerCase().includes(search);
                          if (!matches) return false;
                        }
                        if (videoStatusFilter === 'downloaded' && !video.downloaded) return false;
                        if (videoStatusFilter === 'not_downloaded' && video.downloaded) return false;
                        if (videoUploadDateFilter && video.createdAt) {
                          const uploadDate = new Date(video.createdAt);
                          const filterDate = new Date(videoUploadDateFilter);
                          filterDate.setHours(23, 59, 59, 999);
                          if (uploadDate > filterDate) return false;
                        }
                        if (videoDownloadDateFilter && video.downloaded && video.downloadInfo?.downloadedAt) {
                          const downloadDate = new Date(video.downloadInfo.downloadedAt);
                          const filterDate = new Date(videoDownloadDateFilter);
                          filterDate.setHours(23, 59, 59, 999);
                          if (downloadDate > filterDate) return false;
                        }
                        return true;
                      });

                      return (
                        <>
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => selectAllFilteredVideos(filteredVideos)}
                              disabled={filteredVideos.length === 0}
                            >
                              Select All ({filteredVideos.length})
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={clearVideoSelection}
                              disabled={selectedVideos.size === 0}
                            >
                              Clear Selection
                            </Button>
                            {selectedVideos.size > 0 && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkDeleteVideos}
                                disabled={deletingVideos}
                              >
                                {deletingVideos ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Selected ({selectedVideos.size})
                                  </>
                                )}
                              </Button>
                            )}
                          </div>

                          {/* Videos table */}
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-10">
                                    <Checkbox 
                                      checked={filteredVideos.length > 0 && filteredVideos.every(v => selectedVideos.has(v.id))}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          selectAllFilteredVideos(filteredVideos);
                                        } else {
                                          clearVideoSelection();
                                        }
                                      }}
                                    />
                                  </TableHead>
                                  <TableHead>File Name</TableHead>
                                  <TableHead className="hidden md:table-cell">Case</TableHead>
                                  <TableHead className="hidden lg:table-cell">Organisation</TableHead>
                                  <TableHead>Uploaded By</TableHead>
                                  <TableHead className="hidden sm:table-cell">Upload Date</TableHead>
                                  <TableHead className="text-center">Status</TableHead>
                                  <TableHead className="w-20">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredVideos.map((video) => (
                                  <TableRow key={video.id} className={selectedVideos.has(video.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""}>
                                    <TableCell>
                                      <Checkbox 
                                        checked={selectedVideos.has(video.id)}
                                        onCheckedChange={() => toggleVideoSelection(video.id)}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Video className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                        <div>
                                          <div className="font-medium truncate max-w-[200px]" title={video.fileName}>
                                            {video.fileName}
                                          </div>
                                          {video.fileSize && (
                                            <div className="text-xs text-gray-500">
                                              {(video.fileSize / (1024 * 1024)).toFixed(2)} MB
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                      {video.caseName ? (
                                        <span className="text-sm">{video.caseName}</span>
                                      ) : (
                                        <span className="text-gray-400 text-sm">No case</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell">
                                      <span className="text-sm">{video.organisationName}</span>
                                    </TableCell>
                                    <TableCell>
                                      <div>
                                        <div className="font-medium text-sm">{video.uploaderName}</div>
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                          <Badge 
                                            variant="outline" 
                                            className={video.uploaderIsAdmin 
                                              ? "text-purple-600 border-purple-300 dark:text-purple-400 dark:border-purple-600" 
                                              : "text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-600"
                                            }
                                          >
                                            {video.uploaderIsAdmin ? 'Admin' : 'User'}
                                          </Badge>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                                      {video.createdAt ? format(new Date(video.createdAt), 'dd/MM/yyyy HH:mm') : '-'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {video.downloaded ? (
                                        <div className="flex flex-col items-center gap-1">
                                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            Downloaded
                                          </Badge>
                                          {video.downloadInfo && (
                                            <div className="text-xs text-gray-500" title={`Downloaded by ${video.downloadInfo.downloadedBy} (${video.downloadInfo.downloadedByEmail})`}>
                                              {format(new Date(video.downloadInfo.downloadedAt), 'dd/MM/yyyy HH:mm')}
                                              <br />
                                              <span className="text-gray-400">by {video.downloadInfo.downloadedBy}</span>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 flex items-center gap-1">
                                          <XCircle className="w-3 h-3" />
                                          Pending
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        onClick={() => {
                                          if (confirm(`Are you sure you want to delete "${video.fileName}"?`)) {
                                            deleteVideoMutation.mutate(video.id);
                                          }
                                        }}
                                        disabled={deleteVideoMutation.isPending}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      );
                    })()}

                    {/* Legend */}
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="font-medium mb-2 text-sm">How download tracking works:</h4>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• If an <strong>admin</strong> uploads a video → Shows "Downloaded" when a <strong>user</strong> downloads it</li>
                        <li>• If a <strong>user</strong> uploads a video → Shows "Downloaded" when an <strong>admin</strong> downloads it</li>
                        <li>• Videos are not attached to notification emails due to size constraints</li>
                        <li>• Use date filters to find old videos, then select and delete in bulk</li>
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}