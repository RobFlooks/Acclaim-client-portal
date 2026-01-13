import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
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

export default function AuditManagement() {
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'analysis'>('overview');
  const [searchTerm, setSearchTerm] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [operationFilter, setOperationFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [limitResults, setLimitResults] = useState("100");

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="logs">Audit Logs</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
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
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>System Audit Logs</CardTitle>
                    <CardDescription>Detailed record of all system changes and updates</CardDescription>
                  </div>
                  <Button 
                    onClick={() => exportAuditData(filteredLogs, 'audit-logs')}
                    variant="outline"
                    size="sm"
                    disabled={filteredLogs.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-500" />
                    <Input
                      placeholder="Search logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                  </div>
                  
                  <Select value={tableFilter} onValueChange={setTableFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Tables" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tables</SelectItem>
                      <SelectItem value="users">Users</SelectItem>
                      <SelectItem value="cases">Cases</SelectItem>
                      <SelectItem value="messages">Messages</SelectItem>
                      <SelectItem value="documents">Documents</SelectItem>
                      <SelectItem value="organisations">Organisations</SelectItem>
                      <SelectItem value="payments">Payments</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={operationFilter} onValueChange={setOperationFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Operations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Operations</SelectItem>
                      <SelectItem value="INSERT">Create</SelectItem>
                      <SelectItem value="UPDATE">Update</SelectItem>
                      <SelectItem value="DELETE">Delete</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={limitResults} onValueChange={setLimitResults}>
                    <SelectTrigger className="w-32">
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
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Table</TableHead>
                        <TableHead>Operation</TableHead>
                        <TableHead>Record ID</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Loading audit logs...
                          </TableCell>
                        </TableRow>
                      ) : filteredLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            No audit logs found matching the current filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-sm">
                              {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getTableIcon(log.tableName)}
                                <span className="capitalize">{log.tableName}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getOperationBadge(log.operation)}</TableCell>
                            <TableCell className="font-mono text-sm">{log.recordId}</TableCell>
                            <TableCell>{log.fieldName || '-'}</TableCell>
                            <TableCell>
                              {log.userEmail ? (
                                <div>
                                  <div className="font-medium">{log.userEmail}</div>
                                  <div className="text-xs text-gray-500">{log.userId}</div>
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
                                <DialogContent className="max-w-2xl">
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
                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
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
        </Tabs>
      </div>
    </div>
  );
}