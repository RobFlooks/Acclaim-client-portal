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
import { User, Settings, Key, Phone, Mail, Calendar, Shield, ArrowLeft, Bell, ExternalLink, Building2, Briefcase, Users, FileText, Gavel, AlertTriangle, Megaphone, Home, Trophy } from "lucide-react";
import chadwickLawrenceLogo from "@assets/CL_long_logo_1768312503635.png";
import { useAuth } from "@/hooks/use-auth";
import { updateUserSchema, changePasswordSchema } from "@shared/schema";
import { z } from "zod";
import { Link } from "wouter";

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
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="legal-support" className="bg-[#ba1b6e] text-white hover:bg-[#a01860] data-[state=active]:bg-[#ba1b6e] data-[state=active]:text-white">Other Legal Services</TabsTrigger>
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

        {/* Legal Support Tab */}
        <TabsContent value="legal-support">
          <Card>
            <CardHeader className="bg-white border-b rounded-t-lg">
              <div className="flex items-center justify-center py-2">
                <img 
                  src={chadwickLawrenceLogo} 
                  alt="Chadwick Lawrence - Yorkshire's Legal People" 
                  className="h-16 object-contain"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-6">
                <p className="text-gray-700 leading-relaxed">
                  Chadwick Lawrence remains true to its position as Yorkshire's Legal People, with straightforward, 
                  personable advice from a team that is as passionate about the region as the businesses they advise. 
                  From transactions to insolvency, dispute resolution to employment, we act as legal partner to an 
                  ever-increasing number of businesses in the region.
                </p>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">Our Business Services</h3>
              <p className="text-sm text-gray-500 mb-4">Select a service below to view more information on our website.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Business Property */}
                <a 
                  href="https://www.chadwicklawrence.co.uk/business-services/property/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group block p-4 border rounded-lg hover:border-[#1a3a52] hover:shadow-md transition-all"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-[#1a3a52]/10 rounded-lg group-hover:bg-[#1a3a52]/20 transition-colors">
                      <Building2 className="h-5 w-5 text-[#1a3a52]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 group-hover:text-[#1a3a52]">Business Property</h4>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1a3a52]" />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Commercial property solicitors for leases, portfolios and disposals.</p>
                    </div>
                  </div>
                </a>

                {/* Corporate & Contracts */}
                <a 
                  href="https://www.chadwicklawrence.co.uk/business-services/corporate-and-contracts/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group block p-4 border rounded-lg hover:border-[#1a3a52] hover:shadow-md transition-all"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-[#1a3a52]/10 rounded-lg group-hover:bg-[#1a3a52]/20 transition-colors">
                      <Briefcase className="h-5 w-5 text-[#1a3a52]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 group-hover:text-[#1a3a52]">Corporate & Contracts</h4>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1a3a52]" />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Practical, accurate and cost-effective advice for transactions and contracts.</p>
                    </div>
                  </div>
                </a>

                {/* Corporate Recovery & Insolvency */}
                <a 
                  href="https://www.chadwicklawrence.co.uk/business-services/corporate-recovery-insolvency/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group block p-4 border rounded-lg hover:border-[#1a3a52] hover:shadow-md transition-all"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-[#1a3a52]/10 rounded-lg group-hover:bg-[#1a3a52]/20 transition-colors">
                      <AlertTriangle className="h-5 w-5 text-[#1a3a52]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 group-hover:text-[#1a3a52]">Recovery & Insolvency</h4>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1a3a52]" />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Realistic commercial solutions for business and personal financial affairs.</p>
                    </div>
                  </div>
                </a>

                {/* Employment Law */}
                <a 
                  href="https://www.chadwicklawrence.co.uk/business-services/employment-law/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group block p-4 border rounded-lg hover:border-[#1a3a52] hover:shadow-md transition-all"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-[#1a3a52]/10 rounded-lg group-hover:bg-[#1a3a52]/20 transition-colors">
                      <Users className="h-5 w-5 text-[#1a3a52]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 group-hover:text-[#1a3a52]">Employment Law</h4>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1a3a52]" />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Employment law, health & safety, HR support and litigation services.</p>
                    </div>
                  </div>
                </a>

                {/* Intellectual Property */}
                <a 
                  href="https://www.chadwicklawrence.co.uk/business-services/intellectual-property/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group block p-4 border rounded-lg hover:border-[#1a3a52] hover:shadow-md transition-all"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-[#1a3a52]/10 rounded-lg group-hover:bg-[#1a3a52]/20 transition-colors">
                      <FileText className="h-5 w-5 text-[#1a3a52]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 group-hover:text-[#1a3a52]">Intellectual Property</h4>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1a3a52]" />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Protect your business information and data assets.</p>
                    </div>
                  </div>
                </a>

                {/* Litigation */}
                <a 
                  href="https://www.chadwicklawrence.co.uk/business-services/litigation-in-business/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group block p-4 border rounded-lg hover:border-[#1a3a52] hover:shadow-md transition-all"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-[#1a3a52]/10 rounded-lg group-hover:bg-[#1a3a52]/20 transition-colors">
                      <Gavel className="h-5 w-5 text-[#1a3a52]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 group-hover:text-[#1a3a52]">Litigation</h4>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1a3a52]" />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Proactive problem-solving with expertise and value.</p>
                    </div>
                  </div>
                </a>

                {/* Media Law */}
                <a 
                  href="https://www.chadwicklawrence.co.uk/business-services/media-law-and-reputation/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group block p-4 border rounded-lg hover:border-[#1a3a52] hover:shadow-md transition-all"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-[#1a3a52]/10 rounded-lg group-hover:bg-[#1a3a52]/20 transition-colors">
                      <Megaphone className="h-5 w-5 text-[#1a3a52]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 group-hover:text-[#1a3a52]">Media Law & Reputation</h4>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1a3a52]" />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Protect and manage your media presence and reputation.</p>
                    </div>
                  </div>
                </a>

                {/* Regulatory Services */}
                <a 
                  href="https://www.chadwicklawrence.co.uk/business-services/regulatory-services-solicitors/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group block p-4 border rounded-lg hover:border-[#1a3a52] hover:shadow-md transition-all"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-[#1a3a52]/10 rounded-lg group-hover:bg-[#1a3a52]/20 transition-colors">
                      <Shield className="h-5 w-5 text-[#1a3a52]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 group-hover:text-[#1a3a52]">Regulatory Services</h4>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1a3a52]" />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Navigate regulatory investigations and compliance.</p>
                    </div>
                  </div>
                </a>

                {/* Social Housing */}
                <a 
                  href="https://www.chadwicklawrence.co.uk/business-services/social-housing-management/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group block p-4 border rounded-lg hover:border-[#1a3a52] hover:shadow-md transition-all"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-[#1a3a52]/10 rounded-lg group-hover:bg-[#1a3a52]/20 transition-colors">
                      <Home className="h-5 w-5 text-[#1a3a52]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 group-hover:text-[#1a3a52]">Social Housing</h4>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1a3a52]" />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Specialist legal support for housing management.</p>
                    </div>
                  </div>
                </a>

                {/* Sports Law */}
                <a 
                  href="https://www.chadwicklawrence.co.uk/business-services/sports-law/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group block p-4 border rounded-lg hover:border-[#1a3a52] hover:shadow-md transition-all"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-[#1a3a52]/10 rounded-lg group-hover:bg-[#1a3a52]/20 transition-colors">
                      <Trophy className="h-5 w-5 text-[#1a3a52]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 group-hover:text-[#1a3a52]">Sports Law</h4>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1a3a52]" />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Specialist support for players, clubs and representatives.</p>
                    </div>
                  </div>
                </a>
              </div>

              {/* Contact Section */}
              <div className="mt-8 p-6 bg-gradient-to-r from-[#2e3b7c] to-[#4a5ba8] rounded-lg text-white">
                <h3 className="text-lg font-semibold mb-3">Get in Touch</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-200 text-sm mb-1">Freephone</p>
                    <a href="tel:08000150340" className="text-white font-medium hover:underline">0800 015 0340</a>
                  </div>
                  <div>
                    <p className="text-gray-200 text-sm mb-1">Email</p>
                    <a href="mailto:info@chadlaw.co.uk" className="text-white font-medium hover:underline">info@chadlaw.co.uk</a>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/20">
                  <a 
                    href="https://www.chadwicklawrence.co.uk/business-services/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-white hover:underline"
                  >
                    <span>View all services on our website</span>
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}