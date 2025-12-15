import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Loader2, FileText, MessageSquare, TrendingUp, Shield, UserPlus, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import acclaimLogo from "@assets/Acclaim rose.Cur_1752271300769.png";

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
}

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, loginMutation } = useAuth();
  const { toast } = useToast();
  
  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  
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

  // Fetch organisations for registration
  const { data: organisations } = useQuery<Organisation[]>({
    queryKey: ["/api/public/organisations"],
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserForm) => {
      const response = await apiRequest("POST", `/api/register`, userData);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Account created successfully",
      });
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
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const copyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Redirect if already logged in - check after all hooks to avoid rule violations
  if (user) {
    // Use setTimeout to avoid setting state during render
    setTimeout(() => navigate("/"), 0);
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      const userData = await loginMutation.mutateAsync({
        email: email,
        password: password,
      });
      
      // Check if user needs to change password
      if (userData.mustChangePassword) {
        navigate("/change-password");
      } else {
        navigate("/");
      }
    } catch (error: any) {
      setError(error.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <img 
                src={acclaimLogo} 
                alt="Acclaim Credit Management" 
                className="h-16 w-16 mr-3"
              />
              <div className="text-left">
                <h1 className="text-2xl font-bold text-slate-800">Acclaim</h1>
                <p className="text-sm text-muted-foreground">Credit Management & Recovery</p>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to your Portal</h2>
            <p className="text-muted-foreground text-sm">Access your cases</p>
          </div>

          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Sign In</CardTitle>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@company.com"
                    className="h-11"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-11 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-acclaim-teal hover:bg-acclaim-teal/90 font-medium"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In to Portal"
                  )}
                </Button>
              </form>
              
              <div className="mt-6 text-center text-xs text-muted-foreground">Need assistance? Please contact us at email@acclaim.law | 0113 225 8811</div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-center text-sm text-muted-foreground mb-4">Don't have an account?</p>
                <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline"
                      className="w-full h-11"
                      data-testid="button-create-account"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Create New Account</DialogTitle>
                      <DialogDescription>
                        Fill in your details to create an account
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="reg-firstName">First Name</Label>
                          <Input
                            id="reg-firstName"
                            data-testid="input-reg-first-name"
                            value={userFormData.firstName}
                            onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                            placeholder="John"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reg-lastName">Last Name</Label>
                          <Input
                            id="reg-lastName"
                            data-testid="input-reg-last-name"
                            value={userFormData.lastName}
                            onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                            placeholder="Doe"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-email">Email</Label>
                        <Input
                          id="reg-email"
                          type="email"
                          data-testid="input-reg-email"
                          value={userFormData.email}
                          onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                          placeholder="john.doe@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-phone">Phone (Optional)</Label>
                        <Input
                          id="reg-phone"
                          data-testid="input-reg-phone"
                          value={userFormData.phone}
                          onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                          placeholder="+44 20 7123 4567"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-organisation">Organisation (Optional)</Label>
                        <Select 
                          value={userFormData.organisationId?.toString() || "none"}
                          onValueChange={(value) => setUserFormData({ 
                            ...userFormData, 
                            organisationId: value === "none" ? undefined : parseInt(value) 
                          })}
                        >
                          <SelectTrigger data-testid="select-reg-organisation">
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
                    </div>
                    <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2">
                      <Button variant="outline" onClick={() => setShowCreateUser(false)} className="order-2 sm:order-1">
                        Cancel
                      </Button>
                      <Button
                        onClick={() => createUserMutation.mutate(userFormData)}
                        disabled={createUserMutation.isPending || !userFormData.firstName || !userFormData.lastName || !userFormData.email}
                        className="bg-acclaim-teal hover:bg-acclaim-teal/90 order-1 sm:order-2"
                        data-testid="button-submit-create-account"
                      >
                        {createUserMutation.isPending ? "Creating..." : "Create Account"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
          
          {/* Temporary Password Dialog */}
          <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Account Created Successfully</DialogTitle>
                <DialogDescription>
                  Your temporary password is shown below. You will be required to change it on first login.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="bg-gray-100 rounded-lg p-4">
                  <Label className="text-sm text-gray-600 mb-2 block">Temporary Password</Label>
                  <div className="flex items-center justify-between">
                    <code className="text-lg font-mono font-bold" data-testid="text-reg-temp-password">{tempPassword}</code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyPassword}
                      data-testid="button-copy-reg-password"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Make sure to copy this password now. It will not be shown again. Use it to log in below.
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setShowPasswordDialog(false)} data-testid="button-close-reg-password-dialog">
                  Done
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {/* Right side - Feature showcase */}
      <div className="hidden md:flex md:flex-1 bg-gradient-to-br from-teal-700 via-teal-600 to-slate-800 items-center justify-center p-8">
        <div className="max-w-lg text-white">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-center">Acclaim Credit Management & Recovery</h2>
            <p className="text-lg opacity-90 leading-relaxed text-center">Streamline your debt recovery cases with our comprehensive case management portal.</p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Case Management</h3>
                <p className="text-sm opacity-90">Track cases from initial contact through to resolution with detailed stage progression and activity logs.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Secure Communications</h3>
                <p className="text-sm opacity-90">Integrated messaging system and document management.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Analytics & Reporting</h3>
                <p className="text-sm opacity-90">Comprehensive reporting tools for recovery analysis, payment tracking, and performance metrics.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Enterprise Security</h3>
                <p className="text-sm opacity-90">High-level security with role-based access control and complete data protection.</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/20">
            <p className="text-sm opacity-75 text-center">Part of Chadwick Lawrence LLP</p>
          </div>
        </div>
      </div>
    </div>
  );
}