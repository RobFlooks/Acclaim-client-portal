import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, EyeOff, Loader2, FileText, MessageSquare, TrendingUp, Shield, UserPlus } from "lucide-react";
import acclaimLogo from "@assets/Acclaim rose.Cur_1752271300769.png";

const MicrosoftIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 11H0V0H11V11Z" fill="#F25022"/>
    <path d="M23 11H12V0H23V11Z" fill="#7FBA00"/>
    <path d="M11 23H0V12H11V23Z" fill="#00A4EF"/>
    <path d="M23 23H12V12H23V23Z" fill="#FFB900"/>
  </svg>
);

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, loginMutation } = useAuth();
  
  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // Setup dialog state
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [setupFirstName, setSetupFirstName] = useState("");
  const [setupLastName, setSetupLastName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirmPassword, setSetupConfirmPassword] = useState("");
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [setupSuccess, setSetupSuccess] = useState(false);

  // Check if Azure auth is enabled
  const { data: azureStatus } = useQuery<{ enabled: boolean; configured: boolean }>({
    queryKey: ['/api/auth/azure/status'],
  });

  // Check if initial setup is required
  const { data: setupStatus } = useQuery<{ setupRequired: boolean; message: string }>({
    queryKey: ['/api/setup/status'],
  });

  // Mutation for creating initial admin
  const createAdminMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; email: string; password: string }) => {
      const response = await apiRequest('POST', '/api/setup/admin', data);
      return response.json();
    },
    onSuccess: () => {
      setSetupSuccess(true);
      setSetupError("");
      queryClient.invalidateQueries({ queryKey: ['/api/setup/status'] });
    },
    onError: (error: any) => {
      setSetupError(error.message || "Failed to create admin account");
    }
  });

  // Handle URL error parameters from Azure auth
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        'azure_login_failed': 'Microsoft sign-in failed. Please try again.',
        'no_code': 'Authentication was cancelled or failed.',
        'no_account': 'Could not retrieve account information from Microsoft.',
        'no_email': 'No email address found in your Microsoft account.',
        'user_not_found': 'Your Microsoft account is not registered with Acclaim. Please contact your administrator.',
        'session_error': 'Failed to create session. Please try again.',
        'callback_failed': 'Authentication callback failed. Please try again.',
      };
      setError(errorMessages[errorParam] || `Authentication error: ${errorParam}`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Redirect if already logged in - check after all hooks to avoid rule violations
  if (user) {
    // Use setTimeout to avoid setting state during render
    setTimeout(() => navigate("/"), 0);
    return null;
  }

  const handleAzureLogin = () => {
    window.location.href = '/auth/azure/login';
  };

  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError("");

    if (!setupFirstName || !setupLastName || !setupEmail || !setupPassword) {
      setSetupError("Please fill in all fields");
      return;
    }

    if (setupPassword !== setupConfirmPassword) {
      setSetupError("Passwords do not match");
      return;
    }

    if (setupPassword.length < 8) {
      setSetupError("Password must be at least 8 characters long");
      return;
    }

    // Check for password complexity
    const hasUppercase = /[A-Z]/.test(setupPassword);
    const hasLowercase = /[a-z]/.test(setupPassword);
    const hasNumber = /[0-9]/.test(setupPassword);
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      setSetupError("Password must contain at least one uppercase letter, one lowercase letter, and one number");
      return;
    }

    createAdminMutation.mutate({
      firstName: setupFirstName,
      lastName: setupLastName,
      email: setupEmail,
      password: setupPassword
    });
  };

  const resetSetupForm = () => {
    setSetupFirstName("");
    setSetupLastName("");
    setSetupEmail("");
    setSetupPassword("");
    setSetupConfirmPassword("");
    setSetupError("");
    setSetupSuccess(false);
  };

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
                  data-testid="button-login"
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

              {azureStatus?.enabled && (
                <>
                  <div className="relative my-6">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-muted-foreground">
                      or
                    </span>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 font-medium"
                    onClick={handleAzureLogin}
                    data-testid="button-azure-login"
                  >
                    <MicrosoftIcon />
                    <span className="ml-2">Sign in with Microsoft</span>
                  </Button>
                </>
              )}
              
              <div className="mt-6 text-center text-xs text-muted-foreground">Need assistance? Please contact us at email@acclaim.law | 0113 225 8811</div>

              {setupStatus?.setupRequired && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-10 text-sm"
                    onClick={() => {
                      resetSetupForm();
                      setShowSetupDialog(true);
                    }}
                    data-testid="button-initial-setup"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Initial Admin Account
                  </Button>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    No admin accounts exist. Create one to get started.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
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

      {/* Initial Admin Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={(open) => {
        setShowSetupDialog(open);
        if (!open) {
          // Reset success state when dialog closes
          setSetupSuccess(false);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create Initial Admin Account
            </DialogTitle>
            <DialogDescription>
              Set up your first administrator account to access the system.
            </DialogDescription>
          </DialogHeader>

          {setupSuccess ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  Admin account created successfully! You can now sign in with your new credentials.
                </AlertDescription>
              </Alert>
              <Button 
                className="w-full bg-acclaim-teal hover:bg-acclaim-teal/90"
                onClick={() => {
                  setShowSetupDialog(false);
                  setEmail(setupEmail);
                }}
              >
                Continue to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSetupSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="setup-firstName">First Name</Label>
                  <Input
                    id="setup-firstName"
                    value={setupFirstName}
                    onChange={(e) => setSetupFirstName(e.target.value)}
                    placeholder="First name"
                    required
                    data-testid="input-setup-firstname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setup-lastName">Last Name</Label>
                  <Input
                    id="setup-lastName"
                    value={setupLastName}
                    onChange={(e) => setSetupLastName(e.target.value)}
                    placeholder="Last name"
                    required
                    data-testid="input-setup-lastname"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-email">Email Address</Label>
                <Input
                  id="setup-email"
                  type="email"
                  value={setupEmail}
                  onChange={(e) => setSetupEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  data-testid="input-setup-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-password">Password</Label>
                <div className="relative">
                  <Input
                    id="setup-password"
                    type={showSetupPassword ? "text" : "password"}
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    data-testid="input-setup-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowSetupPassword(!showSetupPassword)}
                  >
                    {showSetupPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-confirmPassword">Confirm Password</Label>
                <Input
                  id="setup-confirmPassword"
                  type={showSetupPassword ? "text" : "password"}
                  value={setupConfirmPassword}
                  onChange={(e) => setSetupConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  data-testid="input-setup-confirm-password"
                />
              </div>

              {setupError && (
                <Alert variant="destructive">
                  <AlertDescription>{setupError}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowSetupDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-acclaim-teal hover:bg-acclaim-teal/90"
                  disabled={createAdminMutation.isPending}
                  data-testid="button-create-admin"
                >
                  {createAdminMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Admin Account"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}