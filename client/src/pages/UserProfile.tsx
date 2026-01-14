import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { User, Settings, Key, Phone, Mail, Calendar, Shield, ArrowLeft, Bell, Building2, FileText, Download, Trash2, Upload, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { updateUserSchema, changePasswordSchema } from "@shared/schema";
import { z } from "zod";
import { Link, useSearch } from "wouter";

type UpdateProfileForm = z.infer<typeof updateUserSchema>;
type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
type NotificationPreferencesForm = {
  emailNotifications: boolean;
};

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  organisationId: number | null;
  organisationName?: string;
  isAdmin?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  createdAt: string;
}

export default function UserProfile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const searchString = useSearch();
  
  // Get tab from URL query parameter
  const getInitialTab = () => {
    const params = new URLSearchParams(searchString);
    const tab = params.get("tab");
    if (tab && ["profile", "security", "notifications", "organisation"].includes(tab)) {
      return tab;
    }
    return "profile";
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab);
  
  const [profileData, setProfileData] = useState<UpdateProfileForm>({
    firstName: "",
    lastName: "",
    phone: "",
  });
  
  const [passwordData, setPasswordData] = useState<ChangePasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  
  const [notificationData, setNotificationData] = useState<NotificationPreferencesForm>({
    emailNotifications: true,
  });

  // Organisation documents state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documentSearch, setDocumentSearch] = useState("");
  const [selectedOrgForUpload, setSelectedOrgForUpload] = useState<string>("");

  // Fetch user profile data
  const { data: userProfile, isLoading: profileLoading } = useQuery<UserData>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Check if password change is required
  const { data: passwordStatus } = useQuery({
    queryKey: ["/api/user/password-status"],
    retry: false,
  });

  // Fetch user's organisations
  const { data: userOrganisations } = useQuery<any[]>({
    queryKey: ["/api/user/organisations"],
    retry: false,
  });

  // Fetch organisation documents (documents without case association)
  const { data: orgDocuments, isLoading: documentsLoading } = useQuery<any[]>({
    queryKey: ["/api/organisation/documents"],
    retry: false,
  });

  // Update form data when user profile is loaded
  useEffect(() => {
    if (userProfile) {
      setProfileData({
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        phone: userProfile.phone || "",
      });
      setNotificationData({
        emailNotifications: userProfile.emailNotifications ?? true,
      });
    }
  }, [userProfile]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileForm) => {
      return await apiRequest("PUT", `/api/user/profile`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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
      console.error("Profile update error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  // Update notification preferences mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: NotificationPreferencesForm) => {
      return await apiRequest("PUT", `/api/user/notifications`, { 
        emailNotifications: data.emailNotifications,
        pushNotifications: true // Always enable push notifications on backend
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notification preferences updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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
      console.error("Notification preferences update error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update notification preferences",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordForm) => {
      return await apiRequest("POST", `/api/user/change-password`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordErrors({});
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
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  // Handle profile form submission
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validatedData = updateUserSchema.parse(profileData);
      updateProfileMutation.mutate(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0]?.message || "Please check your input",
          variant: "destructive",
        });
      }
    }
  };

  // Handle password form submission
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});
    
    try {
      const validatedData = changePasswordSchema.parse(passwordData);
      changePasswordMutation.mutate(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setPasswordErrors(errors);
      }
    }
  };

  // Handle notifications form submission
  const handleNotificationsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateNotificationsMutation.mutate(notificationData);
  };

  // Format file size helper
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Handle document upload
  const handleDocumentUpload = async () => {
    if (!selectedFile) return;
    
    // Determine organisation ID for upload
    let orgId: number | null = null;
    if (userOrganisations && userOrganisations.length > 1 && selectedOrgForUpload) {
      orgId = parseInt(selectedOrgForUpload);
    } else if (userOrganisations && userOrganisations.length === 1) {
      orgId = userOrganisations[0].id;
    } else if (userProfile?.organisationId) {
      orgId = userProfile.organisationId;
    }

    if (!orgId) {
      toast({
        title: "Error",
        description: "Please select an organisation to upload the document to.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("organisationId", orgId.toString());

      const response = await fetch("/api/organisation/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Upload failed");
      }

      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/organisation/documents"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle document download
  const handleDocumentDownload = async (doc: any) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/download`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Download failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  // Handle document delete
  const handleDocumentDelete = async (docId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    
    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) throw new Error("Delete failed");

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organisation/documents"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  // Filter and group documents by organisation
  const filteredDocuments = orgDocuments?.filter((doc: any) => {
    if (!documentSearch) return true;
    const searchLower = documentSearch.toLowerCase();
    return (
      doc.fileName?.toLowerCase().includes(searchLower) ||
      doc.organisationName?.toLowerCase().includes(searchLower) ||
      doc.uploaderFirstName?.toLowerCase().includes(searchLower) ||
      doc.uploaderLastName?.toLowerCase().includes(searchLower)
    );
  });

  const documentsByOrg = filteredDocuments?.reduce((acc: any, doc: any) => {
    const orgName = doc.organisationName || "Unknown Organisation";
    if (!acc[orgName]) acc[orgName] = [];
    acc[orgName].push(doc);
    return acc;
  }, {});

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
            <h1 className="text-2xl font-bold">Profile Settings</h1>
            <p className="text-gray-600">Manage your account information and security settings</p>
          </div>
        </div>
      </div>
      {/* Password Change Required Alert */}
      {passwordStatus?.mustChangePassword && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Key className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-800">Password Change Required</p>
                <p className="text-sm text-amber-700">
                  You must change your password before continuing to use the system.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Account Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{userProfile?.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{userProfile?.phone || "Not provided"}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="font-medium">
                    {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : "Unknown"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Shield className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Account Status</p>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">Active</Badge>
                    {userProfile?.isAdmin && (
                      <Badge variant="default" className="bg-blue-100 text-blue-800">
                        Admin
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Main Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="organisation">Organisation</TabsTrigger>
        </TabsList>

        {/* Profile Information Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information. Note: Email address cannot be changed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      placeholder="Enter your first name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      placeholder="Enter your last name"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    value={userProfile?.email || ""}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-sm text-gray-500">Email address cannot be changed. Please contact us if you need to update this.</p>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="bg-acclaim-teal hover:bg-acclaim-teal/90"
                  >
                    {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security & Password Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security & Password</CardTitle>
              <CardDescription>
                Change your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Enter your current password"
                    required
                  />
                  {passwordErrors.currentPassword && (
                    <p className="text-sm text-red-600">{passwordErrors.currentPassword}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Enter your new password"
                    required
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-sm text-red-600">{passwordErrors.newPassword}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirm your new password"
                    required
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="text-sm text-red-600">{passwordErrors.confirmPassword}</p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                    className="bg-acclaim-teal hover:bg-acclaim-teal/90"
                  >
                    {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Preferences Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Preferences</span>
              </CardTitle>
              <CardDescription>Control how you receive email notifications.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNotificationsSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-1">
                      <Label htmlFor="emailNotifications" className="text-base font-medium">
                        Email Notifications
                      </Label>
                      <p className="text-sm text-gray-500">Receive email notifications when messages are posted by Acclaim.</p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={notificationData.emailNotifications}
                      onCheckedChange={(checked) => 
                        setNotificationData({ emailNotifications: checked })
                      }
                    />
                  </div>

                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={updateNotificationsMutation.isPending}
                      className="bg-acclaim-teal hover:bg-acclaim-teal/90"
                    >
                      {updateNotificationsMutation.isPending ? "Saving..." : "Save Preferences"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organisation Tab */}
        <TabsContent value="organisation">
          <div className="space-y-6">
            {/* Admin explanation */}
            {userProfile?.isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5" />
                    <span>Organisation Documents</span>
                  </CardTitle>
                  <CardDescription>
                    As an administrator, you have access to documents from all organisations. Use this section to view and manage documents shared across organisations.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {/* Organisation Info - only show for non-admin users */}
            {!userProfile?.isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5" />
                    <span>{userOrganisations && userOrganisations.length > 1 ? "Your Organisations" : "Your Organisation"}</span>
                  </CardTitle>
                  <CardDescription>View your organisation details and shared documents.</CardDescription>
                </CardHeader>
                <CardContent>
                  {userOrganisations && userOrganisations.length > 0 ? (
                    <div className="space-y-3">
                      {userOrganisations.map((org: any) => (
                        <div key={org.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Building2 className="h-5 w-5 text-acclaim-teal" />
                            <div>
                              <p className="font-medium text-lg">{org.name}</p>
                              <p className="text-sm text-gray-500">You are a member of this organisation</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">You are not currently assigned to any organisation.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Organisation Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Organisation Documents</span>
                </CardTitle>
                <CardDescription>
                  Documents shared with your organisation. These are visible to all members of your organisation and Acclaim.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Upload Section */}
                <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg space-y-4">
                  {userOrganisations && userOrganisations.length > 1 && (
                    <div>
                      <Label htmlFor="uploadOrg">Upload to Organisation</Label>
                      <Select value={selectedOrgForUpload} onValueChange={setSelectedOrgForUpload}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select organisation..." />
                        </SelectTrigger>
                        <SelectContent>
                          {userOrganisations.map((org: any) => (
                            <SelectItem key={org.id} value={org.id.toString()}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <Input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.csv"
                      className="flex-1"
                    />
                    <Button
                      onClick={handleDocumentUpload}
                      disabled={!selectedFile || isUploading || (userOrganisations && userOrganisations.length > 1 && !selectedOrgForUpload)}
                      className="bg-acclaim-teal hover:bg-acclaim-teal/90 w-full sm:w-auto"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploading ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                  {selectedFile && (
                    <p className="text-sm text-gray-600">
                      Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>

                {/* Search Section */}
                {orgDocuments && orgDocuments.length > 0 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search documents by name, organisation, or uploader..."
                      value={documentSearch}
                      onChange={(e) => setDocumentSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                )}

                {/* Documents List - Grouped by Organisation */}
                <div>
                  {documentsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="mt-2 text-gray-500">Loading documents...</p>
                    </div>
                  ) : documentsByOrg && Object.keys(documentsByOrg).length > 0 ? (
                    <div className="space-y-6">
                      {Object.entries(documentsByOrg).map(([orgName, docs]) => (
                        <div key={orgName}>
                          <div className="flex items-center space-x-2 mb-3">
                            <Building2 className="h-4 w-4 text-acclaim-teal" />
                            <h4 className="font-semibold text-gray-700">{orgName}</h4>
                            <Badge variant="outline" className="text-xs">{(docs as any[]).length}</Badge>
                          </div>
                          <div className="space-y-2 ml-6">
                            {(docs as any[]).map((doc: any) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center space-x-3 min-w-0 flex-1">
                                  <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">{doc.fileName}</p>
                                    <p className="text-xs text-gray-500">
                                      {doc.uploaderFirstName} {doc.uploaderLastName} • {new Date(doc.createdAt).toLocaleDateString()} • {formatFileSize(doc.fileSize || 0)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDocumentDownload(doc)}
                                    title="Download"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDocumentDelete(doc.id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : documentSearch ? (
                    <div className="text-center py-8 text-gray-500">
                      <Search className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p>No documents match your search.</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p>No organisation documents yet.</p>
                      <p className="text-sm">Upload a document to share with your organisation.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}