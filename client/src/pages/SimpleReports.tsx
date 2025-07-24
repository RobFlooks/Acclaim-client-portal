import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { ArrowLeft, Download, FileText, Users, Building, Activity } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

interface CrossOrgPerformance {
  organisationId: number;
  organisationName: string;
  totalCases: string;
  activeCases: string;
  closedCases: string;
  totalOutstanding: string;
  totalRecovered: string;
  recoveryRate: number;
  averageCaseAge: string;
  userCount: string;
}

interface SystemHealth {
  metric: string;
  value: string;
  status: string;
  timestamp: string;
}

export default function SimpleReports() {
  const { user, isLoading } = useAuth();

  // Cross-organisation performance query
  const { data: crossOrgData = [], isLoading: isLoadingCrossOrg } = useQuery({
    queryKey: ['/api/admin/reports/cross-organisation'],
    retry: false
  });

  // System health metrics query
  const { data: systemHealthData = [], isLoading: isLoadingSystemHealth } = useQuery({
    queryKey: ['/api/admin/reports/system-health'],
    retry: false
  });

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

  if (isLoading || !user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-acclaim-teal mx-auto mb-4"></div>
          <p className="mt-2 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Advanced Reports</h1>
            <p className="text-gray-600">Comprehensive analytics and reporting</p>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="cross-org" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cross-org">Cross-Organisation</TabsTrigger>
          <TabsTrigger value="system-health">System Health</TabsTrigger>
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
                  disabled={!crossOrgData.length}
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
                        <TableHead>Users</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {crossOrgData.map((org: CrossOrgPerformance) => (
                        <TableRow key={org.organisationId}>
                          <TableCell className="font-medium">{org.organisationName}</TableCell>
                          <TableCell>{org.totalCases}</TableCell>
                          <TableCell>{org.activeCases}</TableCell>
                          <TableCell>{org.closedCases}</TableCell>
                          <TableCell>£{parseFloat(org.totalOutstanding).toLocaleString()}</TableCell>
                          <TableCell>£{parseFloat(org.totalRecovered).toLocaleString()}</TableCell>
                          <TableCell>{org.recoveryRate.toFixed(1)}%</TableCell>
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
                  disabled={!systemHealthData.length}
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
                    {systemHealthData.map((metric: SystemHealth, index: number) => (
                      <Card key={index}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{metric.metric}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{metric.value}</div>
                          <p className="text-xs text-muted-foreground">Status: {metric.status}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}