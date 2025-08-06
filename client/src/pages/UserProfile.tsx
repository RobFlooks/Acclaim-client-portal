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
import { User, Settings, Key, Phone, Mail, Calendar, Shield, ArrowLeft, Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { updateUserSchema, changePasswordSchema, updateNotificationPreferencesSchema } from "@shared/schema";
import { z } from "zod";
import { Link } from "wouter";

type UpdateProfileForm = z.infer<typeof updateUserSchema>;
type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
type NotificationPreferencesForm = z.infer<typeof updateNotificationPreferencesSchema>;

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
    pushNotifications: true,
  });

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
        pushNotifications: userProfile.pushNotifications ?? true,
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
      return await apiRequest("PUT", `/api/user/notifications`, data);
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
    try {
      const validatedData = updateNotificationPreferencesSchema.parse(notificationData);
      updateNotificationsMutation.mutate(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0]?.message || "Please check your preferences",
          variant: "destructive",
        });
      }
    }
  };

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
          {userProfile?.organisationName && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4 text-gray-500" />
                <p className="text-sm text-gray-500">Organisation</p>
              </div>
              <p className="font-medium mt-1">{userProfile.organisationName}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile Information</TabsTrigger>
          <TabsTrigger value="security">Security & Password</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
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
                  <p className="text-sm text-gray-500">
                    Email address cannot be changed. Contact your administrator if you need to update this.
                  </p>
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
                    Password must be at least 8 characters long.
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
              <CardDescription>
                Control how you receive notifications from the case management system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNotificationsSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-1">
                      <Label htmlFor="emailNotifications" className="text-base font-medium">
                        Email Notifications
                      </Label>
                      <p className="text-sm text-gray-500">
                        Receive notifications via email when case updates are posted by your legal team.
                      </p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={notificationData.emailNotifications}
                      onCheckedChange={(checked) => 
                        setNotificationData({ ...notificationData, emailNotifications: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-1">
                      <Label htmlFor="pushNotifications" className="text-base font-medium">
                        Push Notifications
                      </Label>
                      <p className="text-sm text-gray-500">
                        Receive instant push notifications when messages are sent from your case management system.
                      </p>
                    </div>
                    <Switch
                      id="pushNotifications"
                      checked={notificationData.pushNotifications}
                      onCheckedChange={(checked) => 
                        setNotificationData({ ...notificationData, pushNotifications: checked })
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
      </Tabs>
    </div>
  );
}