import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { User, Settings, Key, Phone, Mail, Calendar, Shield, ArrowLeft, Bell, BellOff, Building2, FileText, Download, Trash2, Upload, Search, Sun, Moon, HelpCircle, Briefcase, MessageSquare, BarChart3, Crown, ShieldCheck, ShieldOff, Loader2, Users, ChevronDown, ChevronUp, UserPlus, UserMinus, Send, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { updateUserSchema, changePasswordSchema } from "@shared/schema";
import { z } from "zod";
import { Link, useSearch } from "wouter";
import { validateFile, ACCEPTED_FILE_TYPES_STRING, MAX_FILE_SIZE_MB, ACCEPTED_FILE_TYPES_DISPLAY } from "@/lib/fileValidation";

type UpdateProfileForm = z.infer<typeof updateUserSchema>;
type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
type NotificationPreferencesForm = {
  emailNotifications: boolean;
  documentNotifications: boolean;
  loginNotifications: boolean;
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
  isSuperAdmin?: boolean;
  emailNotifications?: boolean;
  documentNotifications?: boolean;
  pushNotifications?: boolean;
  loginNotifications?: boolean;
  createdAt: string;
}

export default function UserProfile() {
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
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
    documentNotifications: true,
    loginNotifications: true,
  });

  // Organisation documents state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [documentSearch, setDocumentSearch] = useState("");
  const [selectedOrgForUpload, setSelectedOrgForUpload] = useState<string>("");
  const [notifyOnUpload, setNotifyOnUpload] = useState(true);
  const [documentPage, setDocumentPage] = useState(1);
  const DOCS_PER_PAGE = 10;

  // Document audit dialog state (admin only)
  const [auditDocumentId, setAuditDocumentId] = useState<number | null>(null);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);

  // Case notifications state
  const [caseSearch, setCaseSearch] = useState("");
  const [caseFilter, setCaseFilter] = useState<"all" | "muted" | "unmuted">("all");
  const [casePage, setCasePage] = useState(1);
  const CASES_PER_PAGE = 50;

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

  // Fetch org ownerships (organisations where user is an owner)
  const { data: orgOwnerships } = useQuery<number[]>({
    queryKey: ["/api/org-owner/ownerships"],
    retry: false,
    enabled: !userProfile?.isAdmin, // Only check for non-admin users
  });

  // Org settings state
  const [selectedOrgForSettings, setSelectedOrgForSettings] = useState<string>("");
  const ownedOrgs = userOrganisations?.filter(org => orgOwnerships?.includes(org.id)) || [];
  const currentSettingsOrgId = selectedOrgForSettings ? parseInt(selectedOrgForSettings) : (ownedOrgs[0]?.id || 0);

  // Fetch org users for settings (org owners only)
  const { data: orgSettingsUsers, isLoading: orgUsersLoading } = useQuery<any[]>({
    queryKey: ["/api/org-owner", currentSettingsOrgId, "users"],
    retry: false,
    enabled: currentSettingsOrgId > 0 && ownedOrgs.length > 0,
  });

  // Fetch org cases for settings (org owners only)
  const { data: orgSettingsCases, isLoading: orgCasesLoading } = useQuery<any[]>({
    queryKey: ["/api/org-owner", currentSettingsOrgId, "cases"],
    retry: false,
    enabled: currentSettingsOrgId > 0 && ownedOrgs.length > 0,
  });

  // Fetch case restrictions for settings (org owners only)
  const { data: orgRestrictions, isLoading: orgRestrictionsLoading } = useQuery<any[]>({
    queryKey: ["/api/org-owner", currentSettingsOrgId, "restrictions"],
    retry: false,
    enabled: currentSettingsOrgId > 0 && ownedOrgs.length > 0,
  });

  // Toggle restriction mutation
  const toggleRestrictionMutation = useMutation({
    mutationFn: async ({ userId, caseId }: { userId: string; caseId: number }) => {
      const response = await apiRequest("POST", `/api/org-owner/${currentSettingsOrgId}/toggle-restriction`, {
        userId,
        caseId
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: data.restricted ? "Access Restricted" : "Access Restored",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/org-owner", currentSettingsOrgId, "restrictions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update access",
        variant: "destructive",
      });
    },
  });

  const isRestricted = (userId: string, caseId: number) => {
    return orgRestrictions?.some((r: any) => r.userId === userId && r.caseId === caseId) || false;
  };

  const nonAdminOrgUsers = orgSettingsUsers?.filter((u: any) => !u.isAdmin) || [];

  // Org settings UI state
  const [expandedOrgSettings, setExpandedOrgSettings] = useState<number | null>(null);
  const [orgCaseSearch, setOrgCaseSearch] = useState("");
  const [orgCasePage, setOrgCasePage] = useState(1);
  const ORG_CASES_PER_PAGE = 5;

  // Member request form state
  const [memberRequestOpen, setMemberRequestOpen] = useState(false);
  const [memberRequestOrgId, setMemberRequestOrgId] = useState<number | null>(null);
  const [memberRequestData, setMemberRequestData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    memberType: "member" as "member" | "owner",
  });
  const [memberRequestSubmitting, setMemberRequestSubmitting] = useState(false);

  // Filter and paginate org cases
  const filteredOrgCases = orgSettingsCases?.filter((c: any) => {
    if (!orgCaseSearch) return true;
    const search = orgCaseSearch.toLowerCase();
    return c.caseName?.toLowerCase().includes(search) || 
           c.reference?.toLowerCase().includes(search);
  }) || [];
  
  const totalOrgCasePages = Math.ceil(filteredOrgCases.length / ORG_CASES_PER_PAGE);
  const paginatedOrgCases = filteredOrgCases.slice(
    (orgCasePage - 1) * ORG_CASES_PER_PAGE,
    orgCasePage * ORG_CASES_PER_PAGE
  );

  // Reset page when search changes
  const handleOrgCaseSearch = (value: string) => {
    setOrgCaseSearch(value);
    setOrgCasePage(1);
  };

  // Handle member request submission
  const handleMemberRequestSubmit = async () => {
    if (!memberRequestData.firstName || !memberRequestData.lastName || !memberRequestData.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setMemberRequestSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/org-owner/member-request", {
        orgId: memberRequestOrgId,
        firstName: memberRequestData.firstName,
        lastName: memberRequestData.lastName,
        email: memberRequestData.email,
        phone: memberRequestData.phone || undefined,
        memberType: memberRequestData.memberType,
      });

      if (response.ok) {
        toast({
          title: "Request Sent",
          description: "Your member request has been sent to Acclaim for processing.",
        });
        setMemberRequestOpen(false);
        setMemberRequestData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          memberType: "member",
        });
      } else {
        throw new Error("Failed to send request");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send member request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setMemberRequestSubmitting(false);
    }
  };

  // Member removal request state
  const [removalDialogOpen, setRemovalDialogOpen] = useState(false);
  const [removalTarget, setRemovalTarget] = useState<{ userId: string; userName: string; orgId: number } | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [removalSubmitting, setRemovalSubmitting] = useState(false);

  // Owner delegation request state
  const [delegationDialogOpen, setDelegationDialogOpen] = useState(false);
  const [delegationTarget, setDelegationTarget] = useState<{ userId: string; userName: string; orgId: number } | null>(null);
  const [delegationReason, setDelegationReason] = useState("");
  const [delegationSubmitting, setDelegationSubmitting] = useState(false);

  // Remove ownership request state
  const [removeOwnershipDialogOpen, setRemoveOwnershipDialogOpen] = useState(false);
  const [removeOwnershipTarget, setRemoveOwnershipTarget] = useState<{ userId: string; userName: string; orgId: number } | null>(null);
  const [removeOwnershipReason, setRemoveOwnershipReason] = useState("");
  const [removeOwnershipSubmitting, setRemoveOwnershipSubmitting] = useState(false);

  // Bulk member restriction mutation
  const bulkMemberRestrictionMutation = useMutation({
    mutationFn: async ({ orgId, userId, action }: { orgId: number; userId: string; action: 'restrict-all' | 'allow-all' }) => {
      const response = await apiRequest("POST", `/api/org-owner/${orgId}/bulk-member-restriction`, { userId, action });
      if (!response.ok) throw new Error("Failed to update");
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Success", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/org-owner", currentSettingsOrgId, "restrictions"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update restrictions", variant: "destructive" });
    },
  });

  // Bulk case restriction mutation
  const bulkCaseRestrictionMutation = useMutation({
    mutationFn: async ({ orgId, caseId, action }: { orgId: number; caseId: number; action: 'restrict-all' | 'allow-all' }) => {
      const response = await apiRequest("POST", `/api/org-owner/${orgId}/bulk-case-restriction`, { caseId, action });
      if (!response.ok) throw new Error("Failed to update");
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Success", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/org-owner", currentSettingsOrgId, "restrictions"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update restrictions", variant: "destructive" });
    },
  });

  // Handle member removal request
  const handleRemovalSubmit = async () => {
    if (!removalTarget) return;
    setRemovalSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/org-owner/member-removal-request", {
        orgId: removalTarget.orgId,
        targetUserId: removalTarget.userId,
        reason: removalReason || undefined,
      });
      if (response.ok) {
        toast({ title: "Request Sent", description: "Removal request sent to Acclaim for processing." });
        setRemovalDialogOpen(false);
        setRemovalTarget(null);
        setRemovalReason("");
      } else {
        throw new Error("Failed");
      }
    } catch {
      toast({ title: "Error", description: "Failed to send request", variant: "destructive" });
    } finally {
      setRemovalSubmitting(false);
    }
  };

  // Handle owner delegation request
  const handleDelegationSubmit = async () => {
    if (!delegationTarget) return;
    setDelegationSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/org-owner/owner-delegation-request", {
        orgId: delegationTarget.orgId,
        targetUserId: delegationTarget.userId,
        reason: delegationReason || undefined,
      });
      if (response.ok) {
        toast({ title: "Request Sent", description: "Owner delegation request sent to Acclaim." });
        setDelegationDialogOpen(false);
        setDelegationTarget(null);
        setDelegationReason("");
      } else {
        throw new Error("Failed");
      }
    } catch {
      toast({ title: "Error", description: "Failed to send request", variant: "destructive" });
    } finally {
      setDelegationSubmitting(false);
    }
  };

  // Handle remove ownership request
  const handleRemoveOwnershipSubmit = async () => {
    if (!removeOwnershipTarget) return;
    setRemoveOwnershipSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/org-owner/remove-ownership-request", {
        orgId: removeOwnershipTarget.orgId,
        targetUserId: removeOwnershipTarget.userId,
        reason: removeOwnershipReason || undefined,
      });
      if (response.ok) {
        toast({ title: "Request Sent", description: "Ownership removal request sent to Acclaim." });
        setRemoveOwnershipDialogOpen(false);
        setRemoveOwnershipTarget(null);
        setRemoveOwnershipReason("");
      } else {
        throw new Error("Failed");
      }
    } catch {
      toast({ title: "Error", description: "Failed to send request", variant: "destructive" });
    } finally {
      setRemoveOwnershipSubmitting(false);
    }
  };

  // Fetch organisation documents (documents without case association)
  const { data: orgDocuments, isLoading: documentsLoading } = useQuery<any[]>({
    queryKey: ["/api/organisation/documents"],
    retry: false,
  });

  // Fetch all organisations for admin users
  const { data: allOrganisations } = useQuery<any[]>({
    queryKey: ["/api/admin/organisations"],
    retry: false,
    enabled: userProfile?.isAdmin === true,
  });

  // Fetch user's cases for notification settings
  const { data: userCases, isLoading: casesLoading } = useQuery<any[]>({
    queryKey: ["/api/cases"],
    retry: false,
  });

  // Fetch muted cases
  const { data: mutedCasesData, refetch: refetchMutedCases } = useQuery<{ mutedCaseIds: number[] }>({
    queryKey: ["/api/user/muted-cases"],
    retry: false,
  });

  // Refetch muted cases when the cases list changes (e.g., new cases added from SOS)
  useEffect(() => {
    if (userCases) {
      refetchMutedCases();
    }
  }, [userCases?.length, refetchMutedCases]);

  // Mutation for toggling case mute
  const toggleCaseMuteMutation = useMutation({
    mutationFn: async ({ caseId, mute }: { caseId: number; mute: boolean }) => {
      const endpoint = mute ? `/api/cases/${caseId}/mute` : `/api/cases/${caseId}/unmute`;
      return await apiRequest("POST", endpoint);
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.mute ? "Case Muted" : "Case Unmuted",
        description: variables.mute 
          ? "You will no longer receive notifications for this case." 
          : "You will now receive notifications for this case.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/muted-cases"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update case notification setting.",
        variant: "destructive",
      });
    },
  });

  // Mutation for muting all cases
  const muteAllCasesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/user/mute-all-cases");
    },
    onSuccess: (data: any) => {
      toast({
        title: "All Cases Muted",
        description: `${data.mutedCount} case(s) have been muted. You will not receive email notifications for any cases.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/muted-cases"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mute all cases.",
        variant: "destructive",
      });
    },
  });

  // Mutation for unmuting all cases
  const unmuteAllCasesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/user/unmute-all-cases");
    },
    onSuccess: (data: any) => {
      toast({
        title: "All Cases Unmuted",
        description: `${data.unmutedCount} case(s) have been unmuted. You will now receive email notifications for all cases.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/muted-cases"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unmute all cases.",
        variant: "destructive",
      });
    },
  });

  // Query for auto-mute new cases preference
  const { data: autoMutePreference } = useQuery<{ autoMuteNewCases: boolean }>({
    queryKey: ["/api/user/auto-mute-preference"],
  });

  // Mutation for toggling auto-mute new cases preference
  const autoMuteMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return await apiRequest("POST", "/api/user/auto-mute-preference", { enabled });
    },
    onSuccess: (data: any) => {
      toast({
        title: data.autoMuteNewCases ? "Auto-Mute Enabled" : "Auto-Mute Disabled",
        description: data.autoMuteNewCases 
          ? "New cases will be automatically muted when added to the portal."
          : "New cases will no longer be automatically muted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/auto-mute-preference"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update auto-mute preference.",
        variant: "destructive",
      });
    },
  });

  // Fetch document audit logs (admin only)
  const { data: documentAuditLogs, isLoading: auditLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/audit/item/document", auditDocumentId],
    enabled: !!auditDocumentId && auditDialogOpen && userProfile?.isAdmin === true,
    retry: false,
  });

  // Get the list of organisations available for upload (all orgs for admin, user's orgs otherwise)
  const availableOrgsForUpload = userProfile?.isAdmin ? allOrganisations : userOrganisations;

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
        documentNotifications: userProfile.documentNotifications ?? true,
        loginNotifications: userProfile.loginNotifications ?? true,
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
        documentNotifications: data.documentNotifications,
        loginNotifications: data.loginNotifications,
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
    
    // For admins or users with multiple orgs, use selected org
    if (availableOrgsForUpload && availableOrgsForUpload.length > 1 && selectedOrgForUpload) {
      orgId = parseInt(selectedOrgForUpload);
    } else if (availableOrgsForUpload && availableOrgsForUpload.length === 1) {
      orgId = availableOrgsForUpload[0].id;
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
      // Build final filename with original extension
      const ext = selectedFile.name.split('.').pop();
      const finalFileName = customFileName.trim() ? `${customFileName.trim()}.${ext}` : selectedFile.name;
      if (finalFileName !== selectedFile.name) {
        formData.append("customFileName", finalFileName);
      }
      // Admin uploads notify users, regular users notify admin
      if (userProfile?.isAdmin) {
        formData.append("notifyUsers", notifyOnUpload.toString());
      } else {
        formData.append("notifyAdmin", notifyOnUpload.toString());
      }

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
      setCustomFileName("");
      setNotifyOnUpload(true);
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

  // Mutation to track document views
  const trackDocumentViewMutation = useMutation({
    mutationFn: async (documentId: number) => {
      await apiRequest("POST", "/api/track/view", { type: "document", id: documentId });
    },
  });

  // Handle document download
  const handleDocumentDownload = async (doc: any) => {
    try {
      // Track the view for read receipts
      trackDocumentViewMutation.mutate(doc.id);
      
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

  // Paginate filtered documents
  const totalDocPages = Math.ceil((filteredDocuments?.length || 0) / DOCS_PER_PAGE);
  const paginatedDocuments = filteredDocuments?.slice(
    (documentPage - 1) * DOCS_PER_PAGE,
    documentPage * DOCS_PER_PAGE
  );

  const documentsByOrg = paginatedDocuments?.reduce((acc: any, doc: any) => {
    const orgName = doc.organisationName || "Unknown Organisation";
    if (!acc[orgName]) acc[orgName] = [];
    acc[orgName].push(doc);
    return acc;
  }, {});

  // Reset document page when search changes
  const handleDocumentSearch = (value: string) => {
    setDocumentSearch(value);
    setDocumentPage(1);
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
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Profile Settings</h1>
            <p className="text-gray-600">Manage your account information and security settings</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                Portal Guide
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  Quick Portal Guide
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                  <Briefcase className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm">View Your Cases</h4>
                    <p className="text-sm text-muted-foreground">
                      Access your debt recovery cases from the Dashboard or Cases page. Click on any case to view full details, history, and documents.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm">Send & Receive Messages</h4>
                    <p className="text-sm text-muted-foreground">
                      Use the Messages section to communicate with our team. You can send messages about specific cases or general enquiries. You'll receive email notifications for new messages.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                  <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm">Documents</h4>
                    <p className="text-sm text-muted-foreground">
                      View and download documents related to your cases. You can also upload supporting documents when needed. Documents can be found in case details or the Documents section.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm">Reports</h4>
                    <p className="text-sm text-muted-foreground">
                      Access the Reports section to view summaries and statistics about your cases, including payment status and recovery progress.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                  <Bell className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm">Notification Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Control your email notifications in the Notifications tab. You can toggle message and document alerts separately. You can also mute individual cases if needed.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                  <Settings className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm">Profile Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Update your personal details, change your password, and manage your account preferences from this page.
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 border rounded-lg bg-primary/5">
                  <p className="text-sm text-center text-muted-foreground">
                    Need more help? Send us a message through the Messages section and we'll be happy to assist.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
          <TabsTrigger 
            value="profile" 
            className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
          >
            Profile
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 data-[state=active]:border-b-2 data-[state=active]:border-amber-500"
          >
            Security
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:border-b-2 data-[state=active]:border-purple-500"
          >
            Notifications
          </TabsTrigger>
          <TabsTrigger 
            value="organisation" 
            className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 data-[state=active]:border-b-2 data-[state=active]:border-teal-500"
          >
            Organisation
          </TabsTrigger>
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
                      disabled={userProfile?.isAdmin && !userProfile?.isSuperAdmin}
                      className={userProfile?.isAdmin && !userProfile?.isSuperAdmin ? "bg-gray-50" : ""}
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
                      disabled={userProfile?.isAdmin && !userProfile?.isSuperAdmin}
                      className={userProfile?.isAdmin && !userProfile?.isSuperAdmin ? "bg-gray-50" : ""}
                    />
                  </div>
                </div>
                {userProfile?.isAdmin && !userProfile?.isSuperAdmin && (
                  <p className="text-sm text-gray-500">Admin names cannot be changed here. Please contact a super admin if you need to update your name.</p>
                )}
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

          {/* Display Preferences */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <span>Display Preferences</span>
              </CardTitle>
              <CardDescription>Customise how the portal looks for you.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label htmlFor="darkMode" className="text-base font-medium">
                    Dark Mode
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Switch between light and dark theme for easier viewing.
                  </p>
                </div>
                <Switch
                  id="darkMode"
                  checked={theme === "dark"}
                  onCheckedChange={toggleTheme}
                  className="data-[state=unchecked]:bg-gray-300 data-[state=unchecked]:border-gray-400"
                />
              </div>
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
                        Message Notifications
                      </Label>
                      <p className="text-sm text-gray-500">Receive email notifications when messages are posted by Acclaim.</p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={notificationData.emailNotifications}
                      onCheckedChange={(checked) => 
                        setNotificationData(prev => ({ ...prev, emailNotifications: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-1">
                      <Label htmlFor="documentNotifications" className="text-base font-medium">
                        Document Notifications
                      </Label>
                      <p className="text-sm text-gray-500">Receive email notifications when new documents are uploaded.</p>
                    </div>
                    <Switch
                      id="documentNotifications"
                      checked={notificationData.documentNotifications}
                      onCheckedChange={(checked) => 
                        setNotificationData(prev => ({ ...prev, documentNotifications: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-1">
                      <Label htmlFor="loginNotifications" className="text-base font-medium">
                        Login Notifications
                      </Label>
                      <p className="text-sm text-gray-500">Receive email alerts when someone logs into your account, including device and location information.</p>
                    </div>
                    <Switch
                      id="loginNotifications"
                      checked={notificationData.loginNotifications}
                      onCheckedChange={(checked) => 
                        setNotificationData(prev => ({ ...prev, loginNotifications: checked }))
                      }
                    />
                  </div>

                  {/* Warning note about disabled notifications */}
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <strong>Please note:</strong> If email notifications are switched off, you will not receive updates about your cases or messages from our team. If you require regular updates, please contact us to ensure emails are sent to you directly.
                    </p>
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

          {/* Case-Specific Notifications */}
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Case Notifications</span>
              </CardTitle>
              <CardDescription>
                Control email notifications for individual cases. When a case is muted, you will <strong>not</strong> receive any email alerts about new messages or document uploads for that case.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {casesLoading ? (
                <p className="text-sm text-gray-500">Loading cases...</p>
              ) : !userCases || userCases.length === 0 ? (
                <p className="text-sm text-gray-500">No cases found.</p>
              ) : (
                <div className="space-y-3">
                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => muteAllCasesMutation.mutate()}
                      disabled={muteAllCasesMutation.isPending || unmuteAllCasesMutation.isPending}
                      className="text-xs"
                    >
                      <BellOff className="h-3 w-3 mr-1" />
                      {muteAllCasesMutation.isPending ? "Muting..." : "Mute All Cases"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unmuteAllCasesMutation.mutate()}
                      disabled={muteAllCasesMutation.isPending || unmuteAllCasesMutation.isPending}
                      className="text-xs"
                    >
                      <Bell className="h-3 w-3 mr-1" />
                      {unmuteAllCasesMutation.isPending ? "Unmuting..." : "Unmute All Cases"}
                    </Button>
                    {mutedCasesData?.mutedCaseIds && mutedCasesData.mutedCaseIds.length > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center">
                        ({mutedCasesData.mutedCaseIds.length} muted)
                      </span>
                    )}
                  </div>
                  
                  {/* Auto-Mute New Cases Toggle */}
                  <div className="flex items-center justify-between py-3 px-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <BellOff className="h-4 w-4 text-orange-500" />
                        <span className="font-medium text-sm">Auto-Mute New Cases</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        When enabled, any new cases added to the portal will be automatically muted. You won't receive email notifications for these cases unless you manually unmute them.
                      </p>
                    </div>
                    <div className="ml-4">
                      <Button
                        variant={autoMutePreference?.autoMuteNewCases ? "default" : "outline"}
                        size="sm"
                        onClick={() => autoMuteMutation.mutate(!autoMutePreference?.autoMuteNewCases)}
                        disabled={autoMuteMutation.isPending}
                        className={autoMutePreference?.autoMuteNewCases ? "bg-orange-500 hover:bg-orange-600" : ""}
                      >
                        {autoMuteMutation.isPending ? "..." : autoMutePreference?.autoMuteNewCases ? "On" : "Off"}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Search and Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search cases..."
                        value={caseSearch}
                        onChange={(e) => { setCaseSearch(e.target.value); setCasePage(1); }}
                        className="pl-8 h-9"
                      />
                    </div>
                    <Select value={caseFilter} onValueChange={(v: "all" | "muted" | "unmuted") => { setCaseFilter(v); setCasePage(1); }}>
                      <SelectTrigger className="w-full sm:w-32 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="unmuted">On</SelectItem>
                        <SelectItem value="muted">Muted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Case List */}
                  {(() => {
                    const filteredCases = userCases.filter((c: any) => {
                      const isMuted = mutedCasesData?.mutedCaseIds?.includes(c.id);
                      const matchesSearch = caseSearch === "" || 
                        c.caseName?.toLowerCase().includes(caseSearch.toLowerCase()) ||
                        c.accountNumber?.toLowerCase().includes(caseSearch.toLowerCase());
                      const matchesFilter = caseFilter === "all" || 
                        (caseFilter === "muted" && isMuted) ||
                        (caseFilter === "unmuted" && !isMuted);
                      return matchesSearch && matchesFilter;
                    });
                    const totalPages = Math.ceil(filteredCases.length / CASES_PER_PAGE);
                    const paginatedCases = filteredCases.slice((casePage - 1) * CASES_PER_PAGE, casePage * CASES_PER_PAGE);

                    return (
                      <>
                        <div className="text-xs text-gray-500 mb-1">
                          Showing {paginatedCases.length} of {filteredCases.length} cases
                        </div>
                        <div className="space-y-1">
                          {paginatedCases.map((caseItem: any) => {
                            const isMuted = mutedCasesData?.mutedCaseIds?.includes(caseItem.id);
                            return (
                              <div 
                                key={caseItem.id} 
                                className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded border border-gray-100"
                              >
                                <div className="flex-1 min-w-0 mr-3">
                                  <span className="text-sm font-medium truncate block">{caseItem.caseName}</span>
                                  <span className="text-xs text-gray-400">{caseItem.accountNumber}</span>
                                </div>
                                <Switch
                                  checked={!isMuted}
                                  onCheckedChange={(checked) => 
                                    toggleCaseMuteMutation.mutate({ caseId: caseItem.id, mute: !checked })
                                  }
                                  disabled={toggleCaseMuteMutation.isPending}
                                />
                              </div>
                            );
                          })}
                        </div>
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between pt-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setCasePage(p => Math.max(1, p - 1))}
                              disabled={casePage === 1}
                            >
                              Previous
                            </Button>
                            <span className="text-xs text-gray-500">Page {casePage} of {totalPages}</span>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setCasePage(p => Math.min(totalPages, p + 1))}
                              disabled={casePage === totalPages}
                            >
                              Next
                            </Button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
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
                  <CardDescription>View your organisation details and manage settings.</CardDescription>
                </CardHeader>
                <CardContent>
                  {userOrganisations && userOrganisations.length > 0 ? (
                    <div className="space-y-4">
                      {userOrganisations.map((org: any) => {
                        const isOwner = orgOwnerships?.includes(org.id);
                        const isExpanded = expandedOrgSettings === org.id;
                        return (
                          <div key={org.id} className="border rounded-lg overflow-hidden">
                            {/* Organisation Header */}
                            <div className="p-4 bg-gray-50 dark:bg-gray-800">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <Building2 className="h-5 w-5 text-acclaim-teal" />
                                  <div>
                                    <p className="font-medium text-lg">{org.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {isOwner 
                                        ? "You are an Owner of this organisation" 
                                        : "You are a member of this organisation"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isOwner && (
                                    <>
                                      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-full text-sm font-medium">
                                        <Crown className="h-4 w-4" />
                                        <span>Owner</span>
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          if (isExpanded) {
                                            setExpandedOrgSettings(null);
                                          } else {
                                            setExpandedOrgSettings(org.id);
                                            setSelectedOrgForSettings(String(org.id));
                                            setOrgCaseSearch("");
                                            setOrgCasePage(1);
                                          }
                                        }}
                                        className="ml-2"
                                      >
                                        <Settings className="h-4 w-4 mr-1" />
                                        Settings
                                        {isExpanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            {/* Expanded Settings Panel (for owners only) */}
                            {isOwner && isExpanded && (
                              <div className="p-4 border-t bg-white dark:bg-gray-900 space-y-4">
                                {/* Request To Add New Member Button */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                  <div>
                                    <h4 className="font-medium text-sm">Organisation Settings</h4>
                                    <p className="text-xs text-gray-500">Manage team members and case access</p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setMemberRequestOrgId(org.id);
                                      setMemberRequestOpen(true);
                                    }}
                                    className="text-teal-600 border-teal-300 hover:bg-teal-50 w-full sm:w-auto"
                                  >
                                    <UserPlus className="h-4 w-4 mr-1" />
                                    Request New Member
                                  </Button>
                                </div>

                                <Separator />

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Users className="h-4 w-4" />
                                    <span>{nonAdminOrgUsers.length} member{nonAdminOrgUsers.length !== 1 ? 's' : ''}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Briefcase className="h-4 w-4" />
                                    <span>{orgSettingsCases?.length || 0} case{(orgSettingsCases?.length || 0) !== 1 ? 's' : ''}</span>
                                  </div>
                                </div>

                                {/* Case Access Management */}
                                <div>
                                  <h5 className="font-medium text-sm mb-2">Case Access Management</h5>
                                  <p className="text-xs text-gray-500 mb-3">
                                    Click on a cell to toggle access. <span className="text-green-600">Green</span> = access allowed, <span className="text-red-600">Red</span> = blocked.
                                  </p>

                                  {/* Case Search */}
                                  {(orgSettingsCases?.length || 0) > 0 && (
                                    <div className="mb-3">
                                      <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                          placeholder="Search cases by name or reference..."
                                          value={orgCaseSearch}
                                          onChange={(e) => handleOrgCaseSearch(e.target.value)}
                                          className="pl-9 h-9 text-sm"
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {(orgUsersLoading || orgCasesLoading || orgRestrictionsLoading) ? (
                                    <div className="flex items-center justify-center h-24">
                                      <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                                    </div>
                                  ) : nonAdminOrgUsers.length === 0 ? (
                                    <div className="text-center py-4 text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                                      No team members to manage.
                                    </div>
                                  ) : (orgSettingsCases?.length || 0) === 0 ? (
                                    <div className="text-center py-4 text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                                      No cases in this organisation yet.
                                    </div>
                                  ) : filteredOrgCases.length === 0 ? (
                                    <div className="text-center py-4 text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                                      No cases match your search.
                                    </div>
                                  ) : (
                                    <>
                                      {/* Redesigned table: Cases as rows, Members as columns */}
                                      <div className="overflow-x-auto border rounded-lg">
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="bg-gray-50 dark:bg-gray-800">
                                              <TableHead className="min-w-[300px] text-xs py-2 font-semibold">Case</TableHead>
                                              {nonAdminOrgUsers.map((u: any) => (
                                                <TableHead key={u.id} className="text-center min-w-[140px] py-2">
                                                  <div className="font-medium text-xs text-[#0079f2]">{u.firstName} {u.lastName}</div>
                                                  <div className="text-[10px] text-gray-500 font-normal truncate max-w-[130px]" title={u.email}>{u.email}</div>
                                                  <div className="flex gap-1 mt-1 justify-center">
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-5 px-1 text-[10px] text-red-600 hover:bg-red-50"
                                                      onClick={() => bulkMemberRestrictionMutation.mutate({ orgId: org.id, userId: u.id, action: 'restrict-all' })}
                                                      disabled={bulkMemberRestrictionMutation.isPending}
                                                      title="Block from all cases"
                                                    >
                                                      Block All
                                                    </Button>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-5 px-1 text-[10px] text-green-600 hover:bg-green-50"
                                                      onClick={() => bulkMemberRestrictionMutation.mutate({ orgId: org.id, userId: u.id, action: 'allow-all' })}
                                                      disabled={bulkMemberRestrictionMutation.isPending}
                                                      title="Allow access to all cases"
                                                    >
                                                      Allow All
                                                    </Button>
                                                  </div>
                                                </TableHead>
                                              ))}
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {paginatedOrgCases.map((c: any) => (
                                              <TableRow key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <TableCell className="py-2">
                                                  <div className="flex items-start justify-between gap-2">
                                                    <div className="flex flex-col">
                                                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{c.caseName}</span>
                                                      {c.accountNumber && (
                                                        <span className="text-xs text-teal-600 dark:text-teal-400 font-mono">{c.accountNumber}</span>
                                                      )}
                                                    </div>
                                                    <div className="flex gap-1 flex-shrink-0">
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 px-1 text-[10px] text-red-600 hover:bg-red-50"
                                                        onClick={() => bulkCaseRestrictionMutation.mutate({ orgId: org.id, caseId: c.id, action: 'restrict-all' })}
                                                        disabled={bulkCaseRestrictionMutation.isPending}
                                                        title="Block all members from this case"
                                                      >
                                                        Block All
                                                      </Button>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 px-1 text-[10px] text-green-600 hover:bg-green-50"
                                                        onClick={() => bulkCaseRestrictionMutation.mutate({ orgId: org.id, caseId: c.id, action: 'allow-all' })}
                                                        disabled={bulkCaseRestrictionMutation.isPending}
                                                        title="Allow all members access to this case"
                                                      >
                                                        Allow All
                                                      </Button>
                                                    </div>
                                                  </div>
                                                </TableCell>
                                                {nonAdminOrgUsers.map((u: any) => {
                                                  const restricted = isRestricted(u.id, c.id);
                                                  return (
                                                    <TableCell key={u.id} className="text-center p-2">
                                                      <Button
                                                        variant={restricted ? "destructive" : "outline"}
                                                        size="sm"
                                                        className={`w-20 h-7 text-xs ${!restricted ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400' : ''}`}
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

                                      {/* Pagination */}
                                      {totalOrgCasePages > 1 && (
                                        <div className="flex flex-col sm:flex-row items-center justify-between pt-3 gap-2">
                                          <span className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1">
                                            Page {orgCasePage} of {totalOrgCasePages}
                                          </span>
                                          <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
                                            <Button 
                                              variant="outline" 
                                              size="sm"
                                              className="h-8 flex-1 sm:flex-initial"
                                              onClick={() => setOrgCasePage(p => Math.max(1, p - 1))}
                                              disabled={orgCasePage === 1}
                                            >
                                              Previous
                                            </Button>
                                            <Button 
                                              variant="outline" 
                                              size="sm"
                                              className="h-8 flex-1 sm:flex-initial"
                                              onClick={() => setOrgCasePage(p => Math.min(totalOrgCasePages, p + 1))}
                                              disabled={orgCasePage === totalOrgCasePages}
                                            >
                                              Next
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>

                                {/* Member Management Section */}
                                {nonAdminOrgUsers.filter((u: any) => u.id !== user?.id).length > 0 && (
                                  <div className="mt-4 pt-4 border-t">
                                    <h5 className="font-medium text-sm mb-2">Team Member Management</h5>
                                    <p className="text-xs text-gray-500 mb-3">Request to remove members from your organisation or delegate owner privileges to manage the organisation and it's members.</p>
                                    <div className="space-y-2">
                                      {nonAdminOrgUsers.filter((u: any) => u.id !== user?.id).map((u: any) => (
                                        <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg gap-2">
                                          <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-teal-700 dark:text-teal-300 text-sm font-medium flex-shrink-0">
                                              {u.firstName?.[0]}{u.lastName?.[0]}
                                            </div>
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-medium">{u.firstName} {u.lastName}</span>
                                                {u.isOrgOwner && (
                                                  <Badge variant="outline" className="h-5 text-[10px] bg-amber-50 text-amber-700 border-amber-300">
                                                    <Crown className="h-2.5 w-2.5 mr-0.5" />
                                                    Owner
                                                  </Badge>
                                                )}
                                              </div>
                                              <span className="text-xs text-gray-500 block truncate">{u.email}</span>
                                            </div>
                                          </div>
                                          <div className="flex gap-2 sm:flex-shrink-0 flex-wrap">
                                            {!u.isOrgOwner && (
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs text-amber-600 border-amber-300 hover:bg-amber-50 flex-1 sm:flex-initial"
                                                onClick={() => {
                                                  setDelegationTarget({ userId: u.id, userName: `${u.firstName} ${u.lastName}`, orgId: org.id });
                                                  setDelegationDialogOpen(true);
                                                }}
                                              >
                                                <Crown className="h-3 w-3 mr-1" />
                                                Make Owner
                                              </Button>
                                            )}
                                            {u.isOrgOwner && (
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs text-orange-600 border-orange-300 hover:bg-orange-50 flex-1 sm:flex-initial"
                                                onClick={() => {
                                                  setRemoveOwnershipTarget({ userId: u.id, userName: `${u.firstName} ${u.lastName}`, orgId: org.id });
                                                  setRemoveOwnershipDialogOpen(true);
                                                }}
                                              >
                                                <Crown className="h-3 w-3 mr-1" />
                                                Remove Ownership
                                              </Button>
                                            )}
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50 flex-1 sm:flex-initial"
                                              onClick={() => {
                                                setRemovalTarget({ userId: u.id, userName: `${u.firstName} ${u.lastName}`, orgId: org.id });
                                                setRemovalDialogOpen(true);
                                              }}
                                            >
                                              <UserMinus className="h-3 w-3 mr-1" />
                                              Remove from Org
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500">You are not currently assigned to any organisation.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Member Request Dialog */}
            <Dialog open={memberRequestOpen} onOpenChange={setMemberRequestOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-teal-600" />
                    Request New Team Member
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Complete this form to request Acclaim add a new member to your organisation. We'll review and process your request.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="req-firstName" className="text-sm">First Name *</Label>
                      <Input
                        id="req-firstName"
                        value={memberRequestData.firstName}
                        onChange={(e) => setMemberRequestData(d => ({ ...d, firstName: e.target.value }))}
                        placeholder="First name"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="req-lastName" className="text-sm">Surname *</Label>
                      <Input
                        id="req-lastName"
                        value={memberRequestData.lastName}
                        onChange={(e) => setMemberRequestData(d => ({ ...d, lastName: e.target.value }))}
                        placeholder="Surname"
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="req-email" className="text-sm">Email Address *</Label>
                    <Input
                      id="req-email"
                      type="email"
                      value={memberRequestData.email}
                      onChange={(e) => setMemberRequestData(d => ({ ...d, email: e.target.value }))}
                      placeholder="email@example.com"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="req-phone" className="text-sm">Phone Number (optional)</Label>
                    <Input
                      id="req-phone"
                      type="tel"
                      value={memberRequestData.phone}
                      onChange={(e) => setMemberRequestData(d => ({ ...d, phone: e.target.value }))}
                      placeholder="+44 7xxx xxx xxx"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm">Member Type *</Label>
                    <Select 
                      value={memberRequestData.memberType} 
                      onValueChange={(v: "member" | "owner") => setMemberRequestData(d => ({ ...d, memberType: v }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs mt-1 text-[#0d9488]">
                      {memberRequestData.memberType === "owner" 
                        ? "Owners can manage case access for other team members in your organisation."
                        : "Members can view cases and documents assigned to them."}
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setMemberRequestOpen(false)}
                      disabled={memberRequestSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleMemberRequestSubmit}
                      disabled={memberRequestSubmitting}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {memberRequestSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-1" />
                          Send Request
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Member Removal Request Dialog */}
            <Dialog open={removalDialogOpen} onOpenChange={setRemovalDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-600">
                    <UserMinus className="h-5 w-5" />
                    Request Member Removal
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    You are requesting to remove <strong>{removalTarget?.userName}</strong> from your organisation. 
                    They will no longer have access to any cases or documents in this organisation.
                    This request will be sent to Acclaim for processing.
                  </p>
                  
                  <div className="space-y-1">
                    <Label htmlFor="removal-reason" className="text-sm">Reason (optional)</Label>
                    <Input
                      id="removal-reason"
                      value={removalReason}
                      onChange={(e) => setRemovalReason(e.target.value)}
                      placeholder="Why should this member be removed?"
                      className="h-9"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRemovalDialogOpen(false);
                        setRemovalTarget(null);
                        setRemovalReason("");
                      }}
                      disabled={removalSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleRemovalSubmit}
                      disabled={removalSubmitting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {removalSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-1" />
                          Send Request
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Owner Delegation Request Dialog */}
            <Dialog open={delegationDialogOpen} onOpenChange={setDelegationDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-amber-600">
                    <Crown className="h-5 w-5" />
                    Request Owner Delegation
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    You are requesting that <strong>{delegationTarget?.userName}</strong> be granted Owner status for your organisation. 
                    Owners can manage case access for other team members.
                  </p>
                  
                  <div className="space-y-1">
                    <Label htmlFor="delegation-reason" className="text-sm">Reason (optional)</Label>
                    <Input
                      id="delegation-reason"
                      value={delegationReason}
                      onChange={(e) => setDelegationReason(e.target.value)}
                      placeholder="Why should this member become an owner?"
                      className="h-9"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDelegationDialogOpen(false);
                        setDelegationTarget(null);
                        setDelegationReason("");
                      }}
                      disabled={delegationSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDelegationSubmit}
                      disabled={delegationSubmitting}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {delegationSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-1" />
                          Send Request
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Remove Ownership Request Dialog */}
            <Dialog open={removeOwnershipDialogOpen} onOpenChange={setRemoveOwnershipDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-orange-600">
                    <Crown className="h-5 w-5" />
                    Request Ownership Removal
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    You are requesting that <strong>{removeOwnershipTarget?.userName}</strong>'s Owner status be removed. 
                    They will remain a member of the organisation but will no longer be able to manage case access for other team members.
                  </p>
                  
                  <div className="space-y-1">
                    <Label htmlFor="remove-ownership-reason" className="text-sm">Reason (optional)</Label>
                    <Input
                      id="remove-ownership-reason"
                      value={removeOwnershipReason}
                      onChange={(e) => setRemoveOwnershipReason(e.target.value)}
                      placeholder="Why should this member's ownership be removed?"
                      className="h-9"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRemoveOwnershipDialogOpen(false);
                        setRemoveOwnershipTarget(null);
                        setRemoveOwnershipReason("");
                      }}
                      disabled={removeOwnershipSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleRemoveOwnershipSubmit}
                      disabled={removeOwnershipSubmitting}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {removeOwnershipSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-1" />
                          Send Request
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

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
                  {availableOrgsForUpload && availableOrgsForUpload.length > 1 && (
                    <div>
                      <Label htmlFor="uploadOrg">Upload to Organisation</Label>
                      <Select value={selectedOrgForUpload} onValueChange={setSelectedOrgForUpload}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select organisation..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableOrgsForUpload.map((org: any) => (
                            <SelectItem key={org.id} value={org.id.toString()}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mb-2">
                    Max {MAX_FILE_SIZE_MB}MB. Formats: {ACCEPTED_FILE_TYPES_DISPLAY}
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <Input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file) {
                          const validation = validateFile(file);
                          if (!validation.isValid) {
                            setFileValidationError(validation.error);
                            setSelectedFile(null);
                            setCustomFileName("");
                            e.target.value = '';
                            return;
                          }
                        }
                        setFileValidationError(null);
                        setSelectedFile(file);
                        setCustomFileName("");
                      }}
                      accept={ACCEPTED_FILE_TYPES_STRING}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleDocumentUpload}
                      disabled={!selectedFile || isUploading || (availableOrgsForUpload && availableOrgsForUpload.length > 1 && !selectedOrgForUpload)}
                      className="bg-acclaim-teal hover:bg-acclaim-teal/90 w-full sm:w-auto"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploading ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                  {fileValidationError && (
                    <p className="text-sm text-red-600 mt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      {fileValidationError}
                    </p>
                  )}
                  {selectedFile && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </p>
                      <div>
                        <Label htmlFor="org-custom-filename" className="text-sm text-acclaim-teal font-medium">Rename file (optional)</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            id="org-custom-filename"
                            type="text"
                            value={customFileName}
                            onChange={(e) => setCustomFileName(e.target.value)}
                            placeholder="Enter new filename"
                            className="flex-1"
                          />
                          <span className="text-sm text-gray-500">.{selectedFile.name.split('.').pop()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Search Section */}
                {orgDocuments && orgDocuments.length > 0 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search documents by name, organisation, or uploader..."
                      value={documentSearch}
                      onChange={(e) => handleDocumentSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                )}

                {/* Document count and pagination info */}
                {filteredDocuments && filteredDocuments.length > 0 && (
                  <div className="text-sm text-gray-500">
                    Showing {Math.min((documentPage - 1) * DOCS_PER_PAGE + 1, filteredDocuments.length)}-{Math.min(documentPage * DOCS_PER_PAGE, filteredDocuments.length)} of {filteredDocuments.length} documents
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
                                  {userProfile?.isAdmin && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setAuditDocumentId(doc.id);
                                        setAuditDialogOpen(true);
                                      }}
                                      className="text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                                      title="View Audit Log"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  )}
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

                {/* Document Pagination */}
                {totalDocPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setDocumentPage(p => Math.max(1, p - 1))}
                      disabled={documentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-500">
                      Page {documentPage} of {totalDocPages}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setDocumentPage(p => Math.min(totalDocPages, p + 1))}
                      disabled={documentPage === totalDocPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Document Audit Dialog (Admin Only) */}
      <Dialog open={auditDialogOpen} onOpenChange={setAuditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-700">
              <Eye className="h-5 w-5" />
              Document Views
            </DialogTitle>
            <DialogDescription>
              View history for this document
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto">
            {auditLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              </div>
            ) : documentAuditLogs && documentAuditLogs.length > 0 ? (
              <div className="space-y-2">
                {documentAuditLogs.map((log: any) => (
                  <div key={log.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-sm gap-1">
                    <span className="font-medium text-purple-900 dark:text-purple-100">{log.userEmail || 'Unknown'}</span>
                    <span className="text-purple-600 dark:text-purple-300 text-xs">{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Unknown'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No views recorded yet.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}