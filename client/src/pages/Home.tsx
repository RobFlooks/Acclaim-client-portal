import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import Cases from "@/components/Cases";
import Messages from "@/components/Messages";
import Reports from "@/components/Reports";
import Documents from "@/components/Documents";

import { Bell, Menu, X, UserPlus, AlertTriangle, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CreateUserForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organisationId?: number;
  isAdmin: boolean;
}

interface Organisation {
  id: number;
  name: string;
  externalRef?: string;
}
import { useIsMobile } from "@/hooks/use-mobile";

export default function Home() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const { user } = useAuth();
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Create User state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [userFormData, setUserFormData] = useState<CreateUserForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    organisationId: undefined,
    isAdmin: false,
  });

  // Fetch organisations for admin users
  const { data: organisations } = useQuery<Organisation[]>({
    queryKey: ["/api/admin/organisations"],
    enabled: !!user?.isAdmin,
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserForm) => {
      const response = await apiRequest("POST", `/api/admin/users`, userData);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "User created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-orgs"] });
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
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const copyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };



  // Handle URL parameters for navigation
  useEffect(() => {
    console.log('Home useEffect - location changed:', location);
    console.log('Window location search:', window.location.search);
    
    // Try both the wouter location and window.location for query parameters
    const queryString = window.location.search || (location.includes('?') ? location.split('?')[1] : '');
    const urlParams = new URLSearchParams(queryString);
    const section = urlParams.get('section');
    
    console.log('Query string:', queryString);
    console.log('Parsed section from URL:', section);
    
    if (section && ['dashboard', 'cases', 'messages', 'reports', 'documents'].includes(section)) {
      console.log('Setting activeSection to:', section);
      setActiveSection(section);
    }
  }, [location]);

  // Handle notification bell click
  const handleNotificationClick = () => {
    setActiveSection("messages");
  };

  // Handle mobile menu toggle
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Handle section change and close mobile menu
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <Dashboard setActiveSection={setActiveSection} />;
      case "cases":
        return <Cases />;
      case "messages":
        return <Messages />;
      case "reports":
        return <Reports />;
      case "documents":
        return <Documents />;
      default:
        return <Dashboard setActiveSection={setActiveSection} />;
    }
  };

  const getSectionTitle = () => {
    switch (activeSection) {
      case "dashboard":
        return "Dashboard";
      case "cases":
        return "Cases";
      case "messages":
        return "Messages";
      case "reports":
        return "Reports";
      case "documents":
        return "Documents";
      default:
        return "Dashboard";
    }
  };

  const getSectionDescription = () => {
    switch (activeSection) {
      case "dashboard":
        return `Welcome, ${user?.firstName ? `${user.firstName}` : 'User'}`;
      case "cases":
        return "View and manage all your cases";
      case "messages":
        return "Secure communication with our team";
      case "reports":
        return "Download and view detailed reports";
      case "documents":
        return "Manage case documents and files";
      default:
        return `Welcome, ${user?.firstName ? `${user.firstName}` : 'User'}`;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className={`${isMobile ? 'hidden' : 'block'}`}>
        <Sidebar activeSection={activeSection} setActiveSection={handleSectionChange} />
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {isMobile && mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={toggleMobileMenu} />
          <div className="fixed inset-y-0 left-0 z-50 w-64">
            <Sidebar activeSection={activeSection} setActiveSection={handleSectionChange} />
          </div>
        </>
      )}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Mobile Menu Button */}
              {isMobile && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="mr-3"
                  onClick={toggleMobileMenu}
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{getSectionTitle()}</h1>
                <p className="text-sm sm:text-base text-gray-600 hidden sm:block">{getSectionDescription()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Create User Button - Admin Only */}
              {user?.isAdmin && (
                <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-acclaim-teal hover:bg-acclaim-teal/90"
                      size={isMobile ? "sm" : "default"}
                      data-testid="button-create-user"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Create User</span>
                      <span className="sm:hidden">Add</span>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            data-testid="input-first-name"
                            value={userFormData.firstName}
                            onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                            placeholder="John"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            data-testid="input-last-name"
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
                          data-testid="input-email"
                          value={userFormData.email}
                          onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                          placeholder="john.doe@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone (Optional)</Label>
                        <Input
                          id="phone"
                          data-testid="input-phone"
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
                          <SelectTrigger data-testid="select-organisation">
                            <SelectValue placeholder="Select organisation (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No organisation</SelectItem>
                            {organisations?.map((org: Organisation) => (
                              <SelectItem key={org.id} value={org.id.toString()}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{org.name}</span>
                                  {org.externalRef && (
                                    <span className="text-xs text-gray-500">Ref: {org.externalRef}</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isAdmin"
                          data-testid="checkbox-is-admin"
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
                              This user will have full admin access to manage users, cases, and system settings
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2">
                      <Button variant="outline" onClick={() => setShowCreateUser(false)} className="order-2 sm:order-1">
                        Cancel
                      </Button>
                      <Button
                        onClick={() => createUserMutation.mutate(userFormData)}
                        disabled={createUserMutation.isPending || !userFormData.firstName || !userFormData.lastName || !userFormData.email}
                        className="bg-acclaim-teal hover:bg-acclaim-teal/90 order-1 sm:order-2"
                        data-testid="button-submit-create-user"
                      >
                        {createUserMutation.isPending ? "Creating..." : "Create User"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              
              <Button variant="ghost" size="icon" className="relative" onClick={handleNotificationClick}>
                <Bell className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Temporary Password Dialog */}
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>User Created Successfully</DialogTitle>
                  <DialogDescription>
                    Share this temporary password with the new user. They will be required to change it on first login.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <div className="bg-gray-100 rounded-lg p-4">
                    <Label className="text-sm text-gray-600 mb-2 block">Temporary Password</Label>
                    <div className="flex items-center justify-between">
                      <code className="text-lg font-mono font-bold" data-testid="text-temp-password">{tempPassword}</code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyPassword}
                        data-testid="button-copy-password"
                      >
                        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    Make sure to copy this password now. It will not be shown again.
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setShowPasswordDialog(false)} data-testid="button-close-password-dialog">
                    Done
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {/* Mobile description */}
          {isMobile && (
            <p className="text-sm text-gray-600 mt-2">{getSectionDescription()}</p>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
