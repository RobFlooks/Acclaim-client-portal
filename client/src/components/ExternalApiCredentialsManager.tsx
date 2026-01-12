import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus, Key, Building, User, AlertCircle, Eye, EyeOff, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ExternalApiCredential {
  id: number;
  organisationId: number;
  username: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

interface OrganisationCredentials {
  organisationId: number;
  organisationName: string;
  credentials: ExternalApiCredential[];
}

export default function ExternalApiCredentialsManager() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetCredentialId, setResetCredentialId] = useState<number | null>(null);
  const [resetCredentialUsername, setResetCredentialUsername] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    organisationId: '',
    username: '',
    password: '',
    confirmPassword: '',
    description: ''
  });
  const [resetFormData, setResetFormData] = useState({
    newPassword: '',
    confirmNewPassword: ''
  });

  const { data: credentialsData, isLoading } = useQuery<OrganisationCredentials[]>({
    queryKey: ['/api/admin/external-credentials'],
  });

  const { data: organisations } = useQuery<any[]>({
    queryKey: ['/api/admin/organisations'],
  });

  const createCredentialMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/admin/external-credentials', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/external-credentials'] });
      setShowCreateDialog(false);
      setFormData({ organisationId: '', username: '', password: '', confirmPassword: '', description: '' });
      setShowPassword(false);
      setShowConfirmPassword(false);
      toast({
        title: "Success",
        description: "Master admin credentials created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create credentials",
        variant: "destructive",
      });
    },
  });

  const deleteCredentialMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/admin/external-credentials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/external-credentials'] });
      toast({
        title: "Success",
        description: "Credentials deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete credentials",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { id: number; newPassword: string }) => {
      return apiRequest('PATCH', `/api/admin/external-credentials/${data.id}/reset-password`, { 
        newPassword: data.newPassword 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/external-credentials'] });
      setShowResetDialog(false);
      setResetCredentialId(null);
      setResetCredentialUsername('');
      setResetFormData({ newPassword: '', confirmNewPassword: '' });
      setShowResetPassword(false);
      setShowResetConfirmPassword(false);
      toast({
        title: "Success",
        description: "Password reset successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const handleCreateCredential = () => {
    if (!formData.organisationId || !formData.username || !formData.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    const { confirmPassword, ...dataToSend } = formData;
    createCredentialMutation.mutate(dataToSend);
  };

  const handleResetPassword = () => {
    if (!resetFormData.newPassword) {
      toast({
        title: "Error",
        description: "Please enter a new password",
        variant: "destructive",
      });
      return;
    }

    if (resetFormData.newPassword !== resetFormData.confirmNewPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (resetFormData.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    const hasUppercase = /[A-Z]/.test(resetFormData.newPassword);
    const hasLowercase = /[a-z]/.test(resetFormData.newPassword);
    const hasNumber = /[0-9]/.test(resetFormData.newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(resetFormData.newPassword);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      toast({
        title: "Error",
        description: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        variant: "destructive",
      });
      return;
    }

    if (resetCredentialId) {
      resetPasswordMutation.mutate({ 
        id: resetCredentialId, 
        newPassword: resetFormData.newPassword 
      });
    }
  };

  const openResetDialog = (credential: ExternalApiCredential) => {
    setResetCredentialId(credential.id);
    setResetCredentialUsername(credential.username);
    setResetFormData({ newPassword: '', confirmNewPassword: '' });
    setShowResetPassword(false);
    setShowResetConfirmPassword(false);
    setShowResetDialog(true);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">External API Credentials</h2>
          <p className="text-gray-600">Manage master admin credentials for case management integration</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-acclaim-teal hover:bg-acclaim-teal/90">
              <Plus className="h-4 w-4 mr-2" />
              Create Credentials
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Master Admin Credentials</DialogTitle>
              <DialogDescription>
                Create new credentials for case management system integration
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organisation">Organisation *</Label>
                <Select 
                  value={formData.organisationId} 
                  onValueChange={(value) => setFormData({ ...formData, organisationId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organisation" />
                  </SelectTrigger>
                  <SelectContent>
                    {organisations?.map((org) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter username for API access"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter secure password (min 8 characters)"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirm your password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Production API credentials"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Important Security Note:</p>
                    <p>These credentials will be used by your case management system to authenticate API requests. Store them securely and do not share them.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateCredential}
                disabled={createCredentialMutation.isPending}
                className="bg-acclaim-teal hover:bg-acclaim-teal/90"
              >
                {createCredentialMutation.isPending ? "Creating..." : "Create Credentials"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset API Password</DialogTitle>
            <DialogDescription>
              Reset the password for <span className="font-medium">{resetCredentialUsername}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password *</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showResetPassword ? "text" : "password"}
                  value={resetFormData.newPassword}
                  onChange={(e) => setResetFormData({ ...resetFormData, newPassword: e.target.value })}
                  placeholder="Enter new password (min 8 characters)"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                >
                  {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Confirm New Password *</Label>
              <div className="relative">
                <Input
                  id="confirmNewPassword"
                  type={showResetConfirmPassword ? "text" : "password"}
                  value={resetFormData.confirmNewPassword}
                  onChange={(e) => setResetFormData({ ...resetFormData, confirmNewPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                >
                  {showResetConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Important:</p>
                  <p>After resetting, update the password in your case management system (SOS) to match.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetPasswordMutation.isPending}
              className="bg-acclaim-teal hover:bg-acclaim-teal/90"
            >
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credentials by Organisation */}
      <div className="space-y-4">
        {credentialsData?.map((orgData) => (
          <Card key={orgData.organisationId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Building className="h-5 w-5 text-acclaim-teal" />
                  <div>
                    <CardTitle className="text-lg">{orgData.organisationName}</CardTitle>
                    <CardDescription>
                      {orgData.credentials.length} credential{orgData.credentials.length !== 1 ? 's' : ''} configured
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={orgData.credentials.length > 0 ? "default" : "secondary"}>
                  {orgData.credentials.length > 0 ? "Configured" : "Not Set Up"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {orgData.credentials.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Key className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No API credentials configured for this organisation</p>
                  <p className="text-sm">Case management integration is not available</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgData.credentials.map((credential) => (
                      <TableRow key={credential.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{credential.username}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {credential.description || (
                            <span className="text-gray-400 italic">No description</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={credential.isActive ? "default" : "secondary"}>
                            {credential.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(credential.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openResetDialog(credential)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Reset Password"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteCredentialMutation.mutate(credential.id)}
                              disabled={deleteCredentialMutation.isPending}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete Credential"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <span>Integration Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Total Organisations</span>
              <Badge variant="outline">{credentialsData?.length || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Organisations with API Access</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                {credentialsData?.filter(org => org.credentials.length > 0).length || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Total API Credentials</span>
              <Badge variant="outline">
                {credentialsData?.reduce((sum, org) => sum + org.credentials.length, 0) || 0}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
