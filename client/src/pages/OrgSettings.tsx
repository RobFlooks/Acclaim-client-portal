import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Crown, Users, FolderOpen, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { useState } from "react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
}

interface Case {
  id: number;
  caseName: string;
  reference?: string;
  status: string;
}

interface CaseRestriction {
  id: number;
  userId: string;
  caseId: number;
  createdAt: string;
}

export default function OrgSettings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");

  const { data: orgOwnerships, isLoading: ownershipLoading } = useQuery<number[]>({
    queryKey: ["/api/org-owner/ownerships"],
  });

  const { data: organisations } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/organisations"],
  });

  const ownedOrgs = organisations?.filter(org => orgOwnerships?.includes(org.id)) || [];

  const currentOrgId = selectedOrgId ? parseInt(selectedOrgId) : (ownedOrgs[0]?.id || 0);

  const { data: orgUsers, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/org-owner", currentOrgId, "users"],
    enabled: currentOrgId > 0,
  });

  const { data: orgCases, isLoading: casesLoading } = useQuery<Case[]>({
    queryKey: ["/api/org-owner", currentOrgId, "cases"],
    enabled: currentOrgId > 0,
  });

  const { data: caseRestrictions, isLoading: restrictionsLoading } = useQuery<CaseRestriction[]>({
    queryKey: ["/api/org-owner", currentOrgId, "restrictions"],
    enabled: currentOrgId > 0,
  });

  const toggleRestrictionMutation = useMutation({
    mutationFn: async ({ userId, caseId }: { userId: string; caseId: number }) => {
      const response = await apiRequest("POST", `/api/org-owner/${currentOrgId}/toggle-restriction`, {
        userId,
        caseId
      });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.restricted ? "Access Restricted" : "Access Restored",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/org-owner", currentOrgId, "restrictions"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update access",
        variant: "destructive",
      });
    },
  });

  const isRestricted = (userId: string, caseId: number) => {
    return caseRestrictions?.some(r => r.userId === userId && r.caseId === caseId) || false;
  };

  if (user?.isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Organisation Settings</CardTitle>
            <CardDescription>
              Admins can manage all organisations from the Admin Panel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/admin")}>
              Go to Admin Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (ownershipLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!orgOwnerships || orgOwnerships.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Organisation Settings</CardTitle>
            <CardDescription>
              You are not an owner of any organisation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const nonAdminUsers = orgUsers?.filter(u => !u.isAdmin) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Crown className="h-6 w-6 text-amber-500" />
              Organisation Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage case access for members in your organisation
            </p>
          </div>
        </div>
      </div>

      {ownedOrgs.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Organisation</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedOrgId || String(ownedOrgs[0]?.id)} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select organisation" />
              </SelectTrigger>
              <SelectContent>
                {ownedOrgs.map(org => (
                  <SelectItem key={org.id} value={String(org.id)}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Organisation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              {ownedOrgs.find(o => o.id === currentOrgId)?.name || "Loading..."}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              {nonAdminUsers.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-teal-600" />
              {orgCases?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Case Access Management</CardTitle>
          <CardDescription>
            Click on a cell to toggle access for a user to a specific case. 
            <span className="text-green-600"> Green </span> means the user can access the case.
            <span className="text-red-600"> Red </span> means access is restricted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(usersLoading || casesLoading || restrictionsLoading) ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : nonAdminUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No non-admin members in this organisation to manage.
            </div>
          ) : orgCases?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No cases in this organisation yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white dark:bg-gray-950 z-10">User</TableHead>
                    {orgCases?.map(c => (
                      <TableHead key={c.id} className="text-center min-w-[120px]">
                        <div className="font-medium">{c.caseName}</div>
                        {c.reference && <div className="text-xs text-gray-500">{c.reference}</div>}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nonAdminUsers.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="sticky left-0 bg-white dark:bg-gray-950 z-10 font-medium">
                        <div>{u.firstName} {u.lastName}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </TableCell>
                      {orgCases?.map(c => {
                        const restricted = isRestricted(u.id, c.id);
                        return (
                          <TableCell key={c.id} className="text-center">
                            <Button
                              variant={restricted ? "destructive" : "outline"}
                              size="sm"
                              className={`w-20 ${!restricted ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400' : ''}`}
                              onClick={() => {
                                toggleRestrictionMutation.mutate({
                                  userId: u.id,
                                  caseId: c.id
                                });
                              }}
                              disabled={toggleRestrictionMutation.isPending}
                            >
                              {restricted ? (
                                <>
                                  <ShieldOff className="h-3 w-3 mr-1" />
                                  Blocked
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="h-3 w-3 mr-1" />
                                  Access
                                </>
                              )}
                            </Button>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
