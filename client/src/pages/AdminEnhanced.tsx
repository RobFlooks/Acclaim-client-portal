import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Users, Building, Plus, Edit, Trash2, Shield, Key, Copy, UserPlus, AlertTriangle, ShieldCheck, ArrowLeft, Activity, FileText, CreditCard, Archive, ArchiveRestore } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { createUserSchema, updateUserSchema, createOrganisationSchema, updateOrganisationSchema } from "@shared/schema";
import { z } from "zod";
import { Link } from "wouter";
import ApiGuideDownload from "@/components/ApiGuideDownload";
import UserGuideDownload from "@/components/UserGuideDownload";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organisationId: number | null;
  organisationName?: string;
  createdAt: string;
  isAdmin?: boolean;
  phone?: string;
}

interface Organisation {
  id: number;
  name: string;
  createdAt: string;
  userCount: number;
}

type CreateUserForm = z.infer<typeof createUserSchema>;
type UpdateUserForm = z.infer<typeof updateUserSchema>;
type CreateOrganisationForm = z.infer<typeof createOrganisationSchema>;
type UpdateOrganisationForm = z.infer<typeof updateOrganisationSchema>;

interface Case {
  id: number;
  accountNumber: string;
  caseName: string;
  debtorEmail: string;
  debtorPhone: string;
  originalAmount: string;
  outstandingAmount: string;
  status: string;
  stage: string;
  organisationId: number;
  organisationName?: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
}

function CaseManagementTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteConfirmCase, setDeleteConfirmCase] = useState<Case | null>(null);
  const [archiveConfirmCase, setArchiveConfirmCase] = useState<Case | null>(null);
  
  // Fetch all cases (including archived ones for admin)
  const { data: cases = [], isLoading, error } = useQuery({
    queryKey: ['/api/admin/cases/all'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/cases/all');
      const data = await response.json();
      return data;
    },
    retry: false,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  // Archive case mutation
  const archiveCaseMutation = useMutation({
    mutationFn: async (caseId: number) => {
      return await apiRequest('PUT', `/api/admin/cases/${caseId}/archive`);
    },
    onSuccess: () => {
      toast({
        title: "Case Archived",
        description: "Case has been successfully archived.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cases/all'] });
    },
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
        description: "Failed to archive case. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Unarchive case mutation
  const unarchiveCaseMutation = useMutation({
    mutationFn: async (caseId: number) => {
      return await apiRequest('PUT', `/api/admin/cases/${caseId}/unarchive`);
    },
    onSuccess: () => {
      toast({
        title: "Case Unarchived",
        description: "Case has been successfully unarchived.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cases/all'] });
    },
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
        description: "Failed to unarchive case. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete case mutation
  const deleteCaseMutation = useMutation({
    mutationFn: async (caseId: number) => {
      return await apiRequest('DELETE', `/api/admin/cases/${caseId}`);
    },
    onSuccess: () => {
      toast({
        title: "Case Deleted",
        description: "Case and all associated data have been permanently deleted.",
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cases/all'] });
    },
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
        description: "Failed to delete case. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Loading cases...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Error loading cases: {error.message}</p>
        <p>Please try refreshing the page or contact support.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        Total Cases: {cases.length} | Archived: {cases.filter((c: Case) => c.isArchived).length} | Active: {cases.filter((c: Case) => !c.isArchived).length}
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account Number</TableHead>
            <TableHead>Case Name</TableHead>
            <TableHead>Organisation</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Outstanding</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((case_: Case) => (
            <TableRow key={case_.id} className={case_.isArchived ? 'bg-gray-50' : ''}>
              <TableCell className="font-medium">{case_.accountNumber}</TableCell>
              <TableCell>{case_.caseName}</TableCell>
              <TableCell>{case_.organisationName || 'N/A'}</TableCell>
              <TableCell>
                <Badge variant={case_.status === 'active' ? 'default' : 'secondary'}>
                  {case_.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{case_.stage}</Badge>
              </TableCell>
              <TableCell>£{case_.outstandingAmount}</TableCell>
              <TableCell>
                {case_.isArchived ? (
                  <Badge variant="secondary">
                    <Archive className="h-3 w-3 mr-1" />
                    Archived
                  </Badge>
                ) : (
                  <Badge variant="default">Active</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  {case_.isArchived ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unarchiveCaseMutation.mutate(case_.id)}
                      disabled={unarchiveCaseMutation.isPending}
                      title="Unarchive case"
                    >
                      <ArchiveRestore className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setArchiveConfirmCase(case_)}
                      disabled={archiveCaseMutation.isPending}
                      title="Archive case"
                    >
                      <Archive className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirmCase(case_)}
                    disabled={deleteCaseMutation.isPending}
                    className="text-red-600 hover:text-red-700"
                    title="Permanently delete case"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmCase} onOpenChange={() => setDeleteConfirmCase(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Permanent Deletion Warning
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p className="font-medium">
                Are you sure you want to permanently delete case "{deleteConfirmCase?.caseName}"?
              </p>
              <div className="bg-red-50 p-3 rounded-md border border-red-200">
                <p className="text-sm text-red-800 font-medium">⚠️ This action cannot be undone!</p>
                <p className="text-sm text-red-700 mt-1">
                  This will permanently remove:
                </p>
                <ul className="text-sm text-red-700 mt-1 list-disc list-inside space-y-1">
                  <li>The case and all its details</li>
                  <li>All messages related to this case</li>
                  <li>All documents attached to this case</li>
                  <li>All payment records for this case</li>
                  <li>All activity history for this case</li>
                </ul>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Consider archiving the case instead if you want to hide it while preserving the data.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmCase(null)}
              disabled={deleteCaseMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmCase) {
                  deleteCaseMutation.mutate(deleteConfirmCase.id);
                  setDeleteConfirmCase(null);
                }
              }}
              disabled={deleteCaseMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteCaseMutation.isPending ? "Deleting..." : "Permanently Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={!!archiveConfirmCase} onOpenChange={() => setArchiveConfirmCase(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Archive className="h-5 w-5" />
              Archive Case
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p className="font-medium">
                Are you sure you want to archive case "{archiveConfirmCase?.caseName}"?
              </p>
              <div className="bg-orange-50 p-3 rounded-md border border-orange-200">
                <p className="text-sm text-orange-800 font-medium">📦 Archiving will:</p>
                <ul className="text-sm text-orange-700 mt-1 list-disc list-inside space-y-1">
                  <li>Hide the case from normal operations</li>
                  <li>Preserve all data (messages, documents, payments)</li>
                  <li>Allow you to restore it later if needed</li>
                </ul>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                This is a safe operation that can be reversed by unarchiving the case.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setArchiveConfirmCase(null)}
              disabled={archiveCaseMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                if (archiveConfirmCase) {
                  archiveCaseMutation.mutate(archiveConfirmCase.id);
                  setArchiveConfirmCase(null);
                }
              }}
              disabled={archiveCaseMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {archiveCaseMutation.isPending ? "Archiving..." : "Archive Case"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminEnhanced() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for organisation management
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showEditOrg, setShowEditOrg] = useState(false);
  const [showAssignUser, setShowAssignUser] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("none");
  const [editingOrg, setEditingOrg] = useState<Organisation | null>(null);
  const [orgFormData, setOrgFormData] = useState<CreateOrganisationForm>({
    name: "",
  });

  // State for user management
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<CreateUserForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    organisationId: undefined,
    isAdmin: false,
  });
  const [tempPassword, setTempPassword] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  // Fetch users
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  // Fetch organisations
  const { data: organisations, isLoading: orgsLoading, error: orgsError } = useQuery({
    queryKey: ["/api/admin/organisations"],
    retry: false,
  });

  // Create organisation mutation
  const createOrganisationMutation = useMutation({
    mutationFn: async (data: CreateOrganisationForm) => {
      const response = await apiRequest("POST", `/api/admin/organisations`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organisation created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organisations"] });
      setOrgFormData({ name: "" });
      setShowCreateOrg(false);
    },
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
        description: "Failed to create organisation",
        variant: "destructive",
      });
    },
  });

  // Update organisation mutation
  const updateOrganisationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateOrganisationForm }) => {
      const response = await apiRequest("PUT", `/api/admin/organisations/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organisation updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organisations"] });
      setOrgFormData({ name: "" });
      setEditingOrg(null);
      setShowEditOrg(false);
    },
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
        description: "Failed to update organisation",
        variant: "destructive",
      });
    },
  });

  // Delete organisation mutation
  const deleteOrganisationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/organisations/${id}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organisation deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organisations"] });
    },
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
        description: error.message || "Failed to delete organisation",
        variant: "destructive",
      });
    },
  });

  // Assign user to organisation mutation
  const assignUserMutation = useMutation({
    mutationFn: async ({ userId, organisationId }: { userId: string; organisationId: number }) => {
      const response = await apiRequest("PUT", `/api/admin/users/${userId}/assign`, { organisationId });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User assigned to organisation successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organisations"] });
      setSelectedUser(null);
      setSelectedOrgId("");
      setShowAssignUser(false);
    },
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
        description: "Failed to assign user to organisation",
        variant: "destructive",
      });
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserForm) => {
      const response = await apiRequest("POST", `/api/admin/users`, userData);
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("Create user response:", data);
      toast({
        title: "Success",
        description: "User created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setUserFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        organisationId: undefined,
        isAdmin: false,
      });
      setShowCreateUser(false);
      setTempPassword(data.tempPassword || "");
      setShowPasswordDialog(true);
    },
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
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/reset-password`);
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("Reset password response:", data);
      toast({
        title: "Success",
        description: "Password reset successfully",
      });
      setTempPassword(data.tempPassword || "");
      setShowPasswordDialog(true);
    },
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
        description: "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  // Toggle admin status mutation
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      const endpoint = makeAdmin ? "make-admin" : "remove-admin";
      const response = await apiRequest("PUT", `/api/admin/users/${userId}/${endpoint}`);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
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
        description: error.message || "Failed to update admin status",
        variant: "destructive",
      });
    },
  });

  // Copy temp password to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Temporary password copied to clipboard",
    });
  };

  // Check for admin access errors
  if (usersError || orgsError) {
    const errorMessage = (usersError as any)?.message || (orgsError as any)?.message;
    
    if (errorMessage?.includes("Admin access required") || errorMessage?.includes("403")) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">🚫</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have admin privileges to access this panel.</p>
            <p className="text-sm text-gray-500 mt-2">Contact your administrator to request admin access.</p>
          </div>
        </div>
      );
    }
  }

  if (usersLoading || orgsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Enhanced Admin Panel</h1>
            <p className="text-gray-600">Comprehensive user and organisation management</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/system-monitoring">
            <Button variant="outline" size="sm">
              <Activity className="h-4 w-4 mr-2" />
              System Monitoring
            </Button>
          </Link>
          <Link href="/admin-payment-performance-report">
            <Button variant="outline" size="sm">
              <CreditCard className="h-4 w-4 mr-2" />
              Payment Performance
            </Button>
          </Link>
          <Link href="/advanced-reports">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Advanced Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {users?.filter((u: User) => !u.organisationId).length || 0} unassigned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organisations</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organisations?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active organisations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.filter((u: User) => u.isAdmin).length || 0}</div>
            <p className="text-xs text-muted-foreground">With admin privileges</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">@chadlaw Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter((u: User) => u.email?.endsWith('@chadlaw.co.uk')).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Internal users</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="organisations">Organisations</TabsTrigger>
          <TabsTrigger value="cases">Case Management</TabsTrigger>
          <TabsTrigger value="api-guide">API Integration</TabsTrigger>
          <TabsTrigger value="user-guide">User Guide</TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Create and manage user accounts with comprehensive controls</CardDescription>
                </div>
                <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                  <DialogTrigger asChild>
                    <Button className="bg-acclaim-teal hover:bg-acclaim-teal/90">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Create a new user account with temporary password
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            value={userFormData.firstName}
                            onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                            placeholder="John"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            value={userFormData.lastName}
                            onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                            placeholder="Doe"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={userFormData.email}
                          onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                          placeholder="john.doe@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone (Optional)</Label>
                        <Input
                          id="phone"
                          value={userFormData.phone}
                          onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                          placeholder="+44 20 7123 4567"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="organisation">Organisation</Label>
                        <Select 
                          value={userFormData.organisationId?.toString() || "none"}
                          onValueChange={(value) => setUserFormData({ 
                            ...userFormData, 
                            organisationId: value === "none" ? undefined : parseInt(value) 
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select organisation (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No organisation</SelectItem>
                            {organisations?.map((org: Organisation) => (
                              <SelectItem key={org.id} value={org.id.toString()}>
                                {org.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isAdmin"
                          checked={userFormData.isAdmin}
                          onCheckedChange={(checked) => setUserFormData({ ...userFormData, isAdmin: checked as boolean })}
                        />
                        <Label htmlFor="isAdmin">Admin privileges</Label>
                      </div>
                      {userFormData.isAdmin && (
                        <div className="bg-amber-50 border border-amber-200 rounded p-3">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <p className="text-sm text-amber-700">
                              Admin privileges can only be assigned to @chadlaw.co.uk email addresses
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowCreateUser(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => createUserMutation.mutate(userFormData)}
                        disabled={createUserMutation.isPending}
                        className="bg-acclaim-teal hover:bg-acclaim-teal/90"
                      >
                        {createUserMutation.isPending ? "Creating..." : "Create User"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.firstName} {user.lastName}</div>
                        <div className="text-sm text-gray-500">{user.id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{user.email}</span>
                          {user.email?.endsWith('@chadlaw.co.uk') && (
                            <Shield className="h-3 w-3 text-blue-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{user.phone || "-"}</TableCell>
                      <TableCell>
                        {user.organisationName ? (
                          <Badge variant="outline">{user.organisationName}</Badge>
                        ) : (
                          <Badge variant="secondary">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {user.isAdmin && (
                            <Badge variant="default" className="bg-blue-100 text-blue-800">
                              Admin
                            </Badge>
                          )}
                          <Badge variant="outline">Active</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowAssignUser(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetPasswordMutation.mutate(user.id)}
                            disabled={resetPasswordMutation.isPending}
                          >
                            <Key className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Check if trying to grant admin to non-chadlaw email
                              if (!user.isAdmin && !user.email?.endsWith('@chadlaw.co.uk')) {
                                alert('Admin privileges can only be granted to @chadlaw.co.uk email addresses.');
                                return;
                              }
                              
                              const action = user.isAdmin ? 'remove admin privileges from' : 'grant admin privileges to';
                              const confirmation = confirm(`Are you sure you want to ${action} ${user.firstName} ${user.lastName}?`);
                              if (confirmation) {
                                toggleAdminMutation.mutate({
                                  userId: user.id,
                                  makeAdmin: !user.isAdmin
                                });
                              }
                            }}
                            disabled={toggleAdminMutation.isPending || (!user.isAdmin && !user.email?.endsWith('@chadlaw.co.uk'))}
                            className={(!user.isAdmin && !user.email?.endsWith('@chadlaw.co.uk')) ? 'opacity-50 cursor-not-allowed' : ''}
                          >
                            {user.isAdmin ? (
                              <ShieldCheck className="h-3 w-3 text-blue-600" />
                            ) : (
                              <Shield className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organisations Tab */}
        <TabsContent value="organisations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Organisations</CardTitle>
                  <CardDescription>Manage client organisations</CardDescription>
                </div>
                <Dialog open={showCreateOrg} onOpenChange={setShowCreateOrg}>
                  <DialogTrigger asChild>
                    <Button className="bg-acclaim-teal hover:bg-acclaim-teal/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Organisation
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Organisation</DialogTitle>
                      <DialogDescription>
                        Add a new client organisation to the system
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Organisation Name</Label>
                        <Input
                          id="name"
                          value={newOrgName}
                          onChange={(e) => setNewOrgName(e.target.value)}
                          placeholder="Enter organisation name"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowCreateOrg(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => createOrganisationMutation.mutate({ name: newOrgName })}
                        disabled={createOrganisationMutation.isPending}
                        className="bg-acclaim-teal hover:bg-acclaim-teal/90"
                      >
                        {createOrganisationMutation.isPending ? "Creating..." : "Create"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organisations?.map((org: Organisation) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div className="font-medium">{org.name}</div>
                        <div className="text-sm text-gray-500">ID: {org.id}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{org.userCount} users</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(org.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditingOrg(org);
                              setOrgFormData({ name: org.name });
                              setShowEditOrg(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${org.name}"? This action cannot be undone.`)) {
                                deleteOrganisationMutation.mutate(org.id);
                              }
                            }}
                            disabled={deleteOrganisationMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cases Tab */}
        <TabsContent value="cases">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Case Management</CardTitle>
                  <CardDescription>Archive or permanently delete cases across all organizations</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CaseManagementTab />
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Integration Tab */}
        <TabsContent value="api-guide">
          <div className="flex justify-center">
            <ApiGuideDownload />
          </div>
        </TabsContent>

        {/* User Guide Tab */}
        <TabsContent value="user-guide">
          <div className="flex justify-center">
            <UserGuideDownload />
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Organization Dialog */}
      <Dialog open={showEditOrg} onOpenChange={setShowEditOrg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organisation</DialogTitle>
            <DialogDescription>
              Update the organisation details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editOrgName">Organisation Name</Label>
              <Input
                id="editOrgName"
                value={orgFormData.name}
                onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })}
                placeholder="Enter organisation name"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowEditOrg(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingOrg) {
                  updateOrganisationMutation.mutate({ 
                    id: editingOrg.id, 
                    data: orgFormData 
                  });
                }
              }}
              disabled={updateOrganisationMutation.isPending}
              className="bg-acclaim-teal hover:bg-acclaim-teal/90"
            >
              {updateOrganisationMutation.isPending ? "Updating..." : "Update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Assignment Dialog */}
      <Dialog open={showAssignUser} onOpenChange={setShowAssignUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign User to Organisation</DialogTitle>
            <DialogDescription>
              Select an organisation for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="organisation">Organisation</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organisation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select organisation</SelectItem>
                  {organisations?.map((org: Organisation) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowAssignUser(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedUser && selectedOrgId && selectedOrgId !== "none") {
                  assignUserMutation.mutate({
                    userId: selectedUser.id,
                    organisationId: parseInt(selectedOrgId)
                  });
                }
              }}
              disabled={assignUserMutation.isPending}
              className="bg-acclaim-teal hover:bg-acclaim-teal/90"
            >
              {assignUserMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Temporary Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary Password Created</DialogTitle>
            <DialogDescription>
              Please provide this temporary password to the user. They will be required to change it on first login.
            </DialogDescription>
          </DialogHeader>
          {console.log("Dialog tempPassword state:", tempPassword)}
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <div className="flex items-center space-x-2">
                <Input
                  value={tempPassword}
                  readOnly
                  className="font-mono bg-gray-50"
                  placeholder={!tempPassword ? "Loading..." : ""}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(tempPassword)}
                  disabled={!tempPassword}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {tempPassword && (
                <p className="text-xs text-gray-500 mt-1">
                  Password length: {tempPassword.length} characters
                </p>
              )}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-700">
                  This password will only be shown once. Make sure to copy it and provide it to the user securely.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowPasswordDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}